#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
project="voluntrack-test-$$"
export POSTGRES_PASSWORD="$(openssl rand -hex 32)"
export MIGRATOR_PASSWORD="$(openssl rand -hex 32)"
export APP_PASSWORD="$(openssl rand -hex 32)"
export VOLUNTRACK_PORT=0
export TEST_APP_URL="postgresql://voluntrack_app:${APP_PASSWORD}@db:5432/voluntrack"
export TEST_BACKEND_URL="http://backend:3000"

compose() {
  docker compose -p "$project" -f compose.yaml "$@"
}

override="$(mktemp)"
cleanup() {
  compose down --volumes --timeout 5
  unlink "$override"
}
trap cleanup EXIT

compose config --quiet
compose up -d --build --wait --wait-timeout 90
compose run --rm --no-deps \
  --volume "$PWD/backend/test:/app/test:ro" \
  --env TEST_APP_URL --env TEST_BACKEND_URL migrate npm test

url="http://$(compose port backend 3000)/health/ready"
backend_id="$(compose ps -q backend)"
status() {
  curl --silent --show-error --max-time 4 --output /dev/null --write-out '%{http_code}' "$url"
}
test "$(status)" = 200
compose stop --timeout 5 db
test "$(status)" = 503
test "$(curl --silent --show-error --max-time 4 "$url")" = '{"message":"Service Unavailable","statusCode":503}'
compose up -d --wait --wait-timeout 60 db
test "$(status)" = 200
test "$(compose ps -q backend)" = "$backend_id"
printf 'Readiness returned 200 -> 503 -> 200 without recreating the backend.\n'

compose rm -sf backend migrate
cat >"$override" <<'YAML'
services:
  migrate:
    environment:
      DATABASE_URL: postgresql://voluntrack_missing@db:5432/voluntrack
YAML
if compose -f "$override" up -d --no-build backend; then
  printf 'Expected the failing migration to block backend startup.\n' >&2
  exit 1
fi
compose logs --no-color migrate | grep -F 'P1000'
test -z "$(compose ps -q --status running backend)"
printf 'A failed migration blocked backend startup.\n'
