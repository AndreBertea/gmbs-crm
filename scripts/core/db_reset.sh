#!/usr/bin/env bash
#
# db_reset.sh — Drop and recreate local database safely
# Usage: bash scripts/core/db_reset.sh
# Requires: Supabase CLI or psql
set -euo pipefail

read -r -p "This will reset your local DB (destructive). Continue? [y/N] " confirm
confirm=${confirm:-N}
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATABASE_URL_DEFAULT="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"

if command -v supabase >/dev/null 2>&1 && [ -d "$ROOT_DIR/supabase" ]; then
  echo "==> Using Supabase CLI to reset"
  supabase start >/dev/null 2>&1 || true
  supabase db reset --force
else
  echo "==> Using psql to reset database"
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql is required to reset the database." >&2
    exit 1
  fi
  DB_NAME=$(echo "$DATABASE_URL" | sed -E 's#.*/##')
  DB_NAME=${DB_NAME:-postgres}
  echo "Dropping and recreating schema public on $DB_NAME"
  PGPASSWORD="${PGPASSWORD:-postgres}" psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1 || true
  PGPASSWORD="${PGPASSWORD:-postgres}" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
fi

echo "==> Re-applying migrations"
"$ROOT_DIR/scripts/core/db_init.sh"

echo "==> Done. You may now seed: npm run db:seed"

