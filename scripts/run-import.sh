#!/bin/bash

# Script wrapper pour l'import Google Sheets
# Charge automatiquement les variables d'environnement

echo "🔄 Chargement des variables d'environnement..."

# Charger les variables Google depuis .env.local (méthode plus robuste)
set -a
source .env.local
set +a

# Utiliser les vraies clés Supabase locales (corrigées)
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

echo "🚀 Lancement de l'import Google Sheets..."
node scripts/import-google-sheets-complete.js "$@"
