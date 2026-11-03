"""
SplitUs - Klasy domenowe aplikacji do podziału wydatków grupowych.

Diagram UML:
  Uzytkownik ←─ zawiera ─── Grupa
       ↑                       │
       │ dotyczy (dluznik)     │ zarządza
       │                       ▼
  PodzialWydatku      MenedzerRozliczen ───→ Wydatek ──→ PodzialWydatku
       ↑                       │
       │                       │ rejestruje
       └───── platnik/odbiorca─▼
                            Splata
"""
from __future__ import annotations

import hashlib
import os
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional


# ---------------------------------------------------------------------------
# Uzytkownik
# ---------------------------------------------------------------------------
class Uzytkownik:
    """Reprezentuje użytkownika systemu.

    Atrybuty:
        imie (str): Imię i nazwisko użytkownika.
        haslo (str): Zahaszowane hasło (prywatne).
        adres_email (str): Adres e-mail (unikalny identyfikator).
    """

    def __init__(self, imie: str, adres_email: str, haslo: str) -> None:
        self.imie: str = imie
        self.adres_email: str = adres_email
        self.__haslo: str = self._hashuj(haslo)

    # ------------------------------------------------------------------
    # Metody prywatne
    # ------------------------------------------------------------------
    @staticmethod
    def _hashuj(haslo: str) -> str:
        """Hashuje hasło za pomocą SHA-256 z losową solą."""
        sol = os.urandom(16).hex()
        skrot = hashlib.sha256(f"{sol}{haslo}".encode()).hexdigest()
        return f"{sol}:{skrot}"

    # ------------------------------------------------------------------
    # Interfejs publiczny
    # ------------------------------------------------------------------
    def ustaw_haslo(self, nowe_haslo: str) -> None:
        """Ustawia nowe hasło po zahaszowaniu."""
        if len(nowe_haslo) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków.")
        self.__haslo = self._hashuj(nowe_haslo)

    def pobierz_haslo(self) -> str:
        """Zwraca zahaszowaną postać hasła (np. do zapisu w bazie)."""
        return self.__haslo

    def zaloguj(self, haslo: str) -> bool:
        """Weryfikuje podane hasło. Zwraca True gdy poprawne."""
        sol, skrot = self.__haslo.split(":", 1)
        return hashlib.sha256(f"{sol}{haslo}".encode()).hexdigest() == skrot

    def resetuj_haslo(self) -> str:
        """Generuje tymczasowe hasło jednorazowe i ustawia je."""
        tymczasowe = os.urandom(6).hex()  # 12-znakowy hex
        self.__haslo = self._hashuj(tymczasowe)
        return tymczasowe  # należy wysłać e-mailem

    def __repr__(self) -> str:
        return f"Uzytkownik(imie={self.imie!r}, email={self.adres_email!r})"


# ---------------------------------------------------------------------------
# Grupa
# ---------------------------------------------------------------------------
class Grupa:
    """Reprezentuje grupę użytkowników dzielących wydatki.

    Relacje:
        - zawiera → Uzytkownik (lista członków)
        - zarządza → MenedzerRozliczen (1:1)
    """

    def __init__(self, nazwa: str) -> None:
        self.nazwa: str = nazwa
        self.data_utworzenia: date = date.today()
        self._czlonkowie: List[Uzytkownik] = []
        self.menedzer: Optional[MenedzerRozliczen] = None

    # ------------------------------------------------------------------
    def dodaj_uzytkownika(self, uzytkownik: Uzytkownik) -> None:
        """Dodaje użytkownika do grupy (jeśli jeszcze nie należy)."""
        emaile = [u.adres_email for u in self._czlonkowie]
        if uzytkownik.adres_email in emaile:
            raise ValueError(
                f"{uzytkownik.imie} już należy do grupy '{self.nazwa}'."
            )
        self._czlonkowie.append(uzytkownik)

    def usun_uzytkownika(self, uzytkownik: Uzytkownik) -> None:
        """Usuwa użytkownika z grupy."""
        self._czlonkowie = [
            u for u in self._czlonkowie
            if u.adres_email != uzytkownik.adres_email
        ]

    def pobierz_czlonkow(self) -> List[Uzytkownik]:
        """Zwraca kopię listy członków grupy."""
        return list(self._czlonkowie)

    def __repr__(self) -> str:
        return (
            f"Grupa(nazwa={self.nazwa!r}, "
            f"czlonkowie={len(self._czlonkowie)}, "
            f"utworzona={self.data_utworzenia})"
        )


