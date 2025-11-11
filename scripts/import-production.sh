#!/bin/bash
# scripts/import-production.sh
# Script pour exécuter l'import sur la base de données de production
# Usage: bash scripts/import-production.sh

set -e  # Arrêter en cas d'erreur

echo "🌐 Mode PRODUCTION activé"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# Vérifier que le fichier .env.production existe
if [ ! -f .env.production ]; then
  echo "❌ Fichier .env.production non trouvé!"
  echo "💡 Créez .env.production avec vos variables de production"
  exit 1
fi

# Charger les variables de production de manière sécurisée
echo "📝 Chargement de .env.production..."
export NODE_ENV=production

# Méthode robuste pour charger le fichier .env
# Utilise set -a pour exporter automatiquement toutes les variables
# Cela gère correctement les valeurs avec espaces et caractères spéciaux
set -a
source .env.production
set +a

# Vérifier les variables essentielles (avec ou sans NEXT_PUBLIC_)
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Variable SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL manquante dans .env.production"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Variable SUPABASE_SERVICE_ROLE_KEY manquante dans .env.production"
  exit 1
fi

# Exporter les variables NEXT_PUBLIC_* si elles n'existent pas déjà
# Cela permet d'utiliser SUPABASE_URL comme fallback pour NEXT_PUBLIC_SUPABASE_URL
# IMPORTANT: env.ts lit NEXT_PUBLIC_SUPABASE_URL, pas SUPABASE_URL
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_URL" ]; then
  export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
  echo "ℹ️  NEXT_PUBLIC_SUPABASE_URL défini depuis SUPABASE_URL"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
  echo "ℹ️  NEXT_PUBLIC_SUPABASE_ANON_KEY défini depuis SUPABASE_ANON_KEY"
fi

# Vérifier que NEXT_PUBLIC_SUPABASE_URL est maintenant défini
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL non défini après chargement"
  exit 1
fi

echo "✅ Configuration chargée"
echo "📍 SUPABASE_URL: ${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}"
echo "📍 NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Vérifier la connexion avant de continuer
echo "🔌 Test de connexion à la base de données..."
if command -v npx >/dev/null 2>&1; then
  NODE_ENV=production npx tsx scripts/imports/google-sheets-import-clean-v2.js --test-connection || {
    echo "❌ Échec du test de connexion"
    exit 1
  }
else
  echo "⚠️  npx non disponible, test de connexion ignoré"
fi

echo ""
echo "🚀 Démarrage de l'import complet..."
echo ""

# Exécuter l'import avec NODE_ENV=production
# Les variables NEXT_PUBLIC_* sont maintenant disponibles dans l'environnement
# Note: --verbose est passé via npm pour avoir plus de détails sur les erreurs
NODE_ENV=production npx tsx scripts/imports/google-sheets-import-clean-v2.js --verbose && node scripts/recalculate-artisan-statuses.js

echo ""
echo "✅ Import terminé avec succès!"

