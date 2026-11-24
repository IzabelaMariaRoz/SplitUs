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
    path("grupy/<str:pk>/", views.szczegoly_grupy, name="szczegoly_grupy"),
    path("grupy/<str:pk>/edytuj/", views.edytuj_grupe, name="edytuj_grupe"),
    path("grupy/<str:pk>/usun/", views.usun_grupe, name="usun_grupe"),
    path("grupy/<str:pk>/dodaj-czlonka/", views.dodaj_czlonka, name="dodaj_czlonka"),
    path("grupy/<str:pk>/usun-czlonka/<str:user_pk>/", views.usun_czlonka, name="usun_czlonka"),

    # Wydatki
    path("grupy/<str:pk>/wydatki/nowy/", views.nowy_wydatek, name="nowy_wydatek"),
    path("wydatki/<str:pk>/edytuj/", views.edytuj_wydatek, name="edytuj_wydatek"),
    path("wydatki/<str:pk>/usun/", views.usun_wydatek, name="usun_wydatek"),

    # Rozliczenia
    path("grupy/<str:pk>/bilans/", views.bilans_grupy, name="bilans_grupy"),
    path("grupy/<str:pk>/historia/", views.historia_grupy, name="historia_grupy"),
    path("grupy/<str:pk>/splata/", views.nowa_splata, name="nowa_splata"),
    path("grupy/<str:pk>/szybka-splata/", views.szybka_splata, name="szybka_splata"),
    path("splaty/<str:pk>/usun/", views.usun_splate, name="usun_splate"),
    path("splaty/<str:pk>/ureguluj/", views.ureguluj_splate, name="ureguluj_splate"),
    # Zaproszenia
    path("zaproszenia/", views.lista_zaproszen, name="lista_zaproszen"),
    path("zaproszenia/<str:pk>/akceptuj/", views.akceptuj_zaproszenie, name="akceptuj_zaproszenie"),
    path("zaproszenia/<str:pk>/odrzuc/", views.odrzuc_zaproszenie, name="odrzuc_zaproszenie"),
]