# ---------------------------------------------------------------------------
# PodzialWydatku
# ---------------------------------------------------------------------------
class PodzialWydatku:
    """Reprezentuje udział konkretnego użytkownika w wydatku.

    Relacje:
        - uzytkownik → Uzytkownik (dłużnik)
        - wydatek    → Wydatek (nadrzędny wydatek)
    """

    def __init__(
        self,
        uzytkownik: Uzytkownik,
        kwota_do_oddania: Decimal,
    ) -> None:
        self.uzytkownik: Uzytkownik = uzytkownik
        self.kwota_do_oddania: Decimal = Decimal(str(kwota_do_oddania))

    def pobierz_udzial(self) -> dict:
        """Zwraca słownik z danymi udziału."""
        return {
            "uzytkownik": self.uzytkownik.imie,
            "email": self.uzytkownik.adres_email,
            "kwota_do_oddania": float(self.kwota_do_oddania),
        }

    def __repr__(self) -> str:
        return (
            f"PodzialWydatku(uzytkownik={self.uzytkownik.imie!r}, "
            f"kwota={self.kwota_do_oddania})"
        )


# ---------------------------------------------------------------------------
# Wydatek
# ---------------------------------------------------------------------------
class Wydatek:
    """Reprezentuje pojedynczy wydatek w grupie.

    Atrybuty:
        tytul (str): Opis wydatku.
        kwota (Decimal): Całkowita kwota.
        data (date): Data poniesienia wydatku.
        platnik (Uzytkownik): Kto zapłacił.
        status (str): 'otwarty' | 'rozliczony'.

    Relacje:
        - dzieli się na → PodzialWydatku (lista)
    """

    STATUSY = ("otwarty", "rozliczony")

    def __init__(
        self,
        tytul: str,
        kwota: Decimal,
        platnik: Uzytkownik,
        data: Optional[date] = None,
    ) -> None:
        self.tytul: str = tytul
        self.kwota: Decimal = Decimal(str(kwota))
        self.platnik: Uzytkownik = platnik
        self.data: date = data or date.today()
        self.status: str = "otwarty"
        self._podzial: List[PodzialWydatku] = []

        self.waliduj_kwote()

    # ------------------------------------------------------------------
    def waliduj_kwote(self) -> None:
        """Zgłasza wyjątek gdy kwota jest nieprawidłowa."""
        if self.kwota <= 0:
            raise ValueError("Kwota wydatku musi być dodatnia.")

    def edytuj_wydatek(
        self,
        tytul: Optional[str] = None,
        kwota: Optional[Decimal] = None,
        data: Optional[date] = None,
    ) -> None:
        """Aktualizuje dane wydatku. Resetuje podział po zmianie kwoty."""
        if tytul is not None:
            self.tytul = tytul
        if kwota is not None:
            self.kwota = Decimal(str(kwota))
            self.waliduj_kwote()
            self._podzial = []  # podział wymaga przeliczenia
        if data is not None:
            self.data = data

    def dodaj_podzial(self, podzial: PodzialWydatku) -> None:
        """Dodaje pozycję podziału do wydatku."""
        self._podzial.append(podzial)

    def pobierz_podzial(self) -> List[PodzialWydatku]:
        return list(self._podzial)

    def __repr__(self) -> str:
        return (
            f"Wydatek(tytul={self.tytul!r}, kwota={self.kwota}, "
            f"platnik={self.platnik.imie!r}, status={self.status!r})"
        )


# ---------------------------------------------------------------------------
# Splata
# ---------------------------------------------------------------------------
class Splata:
    """Reprezentuje spłatę długu między dwoma użytkownikami.

    Atrybuty:
        platnik (Uzytkownik): Kto oddaje pieniądze.
        odbiorca (Uzytkownik): Kto otrzymuje pieniądze.
        kwota (Decimal): Kwota spłaty.
        data (date): Data spłaty.
        uregulowana (bool): Czy spłata jest potwierdzona.
    """

    def __init__(
        self,
        platnik: Uzytkownik,
        odbiorca: Uzytkownik,
        kwota: Decimal,
        data: Optional[date] = None,
    ) -> None:
        self.platnik: Uzytkownik = platnik
        self.odbiorca: Uzytkownik = odbiorca
        self.kwota: Decimal = Decimal(str(kwota))
        self.data: date = data or date.today()
        self.uregulowana: bool = False

        self.waliduj()

    # ------------------------------------------------------------------
    def waliduj(self) -> None:
        """Sprawdza poprawność spłaty."""
        if self.kwota <= 0:
            raise ValueError("Kwota spłaty musi być dodatnia.")
        if self.platnik.adres_email == self.odbiorca.adres_email:
            raise ValueError("Płatnik i odbiorca nie mogą być tą samą osobą.")

    def oznacz_jako_uregulowany(self) -> None:
        """Oznacza spłatę jako potwierdzoną/rozliczoną."""
        self.uregulowana = True

    def __repr__(self) -> str:
        status = "✓" if self.uregulowana else "⏳"
        return (
            f"Splata({status} {self.platnik.imie!r} → "
            f"{self.odbiorca.imie!r}, {self.kwota} PLN, {self.data})"
        )


