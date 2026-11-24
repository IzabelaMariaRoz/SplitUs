"""
Paczka modeli SplitUs.

Importuje wszystkie modele tak, żeby były dostępne jako:
    from core.models import Uzytkownik, Grupa, ...

Struktura plików:
    uzytkownik.py        → Uzytkownik, UzytkownikManager
    grupa.py             → Grupa, CzlonekGrupy
    menedzer_rozliczen.py → MenedzerRozliczen
    wydatek.py           → Wydatek, PodzialWydatku
    splata.py            → Splata
    zaproszenie.py       → Zaproszenie
"""

from .uzytkownik import Uzytkownik, UzytkownikManager
from .grupa import Grupa, CzlonekGrupy
from .menedzer_rozliczen import MenedzerRozliczen
from .wydatek import Wydatek, PodzialWydatku
from .splata import Splata
from .zaproszenie import Zaproszenie

__all__ = [
    "Uzytkownik",
    "UzytkownikManager",
    "Grupa",
    "CzlonekGrupy",
    "MenedzerRozliczen",
    "Wydatek",
    "PodzialWydatku",
    "Splata",
    "Zaproszenie",
]
