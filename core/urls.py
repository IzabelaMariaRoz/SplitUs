from django.urls import path
from . import views

app_name = "core"

urlpatterns = [
    # Auth
    path("", views.index, name="index"),
    path("rejestracja/", views.rejestracja, name="rejestracja"),
    path("logowanie/", views.logowanie, name="logowanie"),
    path("wylogowanie/", views.wylogowanie, name="wylogowanie"),

    # Grupy
    path("grupy/", views.lista_grup, name="lista_grup"),
    path("grupy/nowa/", views.nowa_grupa, name="nowa_grupa"),
    path("grupy/<int:pk>/", views.szczegoly_grupy, name="szczegoly_grupy"),
    path("grupy/<int:pk>/edytuj/", views.edytuj_grupe, name="edytuj_grupe"),
    path("grupy/<int:pk>/usun/", views.usun_grupe, name="usun_grupe"),
    path("grupy/<int:pk>/dodaj-czlonka/", views.dodaj_czlonka, name="dodaj_czlonka"),
    path("grupy/<int:pk>/usun-czlonka/<int:user_pk>/", views.usun_czlonka, name="usun_czlonka"),

    # Wydatki
    path("grupy/<int:pk>/wydatki/nowy/", views.nowy_wydatek, name="nowy_wydatek"),
    path("wydatki/<int:pk>/edytuj/", views.edytuj_wydatek, name="edytuj_wydatek"),
    path("wydatki/<int:pk>/usun/", views.usun_wydatek, name="usun_wydatek"),

    # Rozliczenia
    path("grupy/<int:pk>/bilans/", views.bilans_grupy, name="bilans_grupy"),
    path("grupy/<int:pk>/historia/", views.historia_grupy, name="historia_grupy"),
    path("grupy/<int:pk>/splata/", views.nowa_splata, name="nowa_splata"),
    path("grupy/<int:pk>/szybka-splata/", views.szybka_splata, name="szybka_splata"),
    path("splaty/<int:pk>/usun/", views.usun_splate, name="usun_splate"),
    path("splaty/<int:pk>/ureguluj/", views.ureguluj_splate, name="ureguluj_splate"),
    # Zaproszenia
    path("zaproszenia/", views.lista_zaproszen, name="lista_zaproszen"),
    path("zaproszenia/<int:pk>/akceptuj/", views.akceptuj_zaproszenie, name="akceptuj_zaproszenie"),
    path("zaproszenia/<int:pk>/odrzuc/", views.odrzuc_zaproszenie, name="odrzuc_zaproszenie"),
]
