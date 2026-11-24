import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Currency, Group, GroupKind } from '../types/bills';
import { CURRENCY_META, GROUP_KIND_LABELS } from '../utils/calculations';

interface GroupModalProps {
  initialGroup?: Group | null;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    kind: GroupKind;
    currency: Currency;
    participantNames: string[];
  }) => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  initialGroup,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(initialGroup);

  const [name, setName] = useState(initialGroup?.name ?? '');
  const [description, setDescription] = useState(initialGroup?.description ?? '');
  const [kind, setKind] = useState<GroupKind>(initialGroup?.kind ?? 'trip');
  const [currency, setCurrency] = useState<Currency>(initialGroup?.currency ?? 'PLN');
  const [participantInput, setParticipantInput] = useState('');
  const [participantNames, setParticipantNames] = useState<string[]>(
    initialGroup ? initialGroup.participants.map((p) => p.name) : ['Ja', 'Kasia', 'Tomek']
  );
  const [error, setError] = useState<string | null>(null);

  const handleAddMemberChip = () => {
    const trimmed = participantInput.trim();
    if (!trimmed) return;
    if (participantNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError('Taka osoba jest już na liście.');
      return;
    }
    setParticipantNames((prev) => [...prev, trimmed]);
    setParticipantInput('');
    setError(null);
  };

  const handleRemoveMemberName = (nameToRemove: string) => {
    setParticipantNames((prev) => prev.filter((n) => n !== nameToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Podaj nazwę grupy.');
      return;
    }
    if (!isEditing && participantNames.length < 2) {
      setError('Dodaj przynajmniej 2 uczestników do nowej grupy.');
      return;
    }
    onSave({
      name: trimmedName,
      description: description.trim(),
      kind,
      currency,
      participantNames,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="group-modal-title" className="font-display text-lg font-semibold text-slate-900">
            {isEditing ? 'Edytuj grupę' : 'Nowa grupa rozliczeniowa'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="group-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Nazwa grupy
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Majówka na Mazurach"
              autoFocus
              className="h-10 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="group-kind" className="block text-xs font-medium text-slate-700 mb-1.5">
                Rodzaj grupy
              </label>
              <select
                id="group-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as GroupKind)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(GROUP_KIND_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="group-currency"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Waluta
              </label>
              <select
                id="group-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(CURRENCY_META).map(([code, meta]) => (
                  <option key={code} value={code}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="group-desc" className="block text-xs font-medium text-slate-700 mb-1.5">
              Opis (opcjonalnie)
            </label>
            <input
              id="group-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Domki, jedzenie i wspólne atrakcje"
              className="h-10 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {!isEditing && (
            <div>
              <label
                htmlFor="member-input"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Uczestnicy ({participantNames.length})
              </label>
              <div className="flex gap-2">
                <input
                  id="member-input"
                  type="text"
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMemberChip();
                    }
                  }}
                  placeholder="Wpisz imię i kliknij Dodaj"
                  className="h-10 flex-1 rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMemberChip}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Dodaj</span>
                </button>
              </div>

              <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {participantNames.map((memberName) => (
                  <div
                    key={memberName}
                    className="flex items-center justify-between px-3.5 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{memberName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberName(memberName)}
                      aria-label={`Usuń ${memberName}`}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
            >
              {isEditing ? 'Zapisz zmiany' : 'Utwórz grupę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
