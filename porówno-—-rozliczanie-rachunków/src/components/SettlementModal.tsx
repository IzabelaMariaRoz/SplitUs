import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { DebtTransfer, Group } from '../types/bills';
import { CURRENCY_META, toCents } from '../utils/calculations';

interface SettlementModalProps {
  group: Group;
  prefill?: DebtTransfer | null;
  onClose: () => void;
  onSave: (payload: {
    fromId: string;
    toId: string;
    amountCents: number;
    date: string;
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

export const SettlementModal: React.FC<SettlementModalProps> = ({
  group,
  prefill,
  onClose,
  onSave,
}) => {
  const symbol = CURRENCY_META[group.currency]?.symbol ?? group.currency;

  const [fromId, setFromId] = useState(
    prefill?.fromId ?? group.participants[0]?.id ?? ''
  );
  const [toId, setToId] = useState(
    prefill?.toId ?? group.participants[1]?.id ?? group.participants[0]?.id ?? ''
  );
  const [amountInput, setAmountInput] = useState(
    prefill ? (prefill.amountCents / 100).toFixed(2).replace('.', ',') : ''
  );
  const [date, setDate] = useState(getTodayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = toCents(amountInput);
    if (!fromId || !toId) {
      setError('Wybierz obie strony przelewu.');
      return;
    }
    if (fromId === toId) {
      setError('Nadawca i odbiorca zwrotu muszą być różnymi osobami.');
      return;
    }
    if (amountCents <= 0) {
      setError('Podaj kwotę większą od zera.');
      return;
    }
    onSave({
      fromId,
      toId,
      amountCents,
      date,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="settlement-modal-title" className="font-display text-lg font-semibold text-slate-900">
            Zarejestruj zwrot pieniędzy
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <label htmlFor="stl-from" className="block text-xs font-medium text-slate-700 mb-1.5">
                Kto oddaje
              </label>
              <select
                id="stl-from"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {group.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex h-10 items-center justify-center px-1 text-slate-400">
              <ArrowRight className="h-4 w-4" />
            </div>

            <div>
              <label htmlFor="stl-to" className="block text-xs font-medium text-slate-700 mb-1.5">
                Komu
              </label>
              <select
                id="stl-to"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {group.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="stl-amount" className="block text-xs font-medium text-slate-700 mb-1.5">
                Kwota ({symbol})
              </label>
              <input
                id="stl-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="h-10 w-full rounded-lg border border-slate-200 px-3.5 font-mono text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="stl-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Data zwrotu
              </label>
              <input
                id="stl-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="stl-note" className="block text-xs font-medium text-slate-700 mb-1.5">
              Notatka (opcjonalnie)
            </label>
            <input
              id="stl-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="np. Przelew BLIK / gotówka"
              className="h-10 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 cursor-pointer"
            >
              Zapisz zwrot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
