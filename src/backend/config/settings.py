"""
Django settings for the config project.

Configuration is read from environment variables so the same settings
module works both in Docker Compose and, if needed, outside it.
"""
import os
import dj_database_url
from pathlib import Path
from datetime import timedelta
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-change-me-in-production')

DEBUG = os.environ.get('DJANGO_DEBUG', '1') == '1'

GRABMART_WEBHOOK_SECRET = os.environ.get('GRABMART_WEBHOOK_SECRET', 'dev-grabmart-secret')
SHOPEEFOOD_WEBHOOK_SECRET = os.environ.get('SHOPEEFOOD_WEBHOOK_SECRET', 'dev-shopeefood-secret')
BEMART_WEBHOOK_SECRET = os.environ.get('BEMART_WEBHOOK_SECRET', 'dev-bemart-secret')

# Lazada Open Platform OAuth app credentials (sandbox or production seller
# account) — from the app's "My Apps" page in the Lazada Open Platform
# console. This is a separate, deliberately-not-spec-005 integration style
# (OAuth + polling, see omnichannel/lazada.py) used to pull real orders from
# a connected seller account, unlike the mocked shared-secret webhooks above.
LAZADA_APP_KEY = os.environ.get('LAZADA_APP_KEY', '')
LAZADA_APP_SECRET = os.environ.get('LAZADA_APP_SECRET', '')
# REST gateway for signed calls (token create/refresh, orders/items) — set by LazopClient per call.
LAZADA_API_URL = os.environ.get('LAZADA_API_URL', 'https://api.lazada.vn/rest')
LAZADA_AUTH_URL = os.environ.get('LAZADA_AUTH_URL', 'https://auth.lazada.com/rest')
# The human-facing consent page (plain redirect, not a signed API call).
LAZADA_AUTHORIZE_PAGE_URL = os.environ.get('LAZADA_AUTHORIZE_PAGE_URL', 'https://auth.lazada.com/oauth/authorize')
LAZADA_REDIRECT_URI = os.environ.get('LAZADA_REDIRECT_URI', 'http://localhost:8000/api/lazada/callback/')
FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000')

# Google AI Studio (Gemini) — powers the revenue-advisor LangGraph agent (see
# advisor app). Left blank by default; advisor/graph.py raises a clear error
# at call time (not import time) if a request needs it and it's unset.
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip()
]

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]

# PaaS platforms (Railway, Render, etc.) terminate TLS at their own proxy and
# forward plain HTTP internally, flagging the original scheme via this
# header — without it Django thinks every request is insecure.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'core',
    'omnichannel',
    'pos',
    'forecasting',
    'advisor',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Prefers DATABASE_URL when set (the single-connection-string form every
# PaaS Postgres add-on provides, e.g. Railway) and falls back to the
# individual POSTGRES_* vars Docker Compose sets locally.
_local_db_url = (
    f"postgresql://{os.environ.get('POSTGRES_USER', 'app_user')}:"
    f"{os.environ.get('POSTGRES_PASSWORD', 'app_password')}@"
    f"{os.environ.get('POSTGRES_HOST', 'localhost')}:"
    f"{os.environ.get('POSTGRES_PORT', '5432')}/"
    f"{os.environ.get('POSTGRES_DB', 'app_db')}"
)
DATABASES = {
    'default': dj_database_url.config(default=_local_db_url, conn_max_age=600),
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Plain WhiteNoise storage, not CompressedManifestStaticFilesStorage — this
# app only serves the Django admin's static assets (low traffic, no CDN-tier
# caching need), and the Manifest variant's per-file gzip+brotli+MD5-hash
# pass during collectstatic was slow enough on a constrained PaaS CPU to
# blow past the platform's deploy healthcheck window. WhiteNoiseMiddleware
# still gzips responses on the fly at request time either way.
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}

# NOTE: MEDIA_ROOT is local container disk — fine for local Docker Compose,
# but on most PaaS deploys (Railway included) the filesystem is ephemeral,
# so uploaded files (e.g. StaffDocument) are lost on every redeploy/restart.
# Swap to object storage (S3-compatible) before relying on uploads in prod.
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    if origin.strip()
]
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# Shared cache backend for cross-process state (login lockout / OTP-attempt
# counters in core/views.py). Django's default LocMemCache is per-process,
# so those counters would silently reset per worker under gunicorn — Redis
# makes them consistent across all workers.
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://redis:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}

AUTH_USER_MODEL = 'core.Staff'
SIMPLE_JWT = {
    'USER_ID_FIELD': 'staff_id',
    'USER_ID_CLAIM': 'user_id',
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=4),
}
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'