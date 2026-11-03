from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import Uzytkownik, Grupa, Wydatek, Splata, PodzialWydatku


class RejestracjaForm(forms.ModelForm):
    """Formularz rejestracji nowego użytkownika."""
    haslo = forms.CharField(
        label="Hasło",
        min_length=8,
        widget=forms.PasswordInput(attrs={"placeholder": "Min. 8 znaków"}),
    )
    haslo2 = forms.CharField(
        label="Powtórz hasło",
        widget=forms.PasswordInput(attrs={"placeholder": "Powtórz hasło"}),
    )

    class Meta:
        model = Uzytkownik
        fields = ["imie", "adres_email"]
        widgets = {
            "imie": forms.TextInput(attrs={"placeholder": "Imię i nazwisko"}),
            "adres_email": forms.EmailInput(attrs={"placeholder": "adres@email.pl"}),
        }

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("haslo") != cleaned.get("haslo2"):
            raise forms.ValidationError("Hasła muszą być identyczne.")
        return cleaned

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["haslo"])
        if commit:
            user.save()
        return user


class LogowanieForm(AuthenticationForm):
    """Formularz logowania."""
    username = forms.EmailField(
        label="Adres e-mail",
        widget=forms.EmailInput(attrs={"placeholder": "adres@email.pl", "autofocus": True}),
    )
    password = forms.CharField(
        label="Hasło",
        widget=forms.PasswordInput(attrs={"placeholder": "Hasło"}),
    )


class GrupaForm(forms.ModelForm):
    """Formularz tworzenia nowej grupy."""
    class Meta:
        model = Grupa
        fields = ["nazwa"]
        widgets = {
            "nazwa": forms.TextInput(attrs={"placeholder": "Np. Wakacje 2025, Mieszkanie..."}),
        }


class DodajCzlonkaForm(forms.Form):
    """Formularz dodawania członka do grupy przez e-mail."""
    adres_email = forms.EmailField(
        label="Adres e-mail użytkownika",
        widget=forms.EmailInput(attrs={"placeholder": "adres@email.pl"}),
    )


class WydatekForm(forms.ModelForm):
    """Formularz dodawania/edycji wydatku."""
    class Meta:
        model = Wydatek
        fields = ["tytul", "kwota", "platnik"]
        widgets = {
            "tytul": forms.TextInput(attrs={"placeholder": "Np. Obiad, Paliwo..."}),
            "kwota": forms.NumberInput(attrs={"placeholder": "0.00", "step": "0.01", "min": "0.01"}),
        }

    def __init__(self, *args, grupa=None, **kwargs):
        super().__init__(*args, **kwargs)
        if grupa:
            self.fields["platnik"].queryset = grupa.czlonkowie.all()
            self.fields["platnik"].label = "Kto zapłacił?"


class SplataForm(forms.ModelForm):
    """Formularz rejestrowania spłaty."""
    class Meta:
        model = Splata
        fields = ["platnik", "odbiorca", "kwota"]
        widgets = {
            "kwota": forms.NumberInput(attrs={"placeholder": "0.00", "step": "0.01", "min": "0.01"}),
        }

    def __init__(self, *args, grupa=None, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        if grupa:
            czlonkowie = grupa.czlonkowie.all()
            self.fields["platnik"].queryset = czlonkowie
            self.fields["odbiorca"].queryset = czlonkowie.exclude(pk=user.pk) if user else czlonkowie
            self.fields["platnik"].label = "Kto oddaje pieniądze?"
            self.fields["odbiorca"].label = "Komu oddaje?"
        if user:
            self.fields["platnik"].initial = user

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("platnik") == cleaned.get("odbiorca"):
            raise forms.ValidationError("Płatnik i odbiorca nie mogą być tą samą osobą.")
        return cleaned
