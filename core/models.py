"""
Django ORM models dla SplitUs.
Klasy domenowe (z logiką biznesową) → core/models_domain.py
Klasy Django ORM (zapis do bazy)     → core/models.py (ten plik)

Relacje mapowane z diagramu UML:
  Uzytkownik  ← zawiera ─── Grupa (ManyToMany przez CzlonekGrupy)
  Grupa       ─ zarządza ── MenedzerRozliczen (OneToOne)
  Wydatek     ─ należy ──── MenedzerRozliczen (ForeignKey)
  Splata      ─ należy ──── MenedzerRozliczen (ForeignKey)
  PodzialWydatku ─ dotyczy ─ Wydatek (ForeignKey)
  PodzialWydatku ─ dotyczy ─ Uzytkownik (ForeignKey)
"""

from decimal import Decimal

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Manager dla Uzytkownik
# ---------------------------------------------------------------------------
class UzytkownikManager(BaseUserManager):
    """Menadżer tworzenia użytkowników (wymagany przez AbstractBaseUser)."""

    def create_user(self, adres_email: str, imie: str, password: str = None):
        if not adres_email:
            raise ValueError("Adres e-mail jest wymagany.")
        email = self.normalize_email(adres_email)
        user = self.model(adres_email=email, imie=imie)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, adres_email: str, imie: str, password: str):
        user = self.create_user(adres_email, imie, password)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


# ---------------------------------------------------------------------------
# Uzytkownik
# ---------------------------------------------------------------------------
class Uzytkownik(AbstractBaseUser, PermissionsMixin):
    """Model użytkownika systemu SplitUs.

    Pola (z diagramu UML):
        imie         → CharField
        #haslo       → obsługiwane przez AbstractBaseUser (password)
        adres_email  → EmailField (unikalny, używany jako login)
    """

    imie = models.CharField("Imię i nazwisko", max_length=150)
    adres_email = models.EmailField("Adres e-mail", unique=True)

    # Pola wymagane przez Django auth
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    data_dolaczenia = models.DateTimeField(default=timezone.now)

    objects = UzytkownikManager()

    USERNAME_FIELD = "adres_email"
    REQUIRED_FIELDS = ["imie"]

    class Meta:
        verbose_name = "Użytkownik"
        verbose_name_plural = "Użytkownicy"

    # ------------------------------------------------------------------
    # Metody z diagramu UML
    # ------------------------------------------------------------------
    def resetuj_haslo(self) -> str:
        """Generuje tymczasowe hasło i je ustawia. Zwraca hasło jawne."""
        import secrets
        tymczasowe = secrets.token_urlsafe(10)
        self.set_password(tymczasowe)
        self.save(update_fields=["password"])
        return tymczasowe

    def zaloguj(self, haslo: str) -> bool:
        """Weryfikuje hasło (wrapper na check_password)."""
        return self.check_password(haslo)

    def pobierz_haslo(self) -> str:
        """Zwraca zahaszowaną postać hasła z bazy."""
        return self.password

    def ustaw_haslo(self, nowe_haslo: str) -> None:
        """Ustawia i zapisuje nowe hasło."""
        self.set_password(nowe_haslo)
        self.save(update_fields=["password"])

    def __str__(self) -> str:
        return f"{self.imie} <{self.adres_email}>"


# ---------------------------------------------------------------------------
# Grupa
# ---------------------------------------------------------------------------
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
    def dodaj_uzytkownika(self, uzytkownik: "Uzytkownik") -> None:
        """Dodaje użytkownika do grupy."""
        if self.czlonkowie.filter(pk=uzytkownik.pk).exists():
            raise ValueError(f"{uzytkownik.imie} już należy do tej grupy.")
        CzlonekGrupy.objects.create(grupa=self, uzytkownik=uzytkownik)

    def usun_uzytkownika(self, uzytkownik: "Uzytkownik") -> None:
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


