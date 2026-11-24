"""
Model Zaproszenia do grupy.

Diagram UML (rozszerzenie):
    Zaproszenie — grupa, zapraszajacy, zaproszony, status, data_wyslania
    Metody: akceptuj(), odrzuc()
    Stany: oczekujace → zaakceptowane | odrzucone
"""
from django.db import models
from django.utils import timezone

from .grupa import Grupa
from .uzytkownik import Uzytkownik


class Zaproszenie(models.Model):
    """Zaproszenie do grupy wymagające akceptacji przez zaproszonego.

    Stany:
        oczekujace    → zaproszenie wysłane, czeka na odpowiedź
        zaakceptowane → użytkownik dołączył do grupy
        odrzucone     → użytkownik odmówił
    """

    STATUS_OCZEKUJACE = "oczekujace"
    STATUS_ZAAKCEPTOWANE = "zaakceptowane"
    STATUS_ODRZUCONE = "odrzucone"
    STATUS_CHOICES = [
        (STATUS_OCZEKUJACE, "Oczekujące"),
        (STATUS_ZAAKCEPTOWANE, "Zaakceptowane"),
        (STATUS_ODRZUCONE, "Odrzucone"),
    ]

    grupa = models.ForeignKey(
        Grupa,
        on_delete=models.CASCADE,
        related_name="zaproszenia",
        verbose_name="Grupa",
    )
    zapraszajacy = models.ForeignKey(
        Uzytkownik,
        on_delete=models.CASCADE,
        related_name="zaproszenia_wyslane",
        verbose_name="Zapraszający",
    )
    zaproszony = models.ForeignKey(
        Uzytkownik,
        on_delete=models.CASCADE,
        related_name="zaproszenia_otrzymane",
        verbose_name="Zaproszony",
    )
    status = models.CharField(
        "Status", max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_OCZEKUJACE,
    )
    data_wyslania = models.DateTimeField("Data wysłania", auto_now_add=True)
    data_odpowiedzi = models.DateTimeField("Data odpowiedzi", null=True, blank=True)

    class Meta:
        verbose_name = "Zaproszenie"
        verbose_name_plural = "Zaproszenia"
        ordering = ["-data_wyslania"]
        unique_together = ("grupa", "zaproszony")

    # ------------------------------------------------------------------
    # Metody z diagramu UML
    # ------------------------------------------------------------------
    def akceptuj(self) -> None:
        """Akceptuje zaproszenie i dodaje użytkownika do grupy."""
        self.grupa.dodaj_uzytkownika(self.zaproszony)
        self.status = self.STATUS_ZAAKCEPTOWANE
        self.data_odpowiedzi = timezone.now()
        self.save()

    def odrzuc(self) -> None:
        """Odrzuca zaproszenie."""
        self.status = self.STATUS_ODRZUCONE
        self.data_odpowiedzi = timezone.now()
        self.save()

    def __str__(self) -> str:
        return (
            f"Zaproszenie: {self.zapraszajacy.imie} → "
            f"{self.zaproszony.imie} do '{self.grupa.nazwa}' [{self.status}]"
        )
