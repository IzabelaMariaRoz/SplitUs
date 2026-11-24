import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Plus, Users } from 'lucide-react';
import { BalancesView } from './components/BalancesView';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseModal } from './components/ExpenseModal';
import { GroupModal } from './components/GroupModal';
import { KpiStrip } from './components/KpiStrip';
import { MembersView } from './components/MembersView';
import { SettlementModal } from './components/SettlementModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { createSeedGroups, loadGroups, saveGroups } from './data/seedGroups';
import {
  Currency,
  DebtTransfer,
  Expense,
  ExpenseCategory,
  ExpenseShare,
  Group,
  GroupKind,
  SplitType,
} from './types/bills';
import {
  CURRENCY_META,
  GROUP_KIND_LABELS,
  createId,
} from './utils/calculations';

type WorkspaceTab = 'expenses' | 'balances' | 'members';

export default function App() {
  const [groups, setGroups] = useState<Group[]>(() => loadGroups());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    const initial = loadGroups();
    return initial[0]?.id ?? null;
  });
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('expenses');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [groupModalMode, setGroupModalMode] = useState<'create' | 'edit' | null>(null);
  const [expenseModalState, setExpenseModalState] = useState<{
    open: boolean;
    editing: Expense | null;
  }>({ open: false, editing: null });
  const [settlementModalState, setSettlementModalState] = useState<{
    open: boolean;
    prefill: DebtTransfer | null;
  }>({ open: false, prefill: null });

  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    saveGroups(groups);
  }, [groups]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null,
    [groups, activeGroupId]
  );

  // Ensure activeGroupId stays valid
  useEffect(() => {
    if (groups.length > 0 && !groups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId(groups[0].id);
    } else if (groups.length === 0 && activeGroupId !== null) {
      setActiveGroupId(null);
    }
  }, [groups, activeGroupId]);

  const updateActiveGroup = (updater: (group: Group) => Group) => {
    if (!activeGroup) return;
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroup.id ? updater(g) : g))
    );
  };

  // Group handlers
  const handleSaveGroup = (payload: {
    name: string;
    description: string;
    kind: GroupKind;
    currency: Currency;
    participantNames: string[];
  }) => {
    if (groupModalMode === 'edit' && activeGroup) {
      updateActiveGroup((g) => ({
        ...g,
        name: payload.name,
        description: payload.description || undefined,
        kind: payload.kind,
        currency: payload.currency,
      }));
      setGroupModalMode(null);
      return;
    }

    const newGroup: Group = {
      id: createId('grp'),
      name: payload.name,
      description: payload.description || undefined,
      kind: payload.kind,
      currency: payload.currency,
      participants: payload.participantNames.map((name) => ({
        id: createId('m'),
        name,
      })),
      expenses: [],
      settlements: [],
      createdAt: new Date().toISOString(),
    };

    setGroups((prev) => [newGroup, ...prev]);
    setActiveGroupId(newGroup.id);
    setActiveTab('expenses');
    setGroupModalMode(null);
  };

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    setGroups((prev) => prev.filter((g) => g.id !== activeGroup.id));
    setActiveTab('expenses');
  };

  // Participant handlers
  const handleAddParticipant = (name: string) => {
    updateActiveGroup((g) => ({
      ...g,
      participants: [...g.participants, { id: createId('m'), name }],
    }));
  };

  const handleRenameParticipant = (participantId: string, name: string) => {
    updateActiveGroup((g) => ({
      ...g,
      participants: g.participants.map((p) =>
        p.id === participantId ? { ...p, name } : p
      ),
    }));
  };

  const handleRemoveParticipant = (participantId: string) => {
    updateActiveGroup((g) => ({
      ...g,
      participants: g.participants.filter((p) => p.id !== participantId),
    }));
  };

  // Expense handlers
  const handleSaveExpense = (data: {
    id?: string;
    title: string;
    amountCents: number;
    paidById: string;
    date: string;
    category: ExpenseCategory;
    splitType: SplitType;
    shares: ExpenseShare[];
    note?: string;
  }) => {
    if (data.id) {
      updateActiveGroup((g) => ({
        ...g,
        expenses: g.expenses.map((exp) =>
          exp.id === data.id
            ? {
                ...exp,
                title: data.title,
                amountCents: data.amountCents,
                paidById: data.paidById,
                date: data.date,
                category: data.category,
                splitType: data.splitType,
                shares: data.shares,
                note: data.note,
              }
            : exp
        ),
      }));
    } else {
      const newExpense: Expense = {
        id: createId('exp'),
        title: data.title,
        amountCents: data.amountCents,
        paidById: data.paidById,
        date: data.date,
        category: data.category,
        splitType: data.splitType,
        shares: data.shares,
        note: data.note,
        createdAt: new Date().toISOString(),
      };
      updateActiveGroup((g) => ({
        ...g,
        expenses: [newExpense, ...g.expenses],
      }));
    }
    setExpenseModalState({ open: false, editing: null });
  };

  const handleDeleteExpense = (expenseId: string) => {
    updateActiveGroup((g) => ({
      ...g,
      expenses: g.expenses.filter((e) => e.id !== expenseId),
    }));
  };

  // Settlement handlers
  const handleSaveSettlement = (payload: {
    fromId: string;
    toId: string;
    amountCents: number;
    date: string;
    note?: string;
  }) => {
    updateActiveGroup((g) => ({
      ...g,
      settlements: [
        {
          id: createId('stl'),
          fromId: payload.fromId,
          toId: payload.toId,
          amountCents: payload.amountCents,
          date: payload.date,
          note: payload.note,
          createdAt: new Date().toISOString(),
        },
        ...g.settlements,
      ],
    }));
    setSettlementModalState({ open: false, prefill: null });
  };

  const handleQuickSettle = (transfer: DebtTransfer) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;

    handleSaveSettlement({
      fromId: transfer.fromId,
      toId: transfer.toId,
      amountCents: transfer.amountCents,
      date: today,
      note: 'Rozliczenie salda',
    });
  };

  const handleDeleteSettlement = (settlementId: string) => {
    updateActiveGroup((g) => ({
      ...g,
      settlements: g.settlements.filter((s) => s.id !== settlementId),
    }));
  };

  // JSON Export / Import / Reset
  const handleExportData = () => {
    const blob = new Blob([JSON.stringify(groups, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `porowno-rozliczenia-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (
        !Array.isArray(parsed) ||
        !parsed.every(
          (item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            Array.isArray(item.participants) &&
            Array.isArray(item.expenses)
        )
      ) {
        setImportError('Nieprawidłowy format pliku JSON.');
        return;
      }
      setGroups(parsed);
      setActiveGroupId(parsed[0]?.id ?? null);
      setImportError(null);
    } catch {
      setImportError('Nie udało się wczytać pliku JSON.');
    }
  };

  const handleResetSampleData = () => {
    const seeded = createSeedGroups();
    setGroups(seeded);
    setActiveGroupId(seeded[0]?.id ?? null);
    setActiveTab('expenses');
    setImportError(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        groups={groups}
        activeGroupId={activeGroup?.id ?? null}
        onSelectGroup={(id) => {
          setActiveGroupId(id);
          setActiveTab('expenses');
        }}
        onOpenNewGroup={() => setGroupModalMode('create')}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetSampleData={handleResetSampleData}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        importError={importError}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeGroup={activeGroup}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAddExpense={() => setExpenseModalState({ open: true, editing: null })}
          onOpenSettlement={() => setSettlementModalState({ open: true, prefill: null })}
        />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {!activeGroup ? (
            <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="mt-4 font-display text-xl font-semibold text-slate-900">
                Utwórz pierwszą grupę znajomych
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Dodaj uczestników wyjazdu, wspólnego mieszkania lub imprezy, zapisuj rachunki i
                sprawdź kto komu ile powinien oddać.
              </p>
              <button
                type="button"
                onClick={() => setGroupModalMode('create')}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nowa grupa</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
                    {activeGroup.name}
                  </h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                    <span>{GROUP_KIND_LABELS[activeGroup.kind]}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeGroup.participants.length}{' '}
                      {activeGroup.participants.length === 1 ? 'uczestnik' : 'uczestników'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-xs text-slate-600">
                      {CURRENCY_META[activeGroup.currency].symbol} ({activeGroup.currency})
                    </span>
                    {activeGroup.description && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-600">{activeGroup.description}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile quick settlement trigger */}
                <button
                  type="button"
                  onClick={() => setSettlementModalState({ open: true, prefill: null })}
                  disabled={activeGroup.participants.length < 2}
                  className="inline-flex sm:hidden items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>Zarejestruj zwrot</span>
                </button>
              </div>

              {/* 4-Column KPI Strip */}
              <KpiStrip group={activeGroup} />

              {/* Workspace Tabs */}
              <div className="border-b border-slate-200">
                <nav aria-label="Widoki grupy" className="-mb-px flex gap-6 overflow-x-auto">
                  {(
                    [
                      {
                        id: 'expenses',
                        label: `Rachunki (${activeGroup.expenses.length})`,
                      },
                      { id: 'balances', label: 'Salda i przelewy' },
                      {
                        id: 'members',
                        label: `Uczestnicy (${activeGroup.participants.length})`,
                      },
                    ] as const
                  ).map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`border-b-2 pb-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Active View */}
              {activeTab === 'expenses' && (
                <ExpenseList
                  group={activeGroup}
                  onAddExpense={() => setExpenseModalState({ open: true, editing: null })}
                  onEditExpense={(exp) =>
                    setExpenseModalState({ open: true, editing: exp })
                  }
                  onDeleteExpense={handleDeleteExpense}
                  onDeleteSettlement={handleDeleteSettlement}
                />
              )}

              {activeTab === 'balances' && (
                <BalancesView
                  group={activeGroup}
                  onQuickSettle={handleQuickSettle}
                  onOpenCustomSettlement={() =>
                    setSettlementModalState({ open: true, prefill: null })
                  }
                />
              )}

              {activeTab === 'members' && (
                <MembersView
                  group={activeGroup}
                  onAddParticipant={handleAddParticipant}
                  onRenameParticipant={handleRenameParticipant}
                  onRemoveParticipant={handleRemoveParticipant}
                  onEditGroup={() => setGroupModalMode('edit')}
                  onDeleteGroup={handleDeleteGroup}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {groupModalMode && (
        <GroupModal
          initialGroup={groupModalMode === 'edit' ? activeGroup : null}
          onClose={() => setGroupModalMode(null)}
          onSave={handleSaveGroup}
        />
      )}

      {expenseModalState.open && activeGroup && (
        <ExpenseModal
          group={activeGroup}
          initialExpense={expenseModalState.editing}
          onClose={() => setExpenseModalState({ open: false, editing: null })}
          onSave={handleSaveExpense}
        />
      )}

      {settlementModalState.open && activeGroup && (
        <SettlementModal
          group={activeGroup}
          prefill={settlementModalState.prefill}
          onClose={() => setSettlementModalState({ open: false, prefill: null })}
          onSave={handleSaveSettlement}
        />
      )}
    </div>
  );
}
