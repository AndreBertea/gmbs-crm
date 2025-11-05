#!/usr/bin/env bash
#
# setup.sh — Bootstrap local development
# Usage: bash scripts/core/setup.sh
# Requires: Node 20+, npm, optional: Supabase CLI, psql
set -euo pipefail

echo "==> Checking Node version"
node -v || { echo "Node.js not found. Install Node 20 LTS"; exit 1; }

echo "==> Installing dependencies with npm ci"
npm ci

echo "==> Verifying .env.local exists"
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    echo "Created .env.local from .env.example (edit values as needed)"
  else
    echo ".env.example not found; please create .env.local manually."
  fi
fi

if command -v supabase >/dev/null 2>&1; then
  echo "==> Supabase CLI detected. You can run: npm run db:init"
else
  echo "==> Supabase CLI not found. For local DB via Supabase, install: https://supabase.com/docs/guides/cli"
fi

echo "==> Typecheck"
npm run typecheck || true

echo "==> Lint"
npm run lint || true

echo "All set. Run: npm run dev"