# ---------------------------------------------------------------------------
# MenedzerRozliczen
# ---------------------------------------------------------------------------
class MenedzerRozliczen(models.Model):
    """Zarządza rozliczeniami finansowymi grupy.

    Pola (z diagramu UML):
        wydatki → reverse FK z Wydatek
        splaty  → reverse FK z Splata

    Relacje:
        - zarządza grupą → Grupa (OneToOne)
    """

    grupa = models.OneToOneField(
        Grupa,
        on_delete=models.CASCADE,
        related_name="menedzer",
        verbose_name="Grupa",
    )

    class Meta:
        verbose_name = "Menedżer rozliczeń"
        verbose_name_plural = "Menedżerowie rozliczeń"

    # ------------------------------------------------------------------
    # Metody z diagramu UML
    # ------------------------------------------------------------------
    def dodaj_wydatek(self, wydatek: "Wydatek") -> None:
        """Przypisuje wydatek do tego menedżera."""
        wydatek.menedzer = self
        wydatek.save()

    def pobierz_historie_operacji(self) -> dict:
        """Zwraca słownik z historią wydatków i spłat."""
        return {
            "wydatki": list(
                self.wydatki.select_related("platnik").values(
                    "id", "tytul", "kwota", "data", "platnik__imie", "status"
                )
            ),
            "splaty": list(
                self.splaty.select_related("platnik", "odbiorca").values(
                    "id", "platnik__imie", "odbiorca__imie",
                    "kwota", "data", "uregulowana",
                )
            ),
        }

    def przelicz_bilans(self) -> dict:
        """Oblicza saldo netto każdego członka grupy.

        Dodatnie saldo = inni są winni tej osobie.
        Ujemne saldo   = ta osoba jest winna innym.
        """
        czlonkowie = self.grupa.pobierz_czlonkow()
        bilans = {u.adres_email: Decimal("0") for u in czlonkowie}
        nazwy = {u.adres_email: u.imie for u in czlonkowie}

        # Wydatki: płatnik zyskuje, dłużnicy tracą
        for wydatek in self.wydatki.prefetch_related("podzial__uzytkownik"):
            ep = wydatek.platnik.adres_email
            if ep in bilans:
                bilans[ep] += wydatek.kwota
            for podzial in wydatek.podzial.all():
                ed = podzial.uzytkownik.adres_email
                if ed in bilans:
                    bilans[ed] -= podzial.kwota_do_oddania

        # Spłaty: płatnik traci, odbiorca zyskuje
        for splata in self.splaty.select_related("platnik", "odbiorca"):
            ep = splata.platnik.adres_email
            eo = splata.odbiorca.adres_email
            if ep in bilans:
                bilans[ep] -= splata.kwota
            if eo in bilans:
                bilans[eo] += splata.kwota

        return {
            email: {
                "imie": nazwy[email],
                "saldo": float(saldo),
            }
            for email, saldo in bilans.items()
        }

    def optymalizuj_dlugi(self) -> list:
        """Wyznacza minimalną liczbę transakcji do rozliczenia.

        Algorytm zachłanny: łącz największego wierzyciela
        z największym dłużnikiem aż wszystkie salda = 0.
        """
        bilans_raw = self.przelicz_bilans()

        wierzyciele = sorted(
            [(e, Decimal(str(d["saldo"])), d["imie"])
             for e, d in bilans_raw.items() if d["saldo"] > 0],
            key=lambda x: -x[1],
        )
        dluznici = sorted(
            [(e, Decimal(str(-d["saldo"])), d["imie"])
             for e, d in bilans_raw.items() if d["saldo"] < 0],
            key=lambda x: -x[1],
        )

        transakcje = []
        wi, di = 0, 0
        wierzyciele = [[e, s, n] for e, s, n in wierzyciele]
        dluznici = [[e, s, n] for e, s, n in dluznici]

        while wi < len(wierzyciele) and di < len(dluznici):
            kwota = min(wierzyciele[wi][1], dluznici[di][1])
            transakcje.append({
                "od_email": dluznici[di][0],
                "od_imie": dluznici[di][2],
                "do_email": wierzyciele[wi][0],
                "do_imie": wierzyciele[wi][2],
                "kwota": float(kwota),
            })
            wierzyciele[wi][1] -= kwota
            dluznici[di][1] -= kwota
            if wierzyciele[wi][1] == 0:
                wi += 1
            if dluznici[di][1] == 0:
                di += 1

        return transakcje

    def zarejestruj_splate(self, splata: "Splata") -> None:
        """Przypisuje spłatę do menedżera."""
        splata.menedzer = self
        splata.save()

    def __str__(self) -> str:
        return f"Menedżer rozliczeń: {self.grupa.nazwa}"


