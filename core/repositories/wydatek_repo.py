"""
Repozytorium wydatków i podziałów.
Cała komunikacja z tabelami core_wydatek i core_podzialwydatku przez ten plik.
"""
from decimal import Decimal

from core.models import Grupa, MenedzerRozliczen, PodzialWydatku, Uzytkownik, Wydatek


class WydatekRepository:

    @staticmethod
    def stworz(
        grupa: Grupa,
        tytul: str,
        kwota: Decimal,
        platnik: Uzytkownik,
    ) -> Wydatek:
        """Tworzy wydatek i automatycznie dzieli go równo między członków grupy."""
        wydatek = Wydatek.objects.create(
            menedzer=grupa.menedzer,
            tytul=tytul,
            kwota=kwota,
            platnik=platnik,
        )
        # Równy podział między wszystkich oprócz płatnika
        czlonkowie = list(grupa.czlonkowie.exclude(pk=platnik.pk))
        if czlonkowie:
            kwota_na_osobe = round(kwota / (len(czlonkowie) + 1), 2)
            for czlonek in czlonkowie:
                PodzialWydatku.objects.create(
                    wydatek=wydatek,
                    uzytkownik=czlonek,
                    kwota_do_oddania=kwota_na_osobe,
                )
        return wydatek

    @staticmethod
    def pobierz_po_id(pk: int) -> Wydatek | None:
        """Zwraca wydatek po ID lub None."""
        return Wydatek.objects.select_related("platnik", "menedzer__grupa").filter(pk=pk).first()

    @staticmethod
    def pobierz_ostatnie(grupa: Grupa, ile: int = 10):
        """Zwraca ostatnie wydatki grupy."""
        return (
            grupa.menedzer.wydatki
            .select_related("platnik")
            .order_by("-data")[:ile]
        )

    @staticmethod
    def edytuj(wydatek: Wydatek, tytul: str = None, kwota: Decimal = None) -> None:
        """Aktualizuje dane wydatku."""
        wydatek.edytuj_wydatek(tytul=tytul, kwota=kwota)

    @staticmethod
    def usun(wydatek: Wydatek) -> None:
        """Usuwa wydatek i jego podziały (CASCADE)."""
        wydatek.delete()
