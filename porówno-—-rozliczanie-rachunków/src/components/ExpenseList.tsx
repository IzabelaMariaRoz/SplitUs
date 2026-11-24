import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import { Expense, ExpenseCategory, Group, Settlement } from '../types/bills';
import { CATEGORY_LABELS, formatDatePl, formatMoney } from '../utils/calculations';

interface ExpenseListProps {
  group: Group;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteSettlement: (settlementId: string) => void;
}

type EntryFilter = 'all' | 'expenses' | 'settlements';

type LedgerItem =
  | { kind: 'expense'; date: string; createdAt: string; data: Expense }
  | { kind: 'settlement'; date: string; createdAt: string; data: Settlement };

export const ExpenseList: React.FC<ExpenseListProps> = ({
  group,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onDeleteSettlement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entryFilter, setEntryFilter] = useState<EntryFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of group.participants) {
      map.set(p.id, p.name);
    }
    return map;
  }, [group.participants]);

  const items = useMemo<LedgerItem[]>(() => {
    const combined: LedgerItem[] = [];
    if (entryFilter !== 'settlements') {
      for (const exp of group.expenses) {
        combined.push({
          kind: 'expense',
          date: exp.date,
          createdAt: exp.createdAt,
          data: exp,
        });
      }
    }
    if (entryFilter !== 'expenses') {
      for (const stl of group.settlements) {
        combined.push({
          kind: 'settlement',
          date: stl.date,
          createdAt: stl.createdAt,
          data: stl,
        });
      }
    }

    const q = searchQuery.trim().toLowerCase();

    return combined
      .filter((item) => {
        if (item.kind === 'expense') {
          if (categoryFilter !== 'all' && item.data.category !== categoryFilter) {
            return false;
          }
          if (!q) return true;
          const payerName = memberNameById.get(item.data.paidById)?.toLowerCase() ?? '';
          const catLabel = CATEGORY_LABELS[item.data.category].toLowerCase();
          return (
            item.data.title.toLowerCase().includes(q) ||
            payerName.includes(q) ||
            catLabel.includes(q) ||
            (item.data.note?.toLowerCase().includes(q) ?? false)
          );
        } else {
          if (categoryFilter !== 'all') return false;
          if (!q) return true;
          const fromName = memberNameById.get(item.data.fromId)?.toLowerCase() ?? '';
          const toName = memberNameById.get(item.data.toId)?.toLowerCase() ?? '';
          return (
            fromName.includes(q) ||
            toName.includes(q) ||
            'zwrot'.includes(q) ||
            (item.data.note?.toLowerCase().includes(q) ?? false)
          );
        }
      })
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [
    group.expenses,
    group.settlements,
    entryFilter,
    categoryFilter,
    searchQuery,
    memberNameById,
  ]);

  const splitTypeLabel = (type: Expense['splitType']) => {
    switch (type) {
      case 'equal':
        return 'Po równo';
      case 'exact':
        return 'Dokładne kwoty';
      case 'shares':
        return 'Według udziałów';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            {(
              [
                { id: 'all', label: 'Wszystkie' },
                { id: 'expenses', label: 'Rachunki' },
                { id: 'settlements', label: 'Zwroty' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEntryFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  entryFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {entryFilter !== 'settlements' && (
            <select
              aria-label="Filtruj po kategorii"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Wszystkie kategorie</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj rachunku lub osoby..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Empty States */}
      {group.expenses.length === 0 && group.settlements.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold text-slate-900">
            Brak rachunków w tej grupie
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            Dodaj pierwszy wspólny wydatek, wskaż kto zapłacił i wybierz sposób podziału
            kosztów między znajomych.
          </p>
          <button
            type="button"
            onClick={onAddExpense}
            disabled={group.participants.length === 0}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Dodaj pierwszy rachunek</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-900">
            Brak wyników pasujących do wybranych filtrów
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Zmień wyszukiwaną frazę lub wyczyść filtr kategorii.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
          {items.map((item) => {
            if (item.kind === 'settlement') {
              const stl = item.data;
              const fromName = memberNameById.get(stl.fromId) ?? 'Usunięty uczestnik';
              const toName = memberNameById.get(stl.toId) ?? 'Usunięty uczestnik';
              const isConfirming = confirmDeleteId === stl.id;

              return (
                <div
                  key={stl.id}
                  className="flex flex-col gap-3 bg-emerald-50/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-700">
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        <span>{fromName}</span>
                        <span className="mx-1.5 text-slate-400">oddał(a)</span>
                        <span>{toName}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span>Rozliczenie</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{formatDatePl(stl.date)}</span>
                        {stl.note && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-xs">{stl.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end shrink-0">
                    <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                      {formatMoney(stl.amountCents, group.currency)}
                    </span>

                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSettlement(stl.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 cursor-pointer"
                        >
                          Usuń
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Anuluj
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(stl.id)}
                        aria-label="Usuń zwrot"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            const exp = item.data;
            const payerName = memberNameById.get(exp.paidById) ?? 'Nieznana osoba';
            const isExpanded = expandedId === exp.id;
            const isConfirming = confirmDeleteId === exp.id;
            const activeShares = exp.shares.filter((s) => s.amountCents > 0);

            return (
              <div key={exp.id} className="transition-colors hover:bg-slate-50/70">
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    className="flex min-w-0 flex-1 items-start gap-3.5 text-left cursor-pointer"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {exp.title}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span>{CATEGORY_LABELS[exp.category]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{formatDatePl(exp.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Opłacił: <strong className="font-medium text-slate-700">{payerName}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {splitTypeLabel(exp.splitType)} ({activeShares.length} os.)
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-3 sm:justify-end shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatMoney(exp.amountCents, group.currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 pl-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(exp.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 cursor-pointer"
                          >
                            Usuń
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Anuluj
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditExpense(exp)}
                            aria-label={`Edytuj rachunek ${exp.title}`}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(exp.id)}
                            aria-label={`Usuń rachunek ${exp.title}`}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                            aria-label={isExpanded ? 'Zwiń szczegóły' : 'Rozwiń szczegóły'}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:pl-[68px]">
                    {exp.note && (
                      <p className="mb-3 text-xs text-slate-600">
                        Notatka: <span className="text-slate-800">{exp.note}</span>
                      </p>
                    )}
                    <div className="text-xs font-medium text-slate-500 mb-2">
                      Podział kosztów na uczestników:
                    </div>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 md:grid-cols-3">
                      {activeShares.map((share) => {
                        const name =
                          memberNameById.get(share.participantId) ?? 'Usunięty uczestnik';
                        const isPayer = share.participantId === exp.paidById;
                        return (
                          <div
                            key={share.participantId}
                            className="flex items-center justify-between border-b border-slate-200/70 py-1 text-xs"
                          >
                            <span className="text-slate-700 truncate pr-2">
                              {name}
                              {isPayer && (
                                <span className="ml-1 text-slate-400">(płatnik)</span>
                              )}
                              {exp.splitType === 'shares' && share.weight !== undefined && (
                                <span className="ml-1 text-slate-400">({share.weight}x)</span>
                              )}
                            </span>
                            <span className="font-mono font-medium text-slate-900 tabular-nums shrink-0">
                              {formatMoney(share.amountCents, group.currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
