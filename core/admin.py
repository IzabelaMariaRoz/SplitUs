from django.contrib import admin
from .models import Uzytkownik, Grupa, CzlonekGrupy, MenedzerRozliczen, Wydatek, PodzialWydatku, Splata


@admin.register(Uzytkownik)
class UzytkownikAdmin(admin.ModelAdmin):
    list_display = ["imie", "adres_email", "is_active", "data_dolaczenia"]
    search_fields = ["imie", "adres_email"]


@admin.register(Grupa)
class GrupaAdmin(admin.ModelAdmin):
    list_display = ["nazwa", "tworca", "data_utworzenia"]
    pass


@admin.register(Wydatek)
class WydatekAdmin(admin.ModelAdmin):
    list_display = ["tytul", "kwota", "platnik", "data", "status"]
    list_filter = ["status"]


@admin.register(Splata)
class SplataAdmin(admin.ModelAdmin):
    list_display = ["platnik", "odbiorca", "kwota", "data", "uregulowana"]
    list_filter = ["uregulowana"]


admin.site.register(MenedzerRozliczen)
admin.site.register(PodzialWydatku)
admin.site.register(CzlonekGrupy)
