import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { DebtTransfer, Group } from '../types/bills';
import {
  computeMemberBalances,
  formatMoney,
  generateShareableSummary,
  simplifyDebts,
} from '../utils/calculations';

interface BalancesViewProps {
  group: Group;
  onQuickSettle: (transfer: DebtTransfer) => void;
  onOpenCustomSettlement: () => void;
}

export const BalancesView: React.FC<BalancesViewProps> = ({
  group,
  onQuickSettle,
  onOpenCustomSettlement,
}) => {
  const [copied, setCopied] = useState(false);

  const balances = useMemo(() => computeMemberBalances(group), [group]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);

  const handleCopySummary = async () => {
    const text = generateShareableSummary(group);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback if clipboard API is unavailable
      setCopied(false);
    }
  };

  if (group.participants.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-900">Brak uczestników w grupie</p>
        <p className="mt-1 text-xs text-slate-500">
          Dodaj znajomych w zakładce „Uczestnicy”, aby móc obliczać salda i przelewy.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Member Balances Table */}
      <section className="lg:col-span-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Bilans uczestników
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Porównanie wpłat z przypadającym udziałem w kosztach grupy
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Uczestnik</th>
                <th className="px-4 py-3 text-right">Zapłacił(a)</th>
                <th className="px-4 py-3 text-right">Udział</th>
                <th className="px-5 py-3 text-right">Saldo netto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {balances.map((b) => {
                const statusText =
                  b.netBalanceCents > 0
                    ? 'Otrzyma'
                    : b.netBalanceCents < 0
                      ? 'Do oddania'
                      : 'Rozliczony';
                const statusColor =
                  b.netBalanceCents > 0
                    ? 'text-emerald-700'
                    : b.netBalanceCents < 0
                      ? 'text-red-600'
                      : 'text-slate-500';

                return (
                  <tr key={b.participantId} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                          {b.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate max-w-[140px]">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatMoney(b.totalPaidCents, group.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatMoney(b.totalShareCents, group.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div
                        className={`font-mono text-sm font-semibold tabular-nums ${statusColor}`}
                      >
                        {formatMoney(b.netBalanceCents, group.currency, true)}
                      </div>
                      <div className={`text-[11px] font-medium ${statusColor}`}>
                        {statusText}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Right: Suggested Optimal Transfers */}
      <section className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Proponowane przelewy
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Minimalna liczba transakcji potrzebna do wyrównania grupy
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Skopiowano</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Kopiuj opis</span>
              </>
            )}
          </button>
        </div>

        <div className="flex-1 divide-y divide-slate-200">
          {transfers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Check className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Wszystko jest rozliczone
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Nikt nikomu nic nie jest winien. Gdy dodasz nowe rachunki, pojawią się tutaj
                sugerowane przelewy.
              </p>
            </div>
          ) : (
            transfers.map((t) => (
              <div
                key={`${t.fromId}_${t.toId}`}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                    <span>{t.fromName}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{t.toName}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {formatMoney(t.amountCents, group.currency)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onQuickSettle(t)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Oznacz jako rozliczone</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Inna kwota lub przelew częściowy?
          </span>
          <button
            type="button"
            onClick={onOpenCustomSettlement}
            disabled={group.participants.length < 2}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Zarejestruj własny zwrot
          </button>
        </div>
      </section>
    </div>
  );
};