# ---------------------------------------------------------------------------
# MenedzerRozliczen
# ---------------------------------------------------------------------------
class MenedzerRozliczen:
    """Zarządza rozliczeniami finansowymi grupy.

    Przechowuje wydatki i spłaty, przelicza bilanse,
    optymalizuje liczbę potrzebnych transakcji.

    Relacje:
        - zarządza → Wydatek (lista)
        - rejestruje → Splata (lista)
        - należy do → Grupa (1:1)
    """

    def __init__(self, grupa: Grupa) -> None:
        self.grupa: Grupa = grupa
        self.wydatki: List[Wydatek] = []
        self.splaty: List[Splata] = []

    # ------------------------------------------------------------------
    def dodaj_wydatek(self, wydatek: Wydatek) -> None:
        """Dodaje wydatek do rozliczeń grupy."""
        czlonkowie = self.grupa.pobierz_czlonkow()
        if wydatek.platnik not in czlonkowie:
            raise ValueError(
                f"{wydatek.platnik.imie} nie jest członkiem grupy."
            )
        self.wydatki.append(wydatek)

    def pobierz_historie_operacji(self) -> dict:
        """Zwraca pełną historię wydatków i spłat grupy."""
        return {
            "wydatki": [
                {
                    "tytul": w.tytul,
                    "kwota": float(w.kwota),
                    "platnik": w.platnik.imie,
                    "data": str(w.data),
                    "status": w.status,
                }
                for w in self.wydatki
            ],
            "splaty": [
                {
                    "platnik": s.platnik.imie,
                    "odbiorca": s.odbiorca.imie,
                    "kwota": float(s.kwota),
                    "data": str(s.data),
                    "uregulowana": s.uregulowana,
                }
                for s in self.splaty
            ],
        }

    def przelicz_bilans(self) -> dict[str, Decimal]:
        """Oblicza saldo netto każdego członka grupy.

        Dodatnie saldo = inni są winni tej osobie.
        Ujemne saldo   = ta osoba jest winna innym.

        Returns:
            Słownik {email: saldo} dla każdego członka.
        """
        czlonkowie = self.grupa.pobierz_czlonkow()
        bilans: dict[str, Decimal] = {
            u.adres_email: Decimal("0") for u in czlonkowie
        }

        # Uwzględnij wydatki
        for wydatek in self.wydatki:
            email_platnika = wydatek.platnik.adres_email
            if email_platnika in bilans:
                bilans[email_platnika] += wydatek.kwota
            for podzial in wydatek.pobierz_podzial():
                email_dluznika = podzial.uzytkownik.adres_email
                if email_dluznika in bilans:
                    bilans[email_dluznika] -= podzial.kwota_do_oddania

        # Uwzględnij spłaty (uregulowane lub nie)
        for splata in self.splaty:
            ep = splata.platnik.adres_email
            eo = splata.odbiorca.adres_email
            if ep in bilans:
                bilans[ep] -= splata.kwota
            if eo in bilans:
                bilans[eo] += splata.kwota

        return bilans

    def optymalizuj_dlugi(self) -> List[dict]:
        """Wyznacza minimalny zestaw transakcji do rozliczenia grupy.

        Algorytm zachłanny (greedy):
          1. Oblicz bilanse.
          2. Sortuj wierzycieli (saldo > 0) i dłużników (saldo < 0).
          3. Łącz największego wierzyciela z największym dłużnikiem.

        Returns:
            Lista transakcji: [{"od": email, "do": email, "kwota": float}]
        """
        bilans = self.przelicz_bilans()
        czlonkowie = {u.adres_email: u for u in self.grupa.pobierz_czlonkow()}

        wierzyciele = sorted(
            [(e, s) for e, s in bilans.items() if s > 0],
            key=lambda x: -x[1],
        )
        dluznici = sorted(
            [(e, -s) for e, s in bilans.items() if s < 0],
            key=lambda x: -x[1],
        )

        transakcje = []
        wi, di = 0, 0

        wierzyciele = [[e, s] for e, s in wierzyciele]
        dluznici = [[e, s] for e, s in dluznici]

        while wi < len(wierzyciele) and di < len(dluznici):
            wierzyciel_email, naleznosc = wierzyciele[wi]
            dluznik_email, dlug = dluznici[di]

            kwota = min(naleznosc, dlug)
            transakcje.append(
                {
                    "od": czlonkowie[dluznik_email].imie,
                    "do": czlonkowie[wierzyciel_email].imie,
                    "od_email": dluznik_email,
                    "do_email": wierzyciel_email,
                    "kwota": float(kwota),
                }
            )

            wierzyciele[wi][1] -= kwota
            dluznici[di][1] -= kwota

            if wierzyciele[wi][1] == 0:
                wi += 1
            if dluznici[di][1] == 0:
                di += 1

        return transakcje

    def zarejestruj_splate(self, splata: Splata) -> None:
        """Rejestruje spłatę w systemie."""
        self.splaty.append(splata)

    def __repr__(self) -> str:
        return (
            f"MenedzerRozliczen(grupa={self.grupa.nazwa!r}, "
            f"wydatki={len(self.wydatki)}, splaty={len(self.splaty)})"
        )
