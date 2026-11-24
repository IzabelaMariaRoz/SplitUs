"""
Repozytorium zaproszeń.
Cała komunikacja z tabelą core_zaproszenie przez ten plik.
"""
from django.utils import timezone

from core.models import Grupa, Uzytkownik, Zaproszenie


class ZaproszenieRepository:

    @staticmethod
    def wyslij(grupa: Grupa, zapraszajacy: Uzytkownik, zaproszony: Uzytkownik) -> Zaproszenie:
        """Wysyła zaproszenie do grupy. Rzuca ValueError przy duplikacie."""
        if grupa.czlonkowie.filter(pk=zaproszony.pk).exists():
            raise ValueError(f"{zaproszony.imie} już należy do grupy.")

        istniejace = Zaproszenie.objects.filter(
            grupa=grupa,
            zaproszony=zaproszony,
        ).first()

        if istniejace:
            if istniejace.status == Zaproszenie.STATUS_OCZEKUJACE:
                raise ValueError(f"Zaproszenie do {zaproszony.imie} już zostało wysłane i oczekuje na akceptację.")
            
            # Jeśli zaproszenie było wcześniej odrzucone lub zaakceptowane (a użytkownik nie jest już w grupie),
            # odnawiamy zaproszenie
            istniejace.status = Zaproszenie.STATUS_OCZEKUJACE
            istniejace.zapraszajacy = zapraszajacy
            istniejace.data_wyslania = timezone.now()
            istniejace.data_odpowiedzi = None
            istniejace.save()
            return istniejace

        return Zaproszenie.objects.create(
            grupa=grupa,
            zapraszajacy=zapraszajacy,
            zaproszony=zaproszony,
        )

    @staticmethod
    def pobierz_po_id(pk: int) -> Zaproszenie | None:
        """Zwraca zaproszenie po ID lub None."""
        return Zaproszenie.objects.select_related(
            "grupa", "zapraszajacy", "zaproszony"
        ).filter(pk=pk).first()

    @staticmethod
    def pobierz_oczekujace(user: Uzytkownik):
        """Zwraca oczekujące zaproszenia dla użytkownika."""
        return (
            user.zaproszenia_otrzymane
            .filter(status=Zaproszenie.STATUS_OCZEKUJACE)
            .select_related("grupa", "zapraszajacy")
            .order_by("-data_wyslania")
        )

    @staticmethod
    def ile_oczekujacych(user: Uzytkownik) -> int:
        """Zwraca liczbę oczekujących zaproszeń."""
        return user.zaproszenia_otrzymane.filter(
            status=Zaproszenie.STATUS_OCZEKUJACE
        ).count()

    @staticmethod
    def akceptuj(zaproszenie: Zaproszenie) -> None:
        """Akceptuje zaproszenie i dodaje użytkownika do grupy."""
        zaproszenie.akceptuj()

    @staticmethod
    def odrzuc(zaproszenie: Zaproszenie) -> None:
        """Odrzuca zaproszenie."""
        zaproszenie.odrzuc()
