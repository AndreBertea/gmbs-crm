#!/usr/bin/env bash
#
# db_seed.sh — Seed deterministic data locally
# Usage: bash scripts/core/db_seed.sh
# Requires: psql; optionally uses Supabase CLI if present
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"

echo "==> Determining DATABASE_URL"
DATABASE_URL_DEFAULT="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"

if command -v supabase >/dev/null 2>&1 && [ -d "$SUPABASE_DIR" ]; then
  echo "==> Ensuring local Supabase is running"
  supabase start >/dev/null 2>&1 || true
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run seeds." >&2
  exit 1
fi

SEED_FILE=""
if [ -f "$SUPABASE_DIR/seed.sql" ]; then
  SEED_FILE="$SUPABASE_DIR/seed.sql"
elif [ -f "$ROOT_DIR/db/seeds.sql" ]; then
  SEED_FILE="$ROOT_DIR/db/seeds.sql"
fi

if [ -z "$SEED_FILE" ]; then
  echo "No seed file found (supabase/seed.sql or db/seeds.sql). Skipping."
  exit 0
fi

echo "==> Seeding from $SEED_FILE"
PGPASSWORD="${PGPASSWORD:-postgres}" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE" >/dev/null
echo "Seed complete."

