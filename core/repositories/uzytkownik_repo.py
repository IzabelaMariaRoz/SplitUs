"""
Repozytorium użytkowników.
Cała komunikacja z tabelą core_uzytkownik przez ten plik.
"""
from core.models import Uzytkownik


class UzytkownikRepository:

    @staticmethod
    def stworz(imie: str, adres_email: str, haslo: str) -> Uzytkownik:
        """Tworzy nowego użytkownika z zahashowanym hasłem."""
        return Uzytkownik.objects.create_user(
            adres_email=adres_email,
            imie=imie,
            password=haslo,
        )

    @staticmethod
    def pobierz_po_email(adres_email: str) -> Uzytkownik | None:
        """Zwraca użytkownika o podanym e-mailu lub None."""
        return Uzytkownik.objects.filter(adres_email=adres_email).first()

    @staticmethod
    def pobierz_po_id(pk: int) -> Uzytkownik | None:
        """Zwraca użytkownika o podanym ID lub None."""
        return Uzytkownik.objects.filter(pk=pk).first()

    @staticmethod
    def wszyscy() -> list:
        """Zwraca wszystkich użytkowników."""
        return list(Uzytkownik.objects.all())

    @staticmethod
    def istnieje(adres_email: str) -> bool:
        """Sprawdza czy użytkownik o danym e-mailu już istnieje."""
        return Uzytkownik.objects.filter(adres_email=adres_email).exists()

    @staticmethod
    def zmien_haslo(user: Uzytkownik, nowe_haslo: str) -> None:
        """Zmienia hasło użytkownika."""
        user.ustaw_haslo(nowe_haslo)

    @staticmethod
    def resetuj_haslo(user: Uzytkownik) -> str:
        """Resetuje hasło i zwraca nowe hasło jawne."""
        return user.resetuj_haslo()
