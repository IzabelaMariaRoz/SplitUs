"""Jinja2 environment — udostępnia Django-specyficzne funkcje w szablonach."""
from django.contrib import messages
from django.templatetags.static import static
from django.urls import reverse
from jinja2 import Environment


def url(viewname, *args, **kwargs):
    """Wrapper na django reverse() obsługujący kwargs z szablonów Jinja2.

    Użycie w szablonie:
        {{ url('core:lista_grup') }}
        {{ url('core:szczegoly_grupy', pk=grupa.pk) }}
    """
    if args:
        return reverse(viewname, args=args)
    if kwargs:
        return reverse(viewname, kwargs=kwargs)
    return reverse(viewname)


def environment(**options):
    env = Environment(**options)

    def pending_invitations(request):
        """Zwraca liczbę oczekujących zaproszeń dla zalogowanego użytkownika."""
        if not request or not request.user.is_authenticated:
            return 0
        from core.models import Zaproszenie
        return request.user.zaproszenia_otrzymane.filter(
            status=Zaproszenie.STATUS_OCZEKUJACE
        ).count()

    env.globals.update(
        {
            "static": static,
            "url": url,
            "get_messages": messages.get_messages,
            "pending_invitations": pending_invitations,
        }
    )
    return env
