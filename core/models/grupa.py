"""
Modele Grupy i tabeli pośredniej CzlonekGrupy.

Diagram UML:
    Grupa — nazwa, data_utworzenia
    Metody: dodaj_uzytkownika(), usun_uzytkownika(), pobierz_czlonkow()
    Relacje: zawiera → Uzytkownik (ManyToMany przez CzlonekGrupy)
"""
from django.db import models

from .uzytkownik import Uzytkownik


class Grupa(models.Model):
    """Model grupy użytkowników.

    Pola (z diagramu UML):
        nazwa           → CharField
        data_utworzenia → DateField (auto)

    Relacje:
        - czlonkowie → Uzytkownik (ManyToMany)
        - menedzer   → MenedzerRozliczen (OneToOne, reverse)
    """

    nazwa = models.CharField("Nazwa grupy", max_length=200)
    data_utworzenia = models.DateField("Data utworzenia", auto_now_add=True)
    czlonkowie = models.ManyToManyField(
        Uzytkownik,
        through="CzlonekGrupy",
        related_name="grupy",
        verbose_name="Członkowie",
    )
    tworca = models.ForeignKey(
        Uzytkownik,
        on_delete=models.SET_NULL,
        null=True,
        related_name="grupy_stworzone",
        verbose_name="Twórca",
    )

    class Meta:
        verbose_name = "Grupa"
        verbose_name_plural = "Grupy"
        ordering = ["-data_utworzenia"]

    # ------------------------------------------------------------------
    # Metody z diagramu UML
    # ------------------------------------------------------------------
    def dodaj_uzytkownika(self, uzytkownik: Uzytkownik) -> None:
        """Dodaje użytkownika do grupy."""
        if self.czlonkowie.filter(pk=uzytkownik.pk).exists():
            raise ValueError(f"{uzytkownik.imie} już należy do tej grupy.")
        CzlonekGrupy.objects.create(grupa=self, uzytkownik=uzytkownik)

    def usun_uzytkownika(self, uzytkownik: Uzytkownik) -> None:
        """Usuwa użytkownika z grupy."""
        CzlonekGrupy.objects.filter(
            grupa=self, uzytkownik=uzytkownik
        ).delete()

    def pobierz_czlonkow(self):
        """Zwraca QuerySet członków grupy."""
        return self.czlonkowie.all()

    def __str__(self) -> str:
        return self.nazwa


class CzlonekGrupy(models.Model):
    """Tabela pośrednia Grupa ↔ Uzytkownik."""

    grupa = models.ForeignKey(Grupa, on_delete=models.CASCADE)
    uzytkownik = models.ForeignKey(Uzytkownik, on_delete=models.CASCADE)
    data_dolaczenia = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ("grupa", "uzytkownik")
        verbose_name = "Członek grupy"
        verbose_name_plural = "Członkowie grupy"
