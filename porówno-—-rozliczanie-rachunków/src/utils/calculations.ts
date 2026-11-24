import {
  Currency,
  DebtTransfer,
  ExpenseCategory,
  ExpenseShare,
  Group,
  GroupKind,
  MemberBalance,
} from '../types/bills';

export const CURRENCY_META: Record<Currency, { symbol: string; label: string }> = {
  PLN: { symbol: 'zł', label: 'Polski złoty (PLN)' },
  EUR: { symbol: '€', label: 'Euro (EUR)' },
  USD: { symbol: '$', label: 'Dolar amerykański (USD)' },
  GBP: { symbol: '£', label: 'Funt brytyjski (GBP)' },
  CZK: { symbol: 'Kč', label: 'Korona czeska (CZK)' },
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  groceries: 'Zakupy spożywcze',
  food: 'Jedzenie i restauracje',
  transport: 'Transport i paliwo',
  accommodation: 'Nocleg',
  entertainment: 'Rozrywka i bilety',
  utilities: 'Rachunki i czynsz',
  other: 'Inne wydatki',
};

export const GROUP_KIND_LABELS: Record<GroupKind, string> = {
  trip: 'Wyjazd',
  home: 'Mieszkanie',
  event: 'Wydarzenie',
  friends: 'Znajomi',
};

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toCents(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
  }
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, currency: Currency, showPlus = false): string {
  const absCents = Math.abs(cents);
  const formattedNumber = (absCents / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_META[currency]?.symbol ?? currency;
  const sign = cents < 0 ? '-' : cents > 0 && showPlus ? '+' : '';
  return `${sign}${formattedNumber} ${symbol}`;
}

export function formatDatePl(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Splits totalCents equally among participantIds, distributing remainder cents
 * cleanly so sum(shares) === totalCents.
 */
export function calculateEqualShares(
  totalCents: number,
  participantIds: string[]
): ExpenseShare[] {
  const count = participantIds.length;
  if (count === 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return participantIds.map((participantId, index) => ({
    participantId,
    amountCents: base + (index < remainder ? 1 : 0),
    weight: 1,
  }));
}

/**
 * Splits totalCents proportionally according to positive weights using
 * largest-remainder (Hamilton) method so sum(shares) === totalCents.
 */
export function calculateWeightedShares(
  totalCents: number,
  weights: Array<{ participantId: string; weight: number }>
): ExpenseShare[] {
  const valid = weights.filter((w) => w.weight > 0);
  const totalWeight = valid.reduce((sum, w) => sum + w.weight, 0);
  if (valid.length === 0 || totalWeight <= 0) {
    return weights.map((w) => ({
      participantId: w.participantId,
      amountCents: 0,
      weight: w.weight,
    }));
  }

  const provisional = valid.map((w, idx) => {
    const exact = (totalCents * w.weight) / totalWeight;
    const floored = Math.floor(exact);
    return {
      participantId: w.participantId,
      weight: w.weight,
      floored,
      remainder: exact - floored,
      idx,
    };
  });

  const assignedSum = provisional.reduce((s, p) => s + p.floored, 0);
  let remainingCents = totalCents - assignedSum;

  const byRemainder = [...provisional].sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    return a.idx - b.idx;
  });

  const extraMap = new Map<string, number>();
  for (let i = 0; i < remainingCents && i < byRemainder.length; i++) {
    extraMap.set(byRemainder[i].participantId, 1);
  }

  return weights.map((w) => {
    const found = provisional.find((p) => p.participantId === w.participantId);
    if (!found) {
      return { participantId: w.participantId, amountCents: 0, weight: 0 };
    }
    return {
      participantId: w.participantId,
      amountCents: found.floored + (extraMap.get(w.participantId) ?? 0),
      weight: w.weight,
    };
  });
}

export function computeMemberBalances(group: Group): MemberBalance[] {
  const map = new Map<string, MemberBalance>();

  for (const p of group.participants) {
    map.set(p.id, {
      participantId: p.id,
      name: p.name,
      totalPaidCents: 0,
      totalShareCents: 0,
      settlementsPaidCents: 0,
      settlementsReceivedCents: 0,
      netBalanceCents: 0,
    });
  }

  for (const exp of group.expenses) {
    const payer = map.get(exp.paidById);
    if (payer) {
      payer.totalPaidCents += exp.amountCents;
    }
    for (const share of exp.shares) {
      const member = map.get(share.participantId);
      if (member) {
        member.totalShareCents += share.amountCents;
      }
    }
  }

  for (const stl of group.settlements) {
    const fromMember = map.get(stl.fromId);
    const toMember = map.get(stl.toId);
    if (fromMember) {
      fromMember.settlementsPaidCents += stl.amountCents;
    }
    if (toMember) {
      toMember.settlementsReceivedCents += stl.amountCents;
    }
  }

  const results: MemberBalance[] = [];
  for (const balance of map.values()) {
    // Net = (Paid for bills - Own share of bills) + (Paid settlements - Received settlements)
    balance.netBalanceCents =
      balance.totalPaidCents -
      balance.totalShareCents +
      balance.settlementsPaidCents -
      balance.settlementsReceivedCents;
    results.push(balance);
  }

  return results.sort((a, b) => b.netBalanceCents - a.netBalanceCents);
}

/**
 * Greedy minimum-transfer algorithm matching largest debtor with largest creditor.
 */
export function simplifyDebts(balances: MemberBalance[]): DebtTransfer[] {
  const debtors = balances
    .filter((b) => b.netBalanceCents < 0)
    .map((b) => ({
      id: b.participantId,
      name: b.name,
      amount: Math.abs(b.netBalanceCents),
    }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((b) => b.netBalanceCents > 0)
    .map((b) => ({
      id: b.participantId,
      name: b.name,
      amount: b.netBalanceCents,
    }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settled = Math.min(debtor.amount, creditor.amount);

    if (settled > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amountCents: settled,
      });
    }

    debtor.amount -= settled;
    creditor.amount -= settled;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transfers;
}

export function getGroupTotalSpendCents(group: Group): number {
  return group.expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

export function generateShareableSummary(group: Group): string {
  const balances = computeMemberBalances(group);
  const transfers = simplifyDebts(balances);
  const totalSpend = getGroupTotalSpendCents(group);

  const lines: string[] = [
    `Rozliczenie grupy: ${group.name}`,
    `Suma wydatków: ${formatMoney(totalSpend, group.currency)} (${group.expenses.length} rachunków)`,
    '',
  ];

  if (transfers.length === 0) {
    lines.push('Wszystkie rachunki w grupie są już wyrównane.');
  } else {
    lines.push('Najprostsze przelewy do rozliczenia:');
    for (const t of transfers) {
      lines.push(`• ${t.fromName} -> ${t.toName}: ${formatMoney(t.amountCents, group.currency)}`);
    }
  }

  lines.push('');
  lines.push('Salda końcowe:');
  for (const b of balances) {
    const status =
      b.netBalanceCents > 0
        ? `otrzyma ${formatMoney(b.netBalanceCents, group.currency)}`
        : b.netBalanceCents < 0
          ? `do oddania ${formatMoney(Math.abs(b.netBalanceCents), group.currency)}`
          : 'rozliczony';
    lines.push(`- ${b.name}: ${status}`);
  }

  return lines.join('\n');
}
