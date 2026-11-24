"""
Model Splaty między użytkownikami.

Diagram UML:
    Splata — platnik, odbiorca, kwota, data
    Metody: waliduj(), oznacz_jako_uregulowany()
    Relacje: rejestrowana przez → MenedzerRozliczen
"""
from django.db import models

from .uzytkownik import Uzytkownik


class Splata(models.Model):
    """Bezpośrednia spłata długu między dwoma użytkownikami.

    Pola (z diagramu UML):
        platnik     → FK do Uzytkownik (kto oddaje)
        odbiorca    → FK do Uzytkownik (kto otrzymuje)
        kwota       → DecimalField
        data        → DateField
        uregulowana → BooleanField

    Relacje:
        - rejestrowana przez → MenedzerRozliczen (FK)
    """

    menedzer = models.ForeignKey(
        "MenedzerRozliczen",
        on_delete=models.CASCADE,
        related_name="splaty",
        verbose_name="Menedżer rozliczeń",
    )
    platnik = models.ForeignKey(
        Uzytkownik,
        on_delete=models.PROTECT,
        related_name="splaty_wyslane",
        verbose_name="Płatnik",
    )
    odbiorca = models.ForeignKey(
        Uzytkownik,
        on_delete=models.PROTECT,
        related_name="splaty_otrzymane",
        verbose_name="Odbiorca",
    )
    kwota = models.DecimalField("Kwota (PLN)", max_digits=10, decimal_places=2)
    data = models.DateField("Data", auto_now_add=True)
    uregulowana = models.BooleanField("Uregulowana", default=False)

    class Meta:
        verbose_name = "Spłata"
        verbose_name_plural = "Spłaty"
        ordering = ["-data"]

    # ------------------------------------------------------------------
    # Metody z diagramu UML
    # ------------------------------------------------------------------
    def waliduj(self) -> None:
        """Sprawdza poprawność spłaty."""
        if self.kwota <= 0:
            raise ValueError("Kwota spłaty musi być dodatnia.")
        if self.platnik_id == self.odbiorca_id:
            raise ValueError("Płatnik i odbiorca nie mogą być tą samą osobą.")

    def oznacz_jako_uregulowany(self) -> None:
        """Oznacza spłatę jako potwierdzoną i zapisuje."""
        self.uregulowana = True
        self.save(update_fields=["uregulowana"])

    def __str__(self) -> str:
        status = "✓" if self.uregulowana else "⏳"
        return (
            f"{status} {self.platnik.imie} → "
            f"{self.odbiorca.imie}: {self.kwota} PLN"
        )
