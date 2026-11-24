from decimal import Decimal

from django.contrib import auth, messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from .forms import (
    DodajCzlonkaForm,
    GrupaForm,
    LogowanieForm,
    RejestracjaForm,
    SplataForm,
    WydatekForm,
)
from .models import Grupa, Splata, Uzytkownik, Wydatek
from .repositories import (
    GrupaRepository,
    SplataRepository,
    UzytkownikRepository,
    WydatekRepository,
    ZaproszenieRepository,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _sprawdz_czlonka(request, grupa: Grupa) -> None:
    """Zwraca 403 jeśli użytkownik nie jest członkiem grupy."""
    if not GrupaRepository.jest_czlonkiem(grupa, request.user):
        raise PermissionDenied


# ---------------------------------------------------------------------------
# Strona główna
# ---------------------------------------------------------------------------
def index(request):
    if request.user.is_authenticated:
        return redirect("core:lista_grup")
    return redirect("core:logowanie")


# ---------------------------------------------------------------------------
# Autentykacja
# ---------------------------------------------------------------------------
def rejestracja(request):
    form = RejestracjaForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        auth.login(request, user)
        messages.success(request, f"Witaj, {user.imie}! Konto zostało utworzone.")
        return redirect("core:lista_grup")
    return render(request, "auth/rejestracja.html", {"form": form})


def logowanie(request):
    form = LogowanieForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.get_user()
        auth.login(request, user)
        messages.success(request, f"Zalogowano jako {user.imie}.")
        return redirect(request.GET.get("next", "core:lista_grup"))
    return render(request, "auth/logowanie.html", {"form": form})


@login_required
def wylogowanie(request):
    auth.logout(request)
    messages.info(request, "Wylogowano pomyślnie.")
    return redirect("core:logowanie")


# ---------------------------------------------------------------------------
# Grupy
# ---------------------------------------------------------------------------
@login_required
def lista_grup(request):
    grupy = GrupaRepository.pobierz_grupy_uzytkownika(request.user)
    if grupy.exists():
        return redirect("core:szczegoly_grupy", pk=grupy.first().pk)
    return render(request, "grupy/lista.html", {"grupy": grupy})


@login_required
def nowa_grupa(request):
    form = GrupaForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        grupa = GrupaRepository.stworz(
            nazwa=form.cleaned_data["nazwa"],
            tworca=request.user,
        )
        messages.success(request, f"Grupa '{grupa.nazwa}' została utworzona.")
        return redirect("core:szczegoly_grupy", pk=grupa.pk)
    return render(request, "grupy/nowa.html", {"form": form})


@login_required
def szczegoly_grupy(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)

    wydatki = WydatekRepository.pobierz_ostatnie(grupa, ile=100)
    splaty = SplataRepository.pobierz_ostatnie(grupa, ile=100)
    czlonkowie = GrupaRepository.pobierz_czlonkow(grupa)

    # Obliczenia KPI
    suma_wydatkow = sum(w.kwota for w in wydatki)
    liczba_wydatkow = len(wydatki)
    liczba_splat = len(splaty)
    czlonkowie_count = czlonkowie.count()
    srednia_na_osobe = (
        round(suma_wydatkow / czlonkowie_count, 2) if czlonkowie_count > 0 else Decimal("0.00")
    )

    transakcje = grupa.menedzer.optymalizuj_dlugi()
    pozostalo_do_rozliczenia = sum(t["kwota"] for t in transakcje)
    liczba_przelewow = len(transakcje)

    kpi = {
        "suma_wydatkow": suma_wydatkow,
        "liczba_wydatkow": liczba_wydatkow,
        "liczba_splat": liczba_splat,
        "czlonkowie_count": czlonkowie_count,
        "srednia_na_osobe": srednia_na_osobe,
        "pozostalo_do_rozliczenia": pozostalo_do_rozliczenia,
        "liczba_przelewow": liczba_przelewow,
    }

    bilans_tabela = grupa.menedzer.pobierz_szczegolowy_bilans()
    podsumowanie_tekst = grupa.menedzer.generuj_podsumowanie_tekst()

    # Formularze do modali
    wydatek_form = WydatekForm(grupa=grupa, initial={"platnik": request.user})
    splata_form = SplataForm(grupa=grupa, user=request.user)
    dodaj_czlonka_form = DodajCzlonkaForm()
    grupa_form = GrupaForm(instance=grupa)

    aktywny_tab = request.GET.get("tab", "expenses")

    return render(request, "grupy/szczegoly.html", {
        "grupa": grupa,
        "kpi": kpi,
        "wydatki": wydatki,
        "splaty": splaty,
        "czlonkowie": czlonkowie,
        "bilans_tabela": bilans_tabela,
        "transakcje": transakcje,
        "podsumowanie_tekst": podsumowanie_tekst,
        "wydatek_form": wydatek_form,
        "splata_form": splata_form,
        "dodaj_czlonka_form": dodaj_czlonka_form,
        "grupa_form": grupa_form,
        "aktywny_tab": aktywny_tab,
    })


@login_required
def usun_grupe(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk, tworca=request.user)
    if request.method == "POST":
        nazwa = grupa.nazwa
        GrupaRepository.usun(grupa)
        messages.success(request, f"Grupa '{nazwa}' została usunięta.")
        return redirect("core:lista_grup")
    return render(request, "grupy/usun.html", {"grupa": grupa})


@login_required
def dodaj_czlonka(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    form = DodajCzlonkaForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        email = form.cleaned_data["adres_email"]
        user = UzytkownikRepository.pobierz_po_email(email)
        if not user:
            messages.error(request, f"Nie znaleziono użytkownika o adresie {email}.")
        else:
            try:
                ZaproszenieRepository.wyslij(
                    grupa=grupa,
                    zapraszajacy=request.user,
                    zaproszony=user,
                )
                messages.success(request, f"Zaproszenie zostało wysłane do {user.imie}.")
            except ValueError as e:
                messages.warning(request, str(e))
        return redirect("core:szczegoly_grupy", pk=pk)
    return render(request, "grupy/dodaj_czlonka.html", {"form": form, "grupa": grupa})


@login_required
@require_POST
def usun_czlonka(request, pk, user_pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    user = get_object_or_404(Uzytkownik, pk=user_pk)
    if user == grupa.tworca:
        messages.error(request, "Nie można usunąć twórcy grupy.")
    else:
        GrupaRepository.usun_czlonka(grupa, user)
        messages.success(request, f"{user.imie} został usunięty z grupy.")
    return redirect("core:szczegoly_grupy", pk=pk)


@login_required
def edytuj_grupe(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    form = GrupaForm(request.POST or None, instance=grupa)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, f"Grupa została zaktualizowana.")
        return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': pk})}?tab=members")
    return redirect("core:szczegoly_grupy", pk=pk)


# ---------------------------------------------------------------------------
# Wydatki
# ---------------------------------------------------------------------------
@login_required
def nowy_wydatek(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    form = WydatekForm(request.POST or None, grupa=grupa)
    if request.method == "POST" and form.is_valid():
        wydatek = WydatekRepository.stworz(
            grupa=grupa,
            tytul=form.cleaned_data["tytul"],
            kwota=form.cleaned_data["kwota"],
            platnik=form.cleaned_data["platnik"],
        )
        messages.success(request, f"Wydatek '{wydatek.tytul}' został dodany.")
        return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': pk})}?tab=expenses")
    return render(request, "wydatki/nowy.html", {"form": form, "grupa": grupa})


@login_required
def edytuj_wydatek(request, pk):
    wydatek = get_object_or_404(Wydatek, pk=pk)
    grupa = wydatek.menedzer.grupa
    _sprawdz_czlonka(request, grupa)
    form = WydatekForm(request.POST or None, instance=wydatek, grupa=grupa)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Wydatek został zaktualizowany.")
        return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': grupa.pk})}?tab=expenses")
    return render(request, "wydatki/edytuj.html", {"form": form, "wydatek": wydatek, "grupa": grupa})


@login_required
@require_POST
def usun_wydatek(request, pk):
    wydatek = get_object_or_404(Wydatek, pk=pk)
    grupa = wydatek.menedzer.grupa
    _sprawdz_czlonka(request, grupa)
    tytul = wydatek.tytul
    WydatekRepository.usun(wydatek)
    messages.success(request, f"Wydatek '{tytul}' został usunięty.")
    return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': grupa.pk})}?tab=expenses")


# ---------------------------------------------------------------------------
# Rozliczenia
# ---------------------------------------------------------------------------
@login_required
def bilans_grupy(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': pk})}?tab=balances")


@login_required
def historia_grupy(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': pk})}?tab=expenses")


@login_required
def nowa_splata(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    form = SplataForm(request.POST or None, grupa=grupa, user=request.user)
    if request.method == "POST" and form.is_valid():
        try:
            SplataRepository.stworz(
                grupa=grupa,
                platnik=form.cleaned_data["platnik"],
                odbiorca=form.cleaned_data["odbiorca"],
                kwota=form.cleaned_data["kwota"],
            )
            messages.success(request, "Zwrot został zarejestrowany.")
        except ValueError as e:
            messages.error(request, str(e))
        return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': pk})}?tab=balances")
    return render(request, "rozliczenia/nowa_splata.html", {"form": form, "grupa": grupa})


@login_required
@require_POST
def szybka_splata(request, pk):
    """Błyskawiczne zarejestrowanie zwrotu z listy 'Proponowane przelewy'."""
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    od_email = request.POST.get("od_email")
    do_email = request.POST.get("do_email")
    kwota = request.POST.get("kwota")
    od_user = UzytkownikRepository.pobierz_po_email(od_email)
    do_user = UzytkownikRepository.pobierz_po_email(do_email)
    if od_user and do_user and kwota:
        try:
            splata = SplataRepository.stworz(
                grupa=grupa,
                platnik=od_user,
                odbiorca=do_user,
                kwota=Decimal(str(kwota)),
            )
            SplataRepository.oznacz_uregulowana(splata)
            messages.success(request, f"Oznaczono jako rozliczone: {od_user.imie} → {do_user.imie} ({kwota} zł).")
        except Exception as e:
            messages.error(request, str(e))
    return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': pk})}?tab=balances")


@login_required
@require_POST
def usun_splate(request, pk):
    splata = get_object_or_404(Splata, pk=pk)
    grupa = splata.menedzer.grupa
    _sprawdz_czlonka(request, grupa)
    SplataRepository.usun(splata)
    messages.success(request, "Zwrot został usunięty.")
    return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': grupa.pk})}?tab=expenses")


@login_required
@require_POST
def ureguluj_splate(request, pk):
    splata = get_object_or_404(Splata, pk=pk)
    _sprawdz_czlonka(request, splata.menedzer.grupa)
    SplataRepository.oznacz_uregulowana(splata)
    messages.success(request, "Spłata została oznaczona jako uregulowana.")
    return redirect(f"{reverse('core:szczegoly_grupy', kwargs={'pk': splata.menedzer.grupa.pk})}?tab=balances")


# ---------------------------------------------------------------------------
# Zaproszenia
# ---------------------------------------------------------------------------
@login_required
def lista_zaproszen(request):
    zaproszenia = ZaproszenieRepository.pobierz_oczekujace(request.user)
    return render(request, "zaproszenia/lista.html", {"zaproszenia": zaproszenia})


@login_required
@require_POST
def akceptuj_zaproszenie(request, pk):
    from .models import Zaproszenie
    zaproszenie = get_object_or_404(
        Zaproszenie, pk=pk, zaproszony=request.user,
        status=Zaproszenie.STATUS_OCZEKUJACE,
    )
    try:
        ZaproszenieRepository.akceptuj(zaproszenie)
        messages.success(request, f"Dołączyłeś do grupy '{zaproszenie.grupa.nazwa}'!")
    except ValueError as e:
        messages.error(request, str(e))
    return redirect("core:lista_zaproszen")


@login_required
@require_POST
def odrzuc_zaproszenie(request, pk):
    from .models import Zaproszenie
    zaproszenie = get_object_or_404(
        Zaproszenie, pk=pk, zaproszony=request.user,
        status=Zaproszenie.STATUS_OCZEKUJACE,
    )
    ZaproszenieRepository.odrzuc(zaproszenie)
    messages.info(request, f"Odrzuciłeś zaproszenie do grupy '{zaproszenie.grupa.nazwa}'.")
    return redirect("core:lista_zaproszen")
