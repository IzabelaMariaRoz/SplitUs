import React from 'react';
import { Group } from '../types/bills';
import {
  computeMemberBalances,
  formatMoney,
  getGroupTotalSpendCents,
  simplifyDebts,
} from '../utils/calculations';

interface KpiStripProps {
  group: Group;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ group }) => {
  const totalSpendCents = getGroupTotalSpendCents(group);
  const expenseCount = group.expenses.length;
  const memberCount = group.participants.length;
  const averagePerPersonCents =
    memberCount > 0 ? Math.round(totalSpendCents / memberCount) : 0;

  const balances = computeMemberBalances(group);
  const transfers = simplifyDebts(balances);
  const outstandingCents = transfers.reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <section
      aria-label="Podsumowanie grupy"
      className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 sm:gap-px sm:bg-slate-200 xl:grid-cols-4 overflow-hidden"
    >
      <div className="bg-white px-5 py-4">
        <div className="text-xs font-medium text-slate-500">Suma wydatków</div>
        <div className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {formatMoney(totalSpendCents, group.currency)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Łącznie w grupie
        </div>
      </div>

      <div className="bg-white px-5 py-4">
        <div className="text-xs font-medium text-slate-500">Dodane rachunki</div>
        <div className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {expenseCount}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {group.settlements.length} zarejestrowanych zwrotów
        </div>
      </div>

      <div className="bg-white px-5 py-4">
        <div className="text-xs font-medium text-slate-500">Średnio na osobę</div>
        <div className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {formatMoney(averagePerPersonCents, group.currency)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Przy {memberCount} {memberCount === 1 ? 'uczestniku' : 'uczestnikach'}
        </div>
      </div>

      <div className="bg-white px-5 py-4">
        <div className="text-xs font-medium text-slate-500">Pozostało do rozliczenia</div>
        <div
          className={`mt-1.5 font-mono text-2xl font-semibold tracking-tight tabular-nums ${
            outstandingCents === 0 ? 'text-emerald-700' : 'text-slate-900'
          }`}
        >
          {formatMoney(outstandingCents, group.currency)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {outstandingCents === 0
            ? 'Grupa w pełni rozliczona'
            : `${transfers.length} ${
                transfers.length === 1
                  ? 'przelew wyrównujący'
                  : transfers.length < 5
                    ? 'przelewy wyrównujące'
                    : 'przelewów wyrównujących'
              }`}
        </div>
      </div>
    </section>
  );
};
