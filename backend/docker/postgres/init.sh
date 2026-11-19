#!/usr/bin/env bash
set -eu

# Passwords also appear in Compose's connection URLs, so require URL-safe values.
for variable in POSTGRES_PASSWORD MIGRATOR_PASSWORD APP_PASSWORD; do
  if [[ ! ${!variable} =~ ^[a-zA-Z0-9._~-]+$ ]]; then
    printf '%s must contain only URL-safe unreserved characters.\n' "$variable" >&2
    exit 1
  fi
done

if [[ $POSTGRES_PASSWORD == "$MIGRATOR_PASSWORD" ||
      $POSTGRES_PASSWORD == "$APP_PASSWORD" ||
      $MIGRATOR_PASSWORD == "$APP_PASSWORD" ]]; then
  printf 'PostgreSQL roles require distinct passwords.\n' >&2
  exit 1
fi

psql --no-psqlrc --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" <<'SQL'
\getenv migrator_password MIGRATOR_PASSWORD
\getenv app_password APP_PASSWORD

CREATE ROLE voluntrack_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE voluntrack_app LOGIN PASSWORD :'app_password';

ALTER DATABASE voluntrack OWNER TO voluntrack_migrator;
CREATE DATABASE voluntrack_shadow OWNER voluntrack_migrator;
REVOKE ALL ON DATABASE postgres, template1, voluntrack, voluntrack_shadow FROM PUBLIC;
GRANT CONNECT ON DATABASE voluntrack TO voluntrack_app;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO voluntrack_app;
SQL
