"""Context processors — dodają zmienne globalne do każdego szablonu Jinja2."""
from .models import Zaproszenie


def zaproszenia_count(request):
    """Zwraca liczbę oczekujących zaproszeń dla zalogowanego użytkownika."""
    if request.user.is_authenticated:
        count = request.user.zaproszenia_otrzymane.filter(
            status=Zaproszenie.STATUS_OCZEKUJACE
        ).count()
        return {"zaproszenia_count": count}
    return {"zaproszenia_count": 0}
