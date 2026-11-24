"""
Model użytkownika systemu SplitUs.

Diagram UML:
    Uzytkownik — imie, #haslo, adres_email
    Metody: resetuj_haslo(), zaloguj(), pobierz_haslo(), ustaw_haslo()
"""
import secrets

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


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


class Uzytkownik(AbstractBaseUser, PermissionsMixin):
    """Model użytkownika systemu SplitUs.

    Pola (z diagramu UML):
        imie         → CharField
        #haslo       → obsługiwane przez AbstractBaseUser (password)
        adres_email  → EmailField (unikalny, używany jako login)
    """

    imie = models.CharField("Imię i nazwisko", max_length=150)
    adres_email = models.EmailField("Adres e-mail", unique=True)

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
