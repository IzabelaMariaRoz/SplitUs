import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  ExpenseShare,
  Group,
  SplitType,
} from '../types/bills';
import {
  CATEGORY_LABELS,
  CURRENCY_META,
  calculateEqualShares,
  calculateWeightedShares,
  formatMoney,
  toCents,
} from '../utils/calculations';

interface ExpenseModalProps {
  group: Group;
  initialExpense?: Expense | null;
  onClose: () => void;
  onSave: (expenseData: {
    id?: string;
    title: string;
    amountCents: number;
    paidById: string;
    date: string;
    category: ExpenseCategory;
    splitType: SplitType;
    shares: ExpenseShare[];
    note?: string;
  }) => void;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  group,
  initialExpense,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(initialExpense);
  const symbol = CURRENCY_META[group.currency]?.symbol ?? group.currency;

  const [title, setTitle] = useState(initialExpense?.title ?? '');
  const [amountInput, setAmountInput] = useState(
    initialExpense ? (initialExpense.amountCents / 100).toFixed(2).replace('.', ',') : ''
  );
  const [paidById, setPaidById] = useState(
    initialExpense?.paidById ?? group.participants[0]?.id ?? ''
  );
  const [date, setDate] = useState(initialExpense?.date ?? getTodayIso());
  const [category, setCategory] = useState<ExpenseCategory>(
    initialExpense?.category ?? 'groceries'
  );
  const [splitType, setSplitType] = useState<SplitType>(
    initialExpense?.splitType ?? 'equal'
  );
  const [note, setNote] = useState(initialExpense?.note ?? '');

  // Equal mode state
  const [selectedEqualIds, setSelectedEqualIds] = useState<string[]>(() => {
    if (initialExpense && initialExpense.splitType === 'equal') {
      return initialExpense.shares.filter((s) => s.amountCents > 0).map((s) => s.participantId);
    }
    return group.participants.map((p) => p.id);
  });

