export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP' | 'CZK';

export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'accommodation'
  | 'entertainment'
  | 'utilities'
  | 'other';

export type GroupKind = 'trip' | 'home' | 'event' | 'friends';

export type SplitType = 'equal' | 'exact' | 'shares';

export interface Participant {
  id: string;
  name: string;
}

export interface ExpenseShare {
  participantId: string;
  amountCents: number;
  weight?: number;
}

export interface Expense {
  id: string;
  title: string;
  amountCents: number;
  paidById: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  splitType: SplitType;
  shares: ExpenseShare[];
  note?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  kind: GroupKind;
  currency: Currency;
  participants: Participant[];
  expenses: Expense[];
  settlements: Settlement[];
  createdAt: string;
}

export interface MemberBalance {
  participantId: string;
  name: string;
  totalPaidCents: number;
  totalShareCents: number;
  settlementsPaidCents: number;
  settlementsReceivedCents: number;
  /** Positive means owed money ("Otrzyma"), negative means owes money ("Do oddania") */
  netBalanceCents: number;
}

export interface DebtTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
}
