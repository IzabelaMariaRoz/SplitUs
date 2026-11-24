"""
Repozytorium grup i członków.
Cała komunikacja z tabelami core_grupa i core_czlonekgrupy przez ten plik.
"""
from core.models import Grupa, CzlonekGrupy, MenedzerRozliczen, Uzytkownik


class GrupaRepository:

    @staticmethod
    def stworz(nazwa: str, tworca: Uzytkownik) -> Grupa:
        """Tworzy grupę, dodaje twórcę jako członka i tworzy menedżera rozliczeń."""
        grupa = Grupa.objects.create(nazwa=nazwa, tworca=tworca)
        grupa.czlonkowie.add(tworca)
        MenedzerRozliczen.objects.create(grupa=grupa)
        return grupa

    @staticmethod
    def pobierz_po_id(pk: int) -> Grupa | None:
        """Zwraca grupę po ID lub None."""
        return Grupa.objects.filter(pk=pk).first()

    @staticmethod
    def pobierz_grupy_uzytkownika(user: Uzytkownik):
        """Zwraca QuerySet grup do których należy użytkownik."""
        return user.grupy.all().prefetch_related("czlonkowie")

    @staticmethod
    def pobierz_grupy_ze_statystykami(user: Uzytkownik):
        """Zwraca listę grup użytkownika z liczbą członków i łączną sumą wydatków (do Sidebara)."""
        grupy = user.grupy.all().prefetch_related("czlonkowie", "menedzer__wydatki")
        wynik = []
        for g in grupy:
            suma = 0
            if hasattr(g, "menedzer"):
                suma = sum(w.kwota for w in g.menedzer.wydatki.all())
            wynik.append({
                "grupa": g,
                "id": g.pk,
                "nazwa": g.nazwa,
                "czlonkowie_count": g.czlonkowie.count(),
                "suma_wydatkow": suma,
            })
        return wynik

    @staticmethod
    def usun(grupa: Grupa) -> None:
        """Usuwa grupę wraz z powiązanymi danymi (CASCADE)."""
        grupa.delete()

    @staticmethod
    def dodaj_czlonka(grupa: Grupa, uzytkownik: Uzytkownik) -> None:
        """Dodaje użytkownika do grupy."""
        grupa.dodaj_uzytkownika(uzytkownik)

    @staticmethod
    def usun_czlonka(grupa: Grupa, uzytkownik: Uzytkownik) -> None:
        """Usuwa użytkownika z grupy."""
        grupa.usun_uzytkownika(uzytkownik)

    @staticmethod
    def jest_czlonkiem(grupa: Grupa, uzytkownik: Uzytkownik) -> bool:
        """Sprawdza czy użytkownik należy do grupy."""
        return grupa.czlonkowie.filter(pk=uzytkownik.pk).exists()

    @staticmethod
    def pobierz_czlonkow(grupa: Grupa):
        """Zwraca QuerySet członków grupy."""
        return grupa.czlonkowie.all()
