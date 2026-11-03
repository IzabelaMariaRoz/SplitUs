"""
SplitUs — Django Settings
Tymczasowo używamy SQLite. Podmień DATABASE na MongoDB Atlas gdy będziesz gotowy.
"""
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="dev-secret-key-change-in-production")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "splitUs.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.jinja2.Jinja2",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": False,
        "OPTIONS": {
            "environment": "splitUs.jinja2.environment",
        },
    },
    {
        # Django templates dla /admin/
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "splitUs.wsgi.application"

# ---------------------------------------------------------------------------
# Baza danych — SQLite (tymczasowe)
# Zamień na MongoDB Atlas gdy będziesz gotowy:
#
# DATABASES = {
#     "default": {
#         "ENGINE": "django_mongodb_backend",
#         "HOST": config("MONGODB_URI"),
#         "NAME": "splitus",
#     }
# }
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "core.Uzytkownik"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
]

LANGUAGE_CODE = "pl"
TIME_ZONE = "Europe/Warsaw"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]

LOGIN_URL = "/logowanie/"
LOGIN_REDIRECT_URL = "/grupy/"
LOGOUT_REDIRECT_URL = "/logowanie/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