  // Exact mode state (string inputs per participant)
  const [exactInputs, setExactInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of group.participants) {
      const existing = initialExpense?.shares.find((s) => s.participantId === p.id);
      map[p.id] =
        existing && existing.amountCents > 0
          ? (existing.amountCents / 100).toFixed(2).replace('.', ',')
          : '';
    }
    return map;
  });

  // Shares/weights mode state
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of group.participants) {
      const existing = initialExpense?.shares.find((s) => s.participantId === p.id);
      if (initialExpense?.splitType === 'shares' && existing) {
        map[p.id] = String(existing.weight ?? 0);
      } else {
        map[p.id] = '1';
      }
    }
    return map;
  });

  const [error, setError] = useState<string | null>(null);

  const totalCents = useMemo(() => toCents(amountInput), [amountInput]);

  const computedShares = useMemo<ExpenseShare[]>(() => {
    if (splitType === 'equal') {
      return calculateEqualShares(totalCents, selectedEqualIds);
    }
    if (splitType === 'exact') {
      return group.participants.map((p) => ({
        participantId: p.id,
        amountCents: toCents(exactInputs[p.id] ?? ''),
      }));
    }
    const weights = group.participants.map((p) => {
      const parsed = Number.parseFloat((weightInputs[p.id] ?? '0').replace(',', '.'));
      return {
        participantId: p.id,
        weight: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
      };
    });
    return calculateWeightedShares(totalCents, weights);
  }, [splitType, totalCents, selectedEqualIds, group.participants, exactInputs, weightInputs]);

  const exactSumCents = useMemo(
    () =>
      group.participants.reduce((sum, p) => sum + toCents(exactInputs[p.id] ?? ''), 0),
    [group.participants, exactInputs]
  );

  const exactDifferenceCents = totalCents - exactSumCents;

  const toggleEqualParticipant = (id: string) => {
    setSelectedEqualIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Podaj nazwę rachunku.');
      return;
    }
    if (totalCents <= 0) {
      setError('Podaj kwotę większą od zera.');
      return;
    }
    if (!paidById) {
      setError('Wybierz osobę, która zapłaciła rachunek.');
      return;
    }

    if (splitType === 'equal' && selectedEqualIds.length === 0) {
      setError('Zaznacz przynajmniej jedną osobę w podziale.');
      return;
    }

    if (splitType === 'exact' && exactDifferenceCents !== 0) {
      setError(
        `Suma kwot poszczególnych osób musi wynosić dokładnie ${formatMoney(
          totalCents,
          group.currency
        )}.`
      );
      return;
    }

    if (
      splitType === 'shares' &&
      computedShares.every((s) => (s.weight ?? 0) <= 0)
    ) {
      setError('Przynajmniej jedna osoba musi mieć udział większy od zera.');
      return;
    }

    onSave({
      id: initialExpense?.id,
      title: trimmedTitle,
      amountCents: totalCents,
      paidById,
      date,
      category,
      splitType,
      shares: computedShares,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
          <h2 id="expense-modal-title" className="font-display text-lg font-semibold text-slate-900">
            {isEditing ? 'Edytuj rachunek' : 'Dodaj nowy rachunek'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Title & Amount */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-7">
              <label
                htmlFor="expense-title"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nazwa wydatku
              </label>
              <input
                id="expense-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Zakupy Lidl, Paliwo, Kolacja"
                autoFocus
                className="h-10 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label
                htmlFor="expense-amount"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Kwota całkowita ({symbol})
              </label>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0,00"
                className="h-10 w-full rounded-lg border border-slate-200 px-3.5 font-mono text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Payer, Date, Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="expense-payer"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Kto zapłacił?
              </label>
              <select
                id="expense-payer"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {group.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expense-category"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Kategoria
              </label>
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expense-date"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Data
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Split Mode Selector */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <span className="text-xs font-semibold text-slate-800">
                Sposób podziału kosztów
              </span>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                {(
                  [
                    { id: 'equal', label: 'Po równo' },
                    { id: 'exact', label: 'Dokładne kwoty' },
                    { id: 'shares', label: 'Udziały' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setSplitType(mode.id);
                      setError(null);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      splitType === mode.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Breakdown Rows */}
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/50">
              {splitType === 'equal' && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-t-xl">
                  <span className="text-xs text-slate-500">
                    Zaznaczono {selectedEqualIds.length} z {group.participants.length} osób
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedEqualIds(
                        selectedEqualIds.length === group.participants.length
                          ? []
                          : group.participants.map((p) => p.id)
                      )
                    }
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {selectedEqualIds.length === group.participants.length
                      ? 'Odznacz wszystkich'
                      : 'Zaznacz wszystkich'}
                  </button>
                </div>
              )}

              {group.participants.map((member) => {
                const share = computedShares.find((s) => s.participantId === member.id);
                const shareCents = share?.amountCents ?? 0;

                if (splitType === 'equal') {
                  const checked = selectedEqualIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-white transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEqualParticipant(member.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-800">{member.name}</span>
                      </span>
                      <span
                        className={`font-mono text-sm tabular-nums ${
                          checked ? 'font-medium text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {formatMoney(checked ? shareCents : 0, group.currency)}
                      </span>
                    </label>
                  );
                }

                if (splitType === 'exact') {
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-slate-800">{member.name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={exactInputs[member.id] ?? ''}
                          onChange={(e) =>
                            setExactInputs((prev) => ({
                              ...prev,
                              [member.id]: e.target.value,
                            }))
                          }
                          placeholder="0,00"
                          className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-3 text-right font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none tabular-nums"
                        />
                        <span className="w-6 text-xs font-mono text-slate-500">{symbol}</span>
                      </div>
                    </div>
                  );
                }

                // Shares mode
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-slate-800">{member.name}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={weightInputs[member.id] ?? '1'}
                          onChange={(e) =>
                            setWeightInputs((prev) => ({
                              ...prev,
                              [member.id]: e.target.value,
                            }))
                          }
                          className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2.5 text-right font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none tabular-nums"
                        />
                        <span className="text-xs text-slate-500">udział</span>
                      </div>
                      <span className="w-24 text-right font-mono text-sm font-medium text-slate-900 tabular-nums">
                        {formatMoney(shareCents, group.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {splitType === 'exact' && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 text-xs rounded-b-xl">
                  <span className="text-slate-600">
                    Rozdzielono:{' '}
                    <strong className="font-mono text-slate-900 tabular-nums">
                      {formatMoney(exactSumCents, group.currency)}
                    </strong>{' '}
                    z{' '}
                    <strong className="font-mono text-slate-900 tabular-nums">
                      {formatMoney(totalCents, group.currency)}
                    </strong>
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      exactDifferenceCents === 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {exactDifferenceCents === 0
                      ? 'Zgodne co do grosza'
                      : exactDifferenceCents > 0
                        ? `Pozostało: ${formatMoney(exactDifferenceCents, group.currency)}`
                        : `Nadwyżka: ${formatMoney(Math.abs(exactDifferenceCents), group.currency)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="expense-note" className="block text-xs font-medium text-slate-700 mb-1.5">
              Notatka (opcjonalnie)
            </label>
            <input
              id="expense-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dodatkowe szczegóły rachunku..."
              className="h-10 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              {isEditing ? 'Zapisz rachunek' : 'Dodaj rachunek'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
