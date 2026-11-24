"""
Model Wydatku i PodzialWydatku.

Diagram UML:
    Wydatek — tytul, kwota, data, platnik, status
    Metody: waliduj_kwote(), edytuj_wydatek()
    Relacje: dzieli się na → PodzialWydatku

    PodzialWydatku — uzytkownik, kwota_do_oddania
    Metody: pobierz_udzial()
"""
from decimal import Decimal

from django.db import models

from .uzytkownik import Uzytkownik


class Wydatek(models.Model):
    """Wydatek poniesiony przez jednego z członków grupy.

    Pola (z diagramu UML):
        tytul   → CharField
        kwota   → DecimalField
        data    → DateField
        platnik → FK do Uzytkownik
        status  → CharField ('otwarty' | 'rozliczony')

    Relacje:
        - należy do → MenedzerRozliczen (FK)
        - dzieli się na → PodzialWydatku (reverse FK)
    """

    STATUS_OTWARTY = "otwarty"
    STATUS_ROZLICZONY = "rozliczony"
    STATUS_CHOICES = [
        (STATUS_OTWARTY, "Otwarty"),
        (STATUS_ROZLICZONY, "Rozliczony"),
    ]

    # Uwaga: FK do MenedzerRozliczen definiowany przez string żeby uniknąć
    # cyklicznego importu (MenedzerRozliczen importuje Wydatek)
    menedzer = models.ForeignKey(
        "MenedzerRozliczen",
        on_delete=models.CASCADE,
        related_name="wydatki",
        verbose_name="Menedżer rozliczeń",
    )
    tytul = models.CharField("Tytuł", max_length=255)
    kwota = models.DecimalField("Kwota (PLN)", max_digits=10, decimal_places=2)
    data = models.DateField("Data", auto_now_add=True)
    platnik = models.ForeignKey(
        Uzytkownik,
        on_delete=models.PROTECT,
        related_name="wydatki_oplacone",
        verbose_name="Płatnik",
    )
    status = models.CharField(
        "Status", max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_OTWARTY,
    )

    class Meta:
        verbose_name = "Wydatek"
        verbose_name_plural = "Wydatki"
        ordering = ["-data"]

    # ------------------------------------------------------------------
    # Metody z diagramu UML
    # ------------------------------------------------------------------
    def waliduj_kwote(self) -> None:
        """Zgłasza ValueError gdy kwota jest nieprawidłowa."""
        if self.kwota <= 0:
            raise ValueError("Kwota wydatku musi być dodatnia.")

    def edytuj_wydatek(
        self,
        tytul: str = None,
        kwota: Decimal = None,
        data=None,
    ) -> None:
        """Aktualizuje pola wydatku i zapisuje.
        Resetuje podział jeśli zmieniono kwotę.
        """
        if tytul is not None:
            self.tytul = tytul
        if kwota is not None:
            self.kwota = Decimal(str(kwota))
            self.waliduj_kwote()
            self.podzial.all().delete()
        if data is not None:
            self.data = data
        self.save()

    def __str__(self) -> str:
        return f"{self.tytul} — {self.kwota} PLN ({self.platnik.imie})"


class PodzialWydatku(models.Model):
    """Udział użytkownika w danym wydatku (kwota do oddania płatnikowi).

    Pola (z diagramu UML):
        uzytkownik       → FK do Uzytkownik (dłużnik)
        kwota_do_oddania → DecimalField

    Relacje:
        - dotyczy → Wydatek (ForeignKey)
    """

    wydatek = models.ForeignKey(
        Wydatek,
        on_delete=models.CASCADE,
        related_name="podzial",
        verbose_name="Wydatek",
    )
    uzytkownik = models.ForeignKey(
        Uzytkownik,
        on_delete=models.CASCADE,
        related_name="udzialy",
        verbose_name="Użytkownik (dłużnik)",
    )
    kwota_do_oddania = models.DecimalField(
        "Kwota do oddania (PLN)", max_digits=10, decimal_places=2
    )

    class Meta:
        verbose_name = "Podział wydatku"
        verbose_name_plural = "Podziały wydatków"
        unique_together = ("wydatek", "uzytkownik")

    # ------------------------------------------------------------------
    # Metody z diagramu UML
    # ------------------------------------------------------------------
    def pobierz_udzial(self) -> dict:
        """Zwraca słownik z danymi udziału."""
        return {
            "uzytkownik": self.uzytkownik.imie,
            "email": self.uzytkownik.adres_email,
            "kwota_do_oddania": float(self.kwota_do_oddania),
        }

    def __str__(self) -> str:
        return (
            f"{self.uzytkownik.imie} owes "
            f"{self.kwota_do_oddania} PLN "
            f"(wydatek: {self.wydatek.tytul})"
        )
