import React from 'react';
import { ArrowRightLeft, Menu, Plus } from 'lucide-react';
import { Group } from '../types/bills';

interface TopBarProps {
  activeGroup: Group | null;
  onOpenMobileMenu: () => void;
  onOpenAddExpense: () => void;
  onOpenSettlement: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeGroup,
  onOpenMobileMenu,
  onOpenAddExpense,
  onOpenSettlement,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      {/* Left: Mobile menu button + Contextual Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Otwórz listę grup"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden shrink-0 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Ścieżka nawigacji" className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-medium text-slate-500 whitespace-nowrap shrink-0">Grupy</span>
          {activeGroup && (
            <>
              <span className="text-slate-300 shrink-0" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-slate-900">
                {activeGroup.name}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Primary Actions */}
      {activeGroup && (
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSettlement}
            disabled={activeGroup.participants.length < 2}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4 shrink-0" />
            <span>Zarejestruj zwrot</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddExpense}
            disabled={activeGroup.participants.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Dodaj rachunek</span>
          </button>
        </div>
      )}
    </header>
  );
};
