from django.contrib import auth, messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import (
    DodajCzlonkaForm,
    GrupaForm,
    LogowanieForm,
    RejestracjaForm,
    SplataForm,
    WydatekForm,
)
from .models import Grupa, MenedzerRozliczen, Splata, Uzytkownik, Wydatek, Zaproszenie


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
    grupy = request.user.grupy.all().prefetch_related("czlonkowie")
    return render(request, "grupy/lista.html", {"grupy": grupy})


@login_required
def nowa_grupa(request):
    form = GrupaForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        grupa = form.save(commit=False)
        grupa.tworca = request.user
        grupa.save()
        # Twórca automatycznie staje się członkiem
        grupa.czlonkowie.add(request.user)
        # Utwórz menedżera rozliczeń
        MenedzerRozliczen.objects.create(grupa=grupa)
        messages.success(request, f"Grupa '{grupa.nazwa}' została utworzona.")
        return redirect("core:szczegoly_grupy", pk=grupa.pk)
    return render(request, "grupy/nowa.html", {"form": form})


@login_required
def szczegoly_grupy(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    wydatki = grupa.menedzer.wydatki.select_related("platnik").order_by("-data")[:10]
    splaty = grupa.menedzer.splaty.select_related("platnik", "odbiorca").order_by("-data")[:5]
    bilans = grupa.menedzer.przelicz_bilans()
    transakcje = grupa.menedzer.optymalizuj_dlugi()
    return render(request, "grupy/szczegoly.html", {
        "grupa": grupa,
        "wydatki": wydatki,
        "splaty": splaty,
        "czlonkowie": grupa.pobierz_czlonkow(),
        "bilans": bilans,
        "transakcje": transakcje,
    })


@login_required
def usun_grupe(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk, tworca=request.user)
    if request.method == "POST":
        nazwa = grupa.nazwa
        grupa.delete()
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
        try:
            user = Uzytkownik.objects.get(adres_email=email)
            if grupa.czlonkowie.filter(pk=user.pk).exists():
                messages.error(request, f"{user.imie} już należy do grupy.")
            elif Zaproszenie.objects.filter(
                grupa=grupa, zaproszony=user,
                status=Zaproszenie.STATUS_OCZEKUJACE
            ).exists():
                messages.warning(request, f"Zaproszenie do {user.imie} już zostało wysłane.")
            else:
                Zaproszenie.objects.create(
                    grupa=grupa,
                    zapraszajacy=request.user,
                    zaproszony=user,
                )
                messages.success(request, f"Zaproszenie zostało wysłane do {user.imie}.")
        except Uzytkownik.DoesNotExist:
            messages.error(request, f"Nie znaleziono użytkownika o adresie {email}.")
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
        grupa.usun_uzytkownika(user)
        messages.success(request, f"{user.imie} został usunięty z grupy.")
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
        wydatek = form.save(commit=False)
        wydatek.menedzer = grupa.menedzer
        wydatek.save()
        # Równy podział między wszystkich członków
        czlonkowie = lista_bez(grupa.pobierz_czlonkow(), wydatek.platnik)
        if czlonkowie:
            kwota_na_osobe = wydatek.kwota / (len(czlonkowie) + 1)
            from .models import PodzialWydatku
            for czlonek in czlonkowie:
                PodzialWydatku.objects.create(
                    wydatek=wydatek,
                    uzytkownik=czlonek,
                    kwota_do_oddania=round(kwota_na_osobe, 2),
                )
        messages.success(request, f"Wydatek '{wydatek.tytul}' został dodany.")
        return redirect("core:szczegoly_grupy", pk=pk)
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
        return redirect("core:szczegoly_grupy", pk=grupa.pk)
    return render(request, "wydatki/edytuj.html", {"form": form, "wydatek": wydatek, "grupa": grupa})


@login_required
@require_POST
def usun_wydatek(request, pk):
    wydatek = get_object_or_404(Wydatek, pk=pk)
    grupa = wydatek.menedzer.grupa
    _sprawdz_czlonka(request, grupa)
    tytul = wydatek.tytul
    wydatek.delete()
    messages.success(request, f"Wydatek '{tytul}' został usunięty.")
    return redirect("core:szczegoly_grupy", pk=grupa.pk)


# ---------------------------------------------------------------------------
# Rozliczenia
# ---------------------------------------------------------------------------
@login_required
def bilans_grupy(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    menedzer = grupa.menedzer
    bilans = menedzer.przelicz_bilans()
    transakcje = menedzer.optymalizuj_dlugi()
    return render(request, "rozliczenia/bilans.html", {
        "grupa": grupa,
        "bilans": bilans,
        "transakcje": transakcje,
    })


@login_required
def historia_grupy(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    historia = grupa.menedzer.pobierz_historie_operacji()
    return render(request, "rozliczenia/historia.html", {
        "grupa": grupa,
        "historia": historia,
    })


@login_required
def nowa_splata(request, pk):
    grupa = get_object_or_404(Grupa, pk=pk)
    _sprawdz_czlonka(request, grupa)
    form = SplataForm(request.POST or None, grupa=grupa, user=request.user)
    if request.method == "POST" and form.is_valid():
        splata = form.save(commit=False)
        splata.menedzer = grupa.menedzer
        try:
            splata.waliduj()
            splata.save()
            messages.success(request, "Spłata została zarejestrowana.")
        except ValueError as e:
            messages.error(request, str(e))
        return redirect("core:bilans_grupy", pk=pk)
    return render(request, "rozliczenia/nowa_splata.html", {"form": form, "grupa": grupa})


@login_required
@require_POST
def ureguluj_splate(request, pk):
    splata = get_object_or_404(Splata, pk=pk)
    _sprawdz_czlonka(request, splata.menedzer.grupa)
    splata.oznacz_jako_uregulowany()
    messages.success(request, "Spłata została oznaczona jako uregulowana.")
    return redirect("core:bilans_grupy", pk=splata.menedzer.grupa.pk)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _sprawdz_czlonka(request, grupa):
    """Zwraca 403 jeśli użytkownik nie jest członkiem grupy."""
    from django.core.exceptions import PermissionDenied
    if not grupa.czlonkowie.filter(pk=request.user.pk).exists():
        raise PermissionDenied


def lista_bez(queryset_or_list, wyklucz):
    """Zwraca listę bez wskazanego elementu."""
    return [u for u in queryset_or_list if u.pk != wyklucz.pk]


# ---------------------------------------------------------------------------
# Zaproszenia
# ---------------------------------------------------------------------------
@login_required
def lista_zaproszen(request):
    """Lista oczekujących zaproszeń do grup dla zalogowanego użytkownika."""
    zaproszenia = (
        request.user.zaproszenia_otrzymane
        .filter(status=Zaproszenie.STATUS_OCZEKUJACE)
        .select_related("grupa", "zapraszajacy")
        .order_by("-data_wyslania")
    )
    return render(request, "zaproszenia/lista.html", {"zaproszenia": zaproszenia})


@login_required
@require_POST
def akceptuj_zaproszenie(request, pk):
    zaproszenie = get_object_or_404(
        Zaproszenie, pk=pk, zaproszony=request.user,
        status=Zaproszenie.STATUS_OCZEKUJACE
    )
    try:
        zaproszenie.akceptuj()
        messages.success(
            request,
            f"Dołączyłeś do grupy '{zaproszenie.grupa.nazwa}'!"
        )
    except ValueError as e:
        messages.error(request, str(e))
    return redirect("core:lista_zaproszen")


@login_required
@require_POST
def odrzuc_zaproszenie(request, pk):
    zaproszenie = get_object_or_404(
        Zaproszenie, pk=pk, zaproszony=request.user,
        status=Zaproszenie.STATUS_OCZEKUJACE
    )
    zaproszenie.odrzuc()
    messages.info(request, f"Odrzuciłeś zaproszenie do grupy '{zaproszenie.grupa.nazwa}'.")
    return redirect("core:lista_zaproszen")
