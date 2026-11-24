import React, { useRef } from 'react';
import {
  Compass,
  Download,
  Home,
  PartyPopper,
  Plus,
  RotateCcw,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Group, GroupKind } from '../types/bills';
import { formatMoney, getGroupTotalSpendCents } from '../utils/calculations';

interface SidebarProps {
  groups: Group[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onOpenNewGroup: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetSampleData: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  importError: string | null;
}

function GroupKindIcon({ kind }: { kind: GroupKind }) {
  switch (kind) {
    case 'trip':
      return <Compass className="h-4 w-4 shrink-0" />;
    case 'home':
      return <Home className="h-4 w-4 shrink-0" />;
    case 'event':
      return <PartyPopper className="h-4 w-4 shrink-0" />;
    default:
      return <Users className="h-4 w-4 shrink-0" />;
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  activeGroupId,
  onSelectGroup,
  onOpenNewGroup,
  onExportData,
  onImportData,
  onResetSampleData,
  mobileOpen,
  onCloseMobile,
  importError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
      e.target.value = '';
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Brand mark */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          SplitUs
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Zamknij menu"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Create Group CTA */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            onOpenNewGroup();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Nowa grupa</span>
        </button>
      </div>

      {/* Group list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="px-2 pb-2 text-xs font-medium text-slate-500">
          Twoje grupy ({groups.length})
        </div>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
            Brak grup. Utwórz pierwszą grupę, aby zacząć dodawać rachunki.
          </div>
        ) : (
          <nav aria-label="Lista grup" className="space-y-1">
            {groups.map((group) => {
              const isActive = group.id === activeGroupId;
              const totalSpend = getGroupTotalSpendCents(group);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    onSelectGroup(group.id);
                    onCloseMobile();
                  }}
                  className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                      isActive
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:bg-white'
                    }`}
                  >
                    <GroupKindIcon kind={group.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {group.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{group.participants.length} os.</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums truncate">
                        {formatMoney(totalSpend, group.currency)}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bottom utility actions */}
      <div className="border-t border-slate-200 p-4 space-y-2">
        {importError && (
          <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            {importError}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportData}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Eksportuj</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span>Importuj</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <button
          type="button"
          onClick={onResetSampleData}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span>Przywróć dane przykładowe</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block lg:w-[272px] lg:shrink-0">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
