import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { Group } from '../types/bills';
import { CURRENCY_META, GROUP_KIND_LABELS } from '../utils/calculations';

interface MembersViewProps {
  group: Group;
  onAddParticipant: (name: string) => void;
  onRenameParticipant: (participantId: string, name: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  group,
  onAddParticipant,
  onRenameParticipant,
  onRemoveParticipant,
  onEditGroup,
  onDeleteGroup,
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  const usedParticipantIds = useMemo(() => {
    const set = new Set<string>();
    for (const exp of group.expenses) {
      set.add(exp.paidById);
      for (const s of exp.shares) {
        if (s.amountCents > 0) set.add(s.participantId);
      }
    }
    for (const stl of group.settlements) {
      set.add(stl.fromId);
      set.add(stl.toId);
    }
    return set;
  }, [group.expenses, group.settlements]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed) {
      setMemberError('Wpisz imię lub ksywkę znajomego.');
      return;
    }
    if (group.participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setMemberError('Osoba o takim imieniu już należy do tej grupy.');
      return;
    }
    onAddParticipant(trimmed);
    setNewMemberName('');
    setMemberError(null);
  };

  const handleSaveRename = (participantId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    onRenameParticipant(participantId, trimmed);
    setEditingMemberId(null);
    setEditingName('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Participants Management */}
      <section className="lg:col-span-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Uczestnicy grupy ({group.participants.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Dodawaj znajomych i edytuj ich nazwy. Uczestników powiązanych z rachunkami nie można
            usunąć bez wcześniejszego usunięcia ich rachunków.
          </p>
        </div>

        {/* Add member form */}
        <form onSubmit={handleAddSubmit} className="border-b border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => {
                setNewMemberName(e.target.value);
                if (memberError) setMemberError(null);
              }}
              placeholder="Imię lub ksywka (np. Bartek)"
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Dodaj osobę</span>
            </button>
          </div>
          {memberError && <p className="mt-2 text-xs text-red-600">{memberError}</p>}
        </form>

        {/* Member list */}
        <div className="divide-y divide-slate-200">
          {group.participants.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Brak uczestników. Dodaj pierwszą osobę powyżej.
            </div>
          ) : (
            group.participants.map((member) => {
              const isUsed = usedParticipantIds.has(member.id);
              const isEditing = editingMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(member.id);
                          if (e.key === 'Escape') setEditingMemberId(null);
                        }}
                        autoFocus
                        className="h-9 flex-1 rounded-lg border border-blue-400 bg-white px-3 text-sm text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(member.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
                      >
                        Zapisz
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                          {member.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {member.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {isUsed ? 'Bierze udział w rachunkach' : 'Brak przypisanych rachunków'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemberId(member.id);
                            setEditingName(member.name);
                          }}
                          aria-label={`Zmień imię ${member.name}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveParticipant(member.id)}
                          disabled={isUsed}
                          title={
                            isUsed
                              ? 'Nie można usunąć osoby powiązanej z rachunkami lub zwrotami'
                              : 'Usuń uczestnika z grupy'
                          }
                          aria-label={`Usuń ${member.name}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Right: Group Settings & Danger Zone */}
      <section className="lg:col-span-5 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Ustawienia grupy
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Podstawowe informacje i waluta rozliczeniowa
              </p>
            </div>
            <button
              type="button"
              onClick={onEditGroup}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edytuj grupę</span>
            </button>
          </div>

          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Nazwa</dt>
              <dd className="font-medium text-slate-900">{group.name}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Rodzaj</dt>
              <dd className="font-medium text-slate-900">{GROUP_KIND_LABELS[group.kind]}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Waluta</dt>
              <dd className="font-mono font-medium text-slate-900">
                {CURRENCY_META[group.currency].label}
              </dd>
            </div>
            {group.description && (
              <div className="py-2.5">
                <dt className="text-slate-500 mb-1">Opis</dt>
                <dd className="text-slate-800">{group.description}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-5">
          <h3 className="font-display text-sm font-semibold text-red-700">Usuwanie grupy</h3>
          <p className="mt-1 text-xs text-slate-600">
            Usunięcie grupy spowoduje trwałe skasowanie wszystkich jej rachunków i historii zwrotów.
          </p>

          {confirmDeleteGroup ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onDeleteGroup}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Potwierdź usunięcie grupy</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteGroup(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteGroup(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Usuń grupę</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
