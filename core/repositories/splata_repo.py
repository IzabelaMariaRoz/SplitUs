"""
Repozytorium spłat.
Cała komunikacja z tabelą core_splata przez ten plik.
"""
from decimal import Decimal

from core.models import Grupa, Splata, Uzytkownik


class SplataRepository:

    @staticmethod
    def stworz(
        grupa: Grupa,
        platnik: Uzytkownik,
        odbiorca: Uzytkownik,
        kwota: Decimal,
    ) -> Splata:
        """Rejestruje nową spłatę po walidacji."""
        splata = Splata(
            menedzer=grupa.menedzer,
            platnik=platnik,
            odbiorca=odbiorca,
            kwota=kwota,
        )
        splata.waliduj()
        splata.save()
        return splata

    @staticmethod
    def pobierz_po_id(pk: int) -> Splata | None:
        """Zwraca spłatę po ID lub None."""
        return Splata.objects.select_related(
            "platnik", "odbiorca", "menedzer__grupa"
        ).filter(pk=pk).first()

    @staticmethod
    def pobierz_ostatnie(grupa: Grupa, ile: int = 5):
        """Zwraca ostatnie spłaty grupy."""
        return (
            grupa.menedzer.splaty
            .select_related("platnik", "odbiorca")
            .order_by("-data")[:ile]
        )

    @staticmethod
    def oznacz_uregulowana(splata: Splata) -> None:
        """Oznacza spłatę jako uregulowaną."""
        splata.oznacz_jako_uregulowany()

    @staticmethod
    def usun(splata: Splata) -> None:
        """Usuwa spłatę."""
        splata.delete()
