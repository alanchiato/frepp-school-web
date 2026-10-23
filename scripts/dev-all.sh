#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
web_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
projects_dir=$(dirname -- "$web_dir")
bff_dir="$projects_dir/frepp-school-bff"
platform_dir="$projects_dir/frepp-platform"

platform_addr=${FREPP_PLATFORM_ADDR:-127.0.0.1:8080}
platform_url=http://$platform_addr
bff_host=${FREPP_BFF_HOST:-127.0.0.1}
bff_port=${FREPP_BFF_PORT:-3001}
bff_url=http://$bff_host:$bff_port
web_host=${FREPP_WEB_HOST:-127.0.0.1}
web_port=${FREPP_WEB_PORT:-5173}

case "$platform_addr" in
  127.0.0.1:*|localhost:*) ;;
  *)
    printf 'FREPP_PLATFORM_ADDR must be a loopback host and port (received %s).\n' "$platform_addr" >&2
    exit 1
    ;;
esac

case "$bff_host" in
  127.0.0.1|localhost) ;;
  *)
    printf 'FREPP_BFF_HOST must be a loopback host (received %s).\n' "$bff_host" >&2
    exit 1
    ;;
esac

case "$web_host" in
  127.0.0.1|localhost) ;;
  *)
    printf 'FREPP_WEB_HOST must be a loopback host (received %s).\n' "$web_host" >&2
    exit 1
    ;;
esac

for directory in "$web_dir" "$bff_dir" "$platform_dir"; do
  if [ ! -d "$directory" ]; then
    printf 'Required repository not found: %s\n' "$directory" >&2
    exit 1
  fi
done

if [ ! -f "$platform_dir/.env" ]; then
  printf 'Missing %s/.env. Create it from .env.example and keep credentials local.\n' "$platform_dir" >&2
  exit 1
fi

platform_port=${platform_addr##*:}
for port in "$platform_port" "$bff_port" "$web_port"; do
  case "$port" in
    ''|*[!0-9]*)
      printf 'Development ports must be decimal integers (received %s).\n' "$port" >&2
      exit 1
      ;;
  esac
  if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    printf 'Development ports must be between 1 and 65535 (received %s).\n' "$port" >&2
    exit 1
  fi
done

db_port=$(
  set -a
  . "$platform_dir/.env"
  set +a
  printf '%s' "${DB_PORT:-5432}"
)

case "$db_port" in
  ''|*[!0-9]*)
    printf 'DB_PORT in the Platform .env must be a decimal integer.\n' >&2
    exit 1
    ;;
esac
if [ "$db_port" -lt 1 ] || [ "$db_port" -gt 65535 ]; then
  printf 'DB_PORT in the Platform .env must be between 1 and 65535.\n' >&2
  exit 1
fi

assert_port_free() {
  service=$1
  port=$2
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | grep -q .; then
    printf '%s cannot start: TCP port %s is already in use.\n' "$service" "$port" >&2
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >&2 || true
    exit 1
  fi
}

assert_port_free "Frepp Platform" "$platform_port"
assert_port_free "Frepp School BFF" "$bff_port"
assert_port_free "Frepp School Web" "$web_port"

platform_pid=
bff_pid=
web_pid=
postgres_started=0

cleanup() {
  status=$?
  trap - EXIT INT TERM HUP

  for pid in "$web_pid" "$bff_pid" "$platform_pid"; do
    if [ -n "$pid" ]; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$web_pid" "$bff_pid" "$platform_pid"; do
    if [ -n "$pid" ]; then
      wait "$pid" 2>/dev/null || true
    fi
  done

  if [ "$postgres_started" -eq 1 ]; then
    docker compose --project-directory "$platform_dir" stop postgres >/dev/null
  fi

  exit "$status"
}

trap 'exit 130' INT
trap 'exit 143' TERM HUP
trap cleanup EXIT

if lsof -nP -iTCP:"$db_port" -sTCP:LISTEN -t 2>/dev/null | grep -q .; then
  printf 'Reusing PostgreSQL already listening on port %s.\n' "$db_port"
else
  docker compose --project-directory "$platform_dir" up -d postgres
  postgres_started=1
  printf 'Waiting for PostgreSQL...\n'
  attempt=0
  while ! docker compose --project-directory "$platform_dir" exec -T postgres pg_isready -q; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      printf 'PostgreSQL did not become ready within 30 seconds.\n' >&2
      exit 1
    fi
    sleep 1
  done
fi

printf 'Building Frepp Platform...\n'
(cd "$platform_dir" && go build -o bin/api-dev ./cmd/api)

(
  cd "$platform_dir"
  set -a
  . ./.env
  set +a
  export APP_ENV=${APP_ENV:-development}
  export HTTP_ADDR="$platform_addr"
  exec ./bin/api-dev
) &
platform_pid=$!

wait_for_http() {
  service=$1
  url=$2
  pid=$3
  attempt=0
  while ! curl --silent --output /dev/null --max-time 1 "$url"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      set +e
      wait "$pid"
      child_status=$?
      set -e
      printf '%s exited before becoming ready (status %s).\n' "$service" "$child_status" >&2
      exit 1
    fi
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      printf '%s did not become ready within 30 seconds (%s).\n' "$service" "$url" >&2
      exit 1
    fi
    sleep 1
  done
}

wait_for_http "Frepp Platform" "$platform_url/school/auth/me" "$platform_pid"

(
  cd "$bff_dir"
  exec env \
    NODE_ENV=development \
    HOST="$bff_host" \
    PORT="$bff_port" \
    CORE_BASE_URL="$platform_url" \
    pnpm dev
) &
bff_pid=$!

wait_for_http "Frepp School BFF" "$bff_url/health/live" "$bff_pid"

(
  cd "$web_dir"
  exec env \
    VITE_BFF_BASE_URL=/bff \
    BFF_PROXY_TARGET="$bff_url" \
    pnpm dev -- --host "$web_host" --port "$web_port" --strictPort
) &
web_pid=$!

wait_for_http "Frepp School Web" "http://$web_host:$web_port/" "$web_pid"

printf '\nFrepp local environment is ready:\n'
printf '  Web:      http://%s:%s\n' "$web_host" "$web_port"
printf '  BFF:      %s\n' "$bff_url"
printf '  Platform: %s\n' "$platform_url"
printf 'Press Ctrl+C to stop the child processes.\n\n'

while :; do
  for child in "Platform:$platform_pid" "BFF:$bff_pid" "Web:$web_pid"; do
    name=${child%%:*}
    pid=${child##*:}
    if ! kill -0 "$pid" 2>/dev/null; then
      set +e
      wait "$pid"
      child_status=$?
      set -e
      if [ "$child_status" -eq 0 ]; then
        child_status=1
      fi
      printf '%s process exited (status %s).\n' "$name" "$child_status" >&2
      exit "$child_status"
    fi
  done
  sleep 1
done
