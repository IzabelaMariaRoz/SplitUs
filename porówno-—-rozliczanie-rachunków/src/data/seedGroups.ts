import { Group } from '../types/bills';
import { calculateEqualShares } from '../utils/calculations';

export const STORAGE_KEY = 'porowno_groups_v1';

export function createSeedGroups(): Group[] {
  const tatryMembers = [
    { id: 'm_kasia', name: 'Kasia' },
    { id: 'm_tomek', name: 'Tomek' },
    { id: 'm_michal', name: 'Michał' },
    { id: 'm_ola', name: 'Ola' },
  ];
  const tatryIds = tatryMembers.map((m) => m.id);

  const flatMembers = [
    { id: 'm_ania', name: 'Ania' },
    { id: 'm_piotr', name: 'Piotr' },
    { id: 'm_zuzia', name: 'Zuzia' },
  ];
  const flatIds = flatMembers.map((m) => m.id);

  return [
    {
      id: 'grp_tatry',
      name: 'Wyjazd w Tatry',
      description: 'Długi weekend w Zakopanem — domek, paliwo i kolacje.',
      kind: 'trip',
      currency: 'PLN',
      participants: tatryMembers,
      expenses: [
        {
          id: 'exp_1',
          title: 'Nocleg — Domek na Cyrhli (3 noce)',
          amountCents: 184000,
          paidById: 'm_kasia',
          date: '2026-11-12',
          category: 'accommodation',
          splitType: 'equal',
          shares: calculateEqualShares(184000, tatryIds),
          note: 'Zaliczka i dopłata na miejscu za cały domek',
          createdAt: '2026-11-12T18:20:00Z',
        },
        {
          id: 'exp_2',
          title: 'Paliwo Orlen (trasa tam i z powrotem)',
          amountCents: 38640,
          paidById: 'm_tomek',
          date: '2026-11-13',
          category: 'transport',
          splitType: 'equal',
          shares: calculateEqualShares(38640, tatryIds),
          createdAt: '2026-11-13T10:15:00Z',
        },
        {
          id: 'exp_3',
          title: 'Zakupy spożywcze na śniadania',
          amountCents: 24580,
          paidById: 'm_ola',
          date: '2026-11-13',
          category: 'groceries',
          splitType: 'equal',
          shares: calculateEqualShares(24580, tatryIds),
          createdAt: '2026-11-13T17:40:00Z',
        },
        {
          id: 'exp_4',
          title: 'Kolacja w Karczmie u Wnuka',
          amountCents: 41200,
          paidById: 'm_tomek',
          date: '2026-11-14',
          category: 'food',
          splitType: 'exact',
          shares: [
            { participantId: 'm_kasia', amountCents: 9800 },
            { participantId: 'm_tomek', amountCents: 11400 },
            { participantId: 'm_michal', amountCents: 11200 },
            { participantId: 'm_ola', amountCents: 8800 },
          ],
          note: 'Każdy płacił za swoje danie i napoje',
          createdAt: '2026-11-14T21:05:00Z',
        },
        {
          id: 'exp_5',
          title: 'Bilety wstępu do TPN i kolejka',
          amountCents: 22000,
          paidById: 'm_michal',
          date: '2026-11-15',
          category: 'entertainment',
          splitType: 'equal',
          shares: calculateEqualShares(22000, tatryIds),
          createdAt: '2026-11-15T09:10:00Z',
        },
      ],
      settlements: [
        {
          id: 'stl_1',
          fromId: 'm_michal',
          toId: 'm_kasia',
          amountCents: 30000,
          date: '2026-11-15',
          note: 'Przelew BLIK za część noclegu',
          createdAt: '2026-11-15T20:00:00Z',
        },
      ],
      createdAt: '2026-11-10T12:00:00Z',
    },
    {
      id: 'grp_mieszkanie',
      name: 'Mieszkanie ul. Lipowa',
      description: 'Wspólne rachunki za listopad, internet i chemię domową.',
      kind: 'home',
      currency: 'PLN',
      participants: flatMembers,
      expenses: [
        {
          id: 'exp_m1',
          title: 'Czynsz i zaliczki za media (listopad)',
          amountCents: 135000,
          paidById: 'm_ania',
          date: '2026-11-05',
          category: 'utilities',
          splitType: 'shares',
          shares: [
            { participantId: 'm_ania', amountCents: 54000, weight: 2 },
            { participantId: 'm_piotr', amountCents: 40500, weight: 1.5 },
            { participantId: 'm_zuzia', amountCents: 40500, weight: 1.5 },
          ],
          note: 'Podział proporcjonalny do metrażu pokoi',
          createdAt: '2026-11-05T11:00:00Z',
        },
        {
          id: 'exp_m2',
          title: 'Światłowód i TV',
          amountCents: 8997,
          paidById: 'm_piotr',
          date: '2026-11-08',
          category: 'utilities',
          splitType: 'equal',
          shares: calculateEqualShares(8997, flatIds),
          createdAt: '2026-11-08T14:22:00Z',
        },
        {
          id: 'exp_m3',
          title: 'Rossmann — kapsułki, papier, środki czystości',
          amountCents: 11460,
          paidById: 'm_zuzia',
          date: '2026-11-11',
          category: 'groceries',
          splitType: 'equal',
          shares: calculateEqualShares(11460, flatIds),
          createdAt: '2026-11-11T19:00:00Z',
        },
      ],
      settlements: [],
      createdAt: '2026-11-01T09:00:00Z',
    },
  ];
}

export function loadGroups(): Group[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedGroups();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return createSeedGroups();
  } catch {
    return createSeedGroups();
  }
}

export function saveGroups(groups: Group[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
