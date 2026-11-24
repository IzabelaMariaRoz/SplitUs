"""
Model MenedzeraRozliczen — zarządca finansów grupy.

Diagram UML:
    MenedzerRozliczen — wydatki, splaty
    Metody: dodaj_wydatek(), pobierz_historie_operacji(),
            przelicz_bilans(), optymalizuj_dlugi()
    Relacje: zarządza → Grupa (OneToOne)
"""
from decimal import Decimal

from django.db import models

from .grupa import Grupa


class MenedzerRozliczen(models.Model):
    """Zarządza rozliczeniami finansowymi grupy.

    Relacje:
        - zarządza grupą → Grupa (OneToOne)
        - wydatki → Wydatek (reverse FK)
        - splaty  → Splata  (reverse FK)
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
    def dodaj_wydatek(self, wydatek) -> None:
        """Przypisuje wydatek do tego menedżera."""
        wydatek.menedzer = self
        wydatek.save()

    def pobierz_historie_operacji(self) -> dict:
        """Zwraca słownik z historią wydatków i spłat grupy."""
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
        for wydatek in self.wydatki.all():
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
            email: {"imie": nazwy[email], "saldo": float(saldo)}
            for email, saldo in bilans.items()
        }

    def pobierz_szczegolowy_bilans(self) -> list:
        """Zwraca szczegółowe zestawienie bilansu per uczestnik do tabeli SplitUs."""
        czlonkowie = self.grupa.pobierz_czlonkow()
        dane = {
            u.adres_email: {
                "user": u,
                "imie": u.imie,
                "email": u.adres_email,
                "inicjaly": (u.imie[:2] if len(u.imie) >= 2 else u.imie).upper(),
                "total_paid": Decimal("0.00"),
                "total_share": Decimal("0.00"),
                "settlements_paid": Decimal("0.00"),
                "settlements_received": Decimal("0.00"),
                "net_balance": Decimal("0.00"),
            }
            for u in czlonkowie
        }

        for w in self.wydatki.all():
            ep = w.platnik.adres_email
            if ep in dane:
                dane[ep]["total_paid"] += w.kwota
            for podzial in w.podzial.all():
                ed = podzial.uzytkownik.adres_email
                if ed in dane:
                    dane[ed]["total_share"] += podzial.kwota_do_oddania

        for s in self.splaty.select_related("platnik", "odbiorca"):
            ep = s.platnik.adres_email
            eo = s.odbiorca.adres_email
            if ep in dane:
                dane[ep]["settlements_paid"] += s.kwota
            if eo in dane:
                dane[eo]["settlements_received"] += s.kwota

        wynik = []
        for d in dane.values():
            d["net_balance"] = (
                (d["total_paid"] - d["total_share"])
                + (d["settlements_paid"] - d["settlements_received"])
            )
            if d["net_balance"] > 0:
                d["status_text"] = "Otrzyma"
                d["status_color"] = "text-emerald-700"
            elif d["net_balance"] < 0:
                d["status_text"] = "Do oddania"
                d["status_color"] = "text-red-600"
            else:
                d["status_text"] = "Rozliczony"
                d["status_color"] = "text-slate-500"
            wynik.append(d)

        wynik.sort(key=lambda x: x["net_balance"], reverse=True)
        return wynik

    def generuj_podsumowanie_tekst(self) -> str:
        """Generuje gotowe podsumowanie grupy do skopiowania do schowka."""
        szczegoly = self.pobierz_szczegolowy_bilans()
        transakcje = self.optymalizuj_dlugi()
        suma_wydatkow = sum(w.kwota for w in self.wydatki.all())
        liczba_wydatkow = self.wydatki.count()

        linie = [
            f"Rozliczenie grupy: {self.grupa.nazwa}",
            f"Suma wydatków: {suma_wydatkow:.2f} zł ({liczba_wydatkow} rachunków)",
            "",
        ]

        if not transakcje:
            linie.append("Wszystkie rachunki w grupie są już wyrównane.")
        else:
            linie.append("Najprostsze przelewy do rozliczenia:")
            for t in transakcje:
                linie.append(f"• {t['od_imie']} -> {t['do_imie']}: {t['kwota']:.2f} zł")

        linie.append("")
        linie.append("Salda końcowe:")
        for s in szczegoly:
            saldo = s["net_balance"]
            if saldo > 0:
                tekst = f"otrzyma {saldo:.2f} zł"
            elif saldo < 0:
                tekst = f"do oddania {abs(saldo):.2f} zł"
            else:
                tekst = "rozliczony"
            linie.append(f"- {s['imie']}: {tekst}")

        return "\n".join(linie)

    def optymalizuj_dlugi(self) -> list:
        """Wyznacza minimalną liczbę transakcji do rozliczenia grupy.

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

    def zarejestruj_splate(self, splata) -> None:
        """Przypisuje spłatę do menedżera."""
        splata.menedzer = self
        splata.save()

    def __str__(self) -> str:
        return f"Menedżer rozliczeń: {self.grupa.nazwa}"