# ---------------------------------------------------------------------------
# Wydatek
# ---------------------------------------------------------------------------
class Wydatek(models.Model):
    """Wydatek poniesiony przez jednego z członków grupy.

    Pola (z diagramu UML):
        tytul   → CharField
        kwota   → DecimalField
        data    → DateField
        platnik → FK do Uzytkownik
        status  → CharField ('otwarty' | 'rozliczony')

    Relacje:
        - należy do → MenedzerRozliczen
        - dzieli się na → PodzialWydatku (reverse FK)
    """

    STATUS_OTWARTY = "otwarty"
    STATUS_ROZLICZONY = "rozliczony"
    STATUS_CHOICES = [
        (STATUS_OTWARTY, "Otwarty"),
        (STATUS_ROZLICZONY, "Rozliczony"),
    ]

    menedzer = models.ForeignKey(
        MenedzerRozliczen,
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
        """Aktualizuje pola wydatku i zapisuje."""
        if tytul is not None:
            self.tytul = tytul
        if kwota is not None:
            self.kwota = Decimal(str(kwota))
            self.waliduj_kwote()
            # Resetuj podział po zmianie kwoty
            self.podzial.all().delete()
        if data is not None:
            self.data = data
        self.save()

    def __str__(self) -> str:
        return f"{self.tytul} — {self.kwota} PLN ({self.platnik.imie})"


# ---------------------------------------------------------------------------
# PodzialWydatku
# ---------------------------------------------------------------------------
class PodzialWydatku(models.Model):
    """Udział użytkownika w danym wydatku (kwota do oddania płatnikowi).

    Pola (z diagramu UML):
        uzytkownik      → FK do Uzytkownik (dłużnik)
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


# ---------------------------------------------------------------------------
# Splata
# ---------------------------------------------------------------------------
class Splata(models.Model):
    """Bezpośrednia spłata długu między dwoma użytkownikami.

    Pola (z diagramu UML):
        platnik     → FK do Uzytkownik (kto oddaje)
        odbiorca    → FK do Uzytkownik (kto otrzymuje)
        kwota       → DecimalField
        data        → DateField
        uregulowana → BooleanField

    Relacje:
        - rejestrowana przez → MenedzerRozliczen
    """

    menedzer = models.ForeignKey(
        MenedzerRozliczen,
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


# ---------------------------------------------------------------------------
# Zaproszenie
# ---------------------------------------------------------------------------
class Zaproszenie(models.Model):
    """Zaproszenie do grupy wymagające akceptacji przez zaproszonego.

    Stany:
        oczekujace  → zaproszenie wysłane, czeka na odpowiedź
        zaakceptowane → użytkownik dołączył do grupy
        odrzucone   → użytkownik odmówił
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
        # Jeden użytkownik może mieć tylko jedno oczekujące zaproszenie do grupy
        unique_together = ("grupa", "zaproszony")

    def akceptuj(self) -> None:
        """Akceptuje zaproszenie i dodaje użytkownika do grupy."""
        from django.utils import timezone
        self.grupa.dodaj_uzytkownika(self.zaproszony)
        self.status = self.STATUS_ZAAKCEPTOWANE
        self.data_odpowiedzi = timezone.now()
        self.save()

    def odrzuc(self) -> None:
        """Odrzuca zaproszenie."""
        from django.utils import timezone
        self.status = self.STATUS_ODRZUCONE
        self.data_odpowiedzi = timezone.now()
        self.save()

    def __str__(self) -> str:
        return (
            f"Zaproszenie: {self.zapraszajacy.imie} → "
            f"{self.zaproszony.imie} do '{self.grupa.nazwa}' [{self.status}]"
        )
