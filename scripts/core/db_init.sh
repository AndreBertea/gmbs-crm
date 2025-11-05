#!/usr/bin/env bash
#
# db_init.sh — Initialize local database (migrations only)
# Usage: bash scripts/core/db_init.sh
# Requires: psql; optionally uses Supabase CLI if present
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"
DB_DIR="$ROOT_DIR/db/migrations"

echo "==> Determining DATABASE_URL"
DATABASE_URL_DEFAULT="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"

if command -v supabase >/dev/null 2>&1 && [ -d "$SUPABASE_DIR" ]; then
  echo "==> Starting local Supabase (if not already running)"
  supabase start >/dev/null 2>&1 || true
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run migrations." >&2
  echo "Install PostgreSQL client or run via Supabase CLI shell." >&2
  exit 1
fi

echo "==> Applying SQL migrations"
apply_sql_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    echo "-- Applying from $dir"
    find "$dir" -type f -name '*.sql' | sort | while read -r file; do
      echo "   -> $(basename "$file")"
      PGPASSWORD="${PGPASSWORD:-postgres}" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" >/dev/null
    done
  fi
}

apply_sql_dir "$DB_DIR"
apply_sql_dir "$SUPABASE_DIR/migrations"

echo "Database initialized (migrations applied)."

