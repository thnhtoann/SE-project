#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "$DJANGO_DEBUG" = "1" ]; then
    exec python manage.py runserver 0.0.0.0:"${PORT:-8000}"
else
    # No --workers previously meant gunicorn's default of exactly 1 sync
    # worker, so any page firing several concurrent API calls (most of them
    # do) queued behind each other on a single process instead of running in
    # parallel -- that's what turned a ~200ms request into 10-20s under load.
    exec gunicorn config.wsgi:application --bind 0.0.0.0:"${PORT:-8000}" \
        --workers "${GUNICORN_WORKERS:-4}" \
        --timeout 240 \
        --access-logfile - --error-logfile - \
        --access-logformat '%(h)s "%(r)s" host=%({host}i)s status=%(s)s'
fi
