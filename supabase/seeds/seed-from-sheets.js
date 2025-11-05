#!/usr/bin/env node

/**
 * Script de seed pour Supabase - Import depuis Google Sheets
 * 
 * Ce script est exécuté automatiquement lors du `supabase db reset`
 * pour initialiser les données depuis Google Sheets.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Démarrage du seed depuis Google Sheets...');

try {
  // Vérifier que les variables d'environnement sont définies
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'GOOGLE_SHEETS_CLIENT_EMAIL',
    'GOOGLE_SHEETS_PRIVATE_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️ Variables d\'environnement manquantes:', missingVars.join(', '));
    console.log('ℹ️ Le seed sera ignoré. Configurez les variables d\'environnement pour activer l\'import.');
    process.exit(0);
  }

  // Chemin vers le script d'import
  const importScriptPath = path.join(__dirname, '../../scripts/imports/google-sheets-import-clean-v2.js');
  
  console.log('📊 Exécution de l\'import Google Sheets...');
  
  // Exécuter le script d'import en mode dry-run d'abord pour vérifier
  console.log('🔍 Test de connexion...');
  execSync(`node "${importScriptPath}" --test-connection`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });

  // Exécuter l'import réel
  console.log('📥 Import des données...');
  execSync(`node "${importScriptPath}" --verbose`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });

  console.log('✅ Seed depuis Google Sheets terminé avec succès!');

} catch (error) {
  console.error('❌ Erreur lors du seed:', error.message);
  
  // En cas d'erreur, on continue quand même (pas de blocage du reset)
  console.log('ℹ️ Le seed a échoué mais le reset de la DB continue...');
  process.exit(0);
}
