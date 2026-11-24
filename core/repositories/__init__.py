"""
Paczka repozytoriów SplitUs.

Wszystkie operacje na bazie danych przez ten folder.
Importuj w widokach tak:

    from core.repositories import GrupaRepository, WydatekRepository
"""

from .uzytkownik_repo import UzytkownikRepository
from .grupa_repo import GrupaRepository
from .wydatek_repo import WydatekRepository
from .splata_repo import SplataRepository
from .zaproszenie_repo import ZaproszenieRepository

__all__ = [
    "UzytkownikRepository",
    "GrupaRepository",
    "WydatekRepository",
    "SplataRepository",
    "ZaproszenieRepository",
]
