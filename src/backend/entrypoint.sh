#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "$DJANGO_DEBUG" = "1" ]; then
    exec python manage.py runserver 0.0.0.0:"${PORT:-8000}"
else
    exec gunicorn config.wsgi:application --bind 0.0.0.0:"${PORT:-8000}"
fi
