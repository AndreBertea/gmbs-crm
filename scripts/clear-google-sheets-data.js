#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();
dotenv.config({ path: '.env.local' });

// Configuration Supabase avec les bonnes clés locales
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration des arguments
const args = process.argv.slice(2);
const isForce = args.includes('--force');
const isVerbose = args.includes('--verbose');

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  console.log(`${prefix} ${message}`);
}

function logInfo(message) {
  log('INFO', message);
}

function logVerbose(message) {
  if (isVerbose) {
    log('VERB', message);
  }
}

function logError(message) {
  log('ERRO', message);
}

async function clearTable(tableName) {
  try {
    logInfo(`Suppression du contenu de ${tableName}...`);
    
    // Désactiver temporairement les triggers
    await supabase.rpc('disable_trigger', { table_name: tableName });
    logVerbose(`Triggers désactivés pour ${tableName}`);
    
    // Supprimer toutes les données
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Condition qui matche tout
    
    if (error) {
      throw error;
    }
    
    // Réactiver les triggers
    await supabase.rpc('enable_trigger', { table_name: tableName });
    logVerbose(`Triggers réactivés pour ${tableName}`);
    
    logInfo(`✅ ${tableName} vidé avec succès`);
    return true;
  } catch (error) {
    logError(`Erreur lors du nettoyage de ${tableName}: ${error.message}`);
    return false;
  }
}

async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    return count || 0;
  } catch (error) {
    logError(`Impossible de compter les enregistrements de ${tableName}: ${error.message}`);
    return -1;
  }
}

async function main() {
  logInfo('=== NETTOYAGE DES TABLES CRM ===');
  
  if (!isForce) {
    logError('❌ Mode --force requis pour confirmer le nettoyage');
    logInfo('Utilisez: node scripts/clear-google-sheets-data.js --force --verbose');
    process.exit(1);
  }
  
  // Tables à nettoyer dans l'ordre (pour respecter les contraintes de clés étrangères)
  const tablesToClear = [
    'intervention_artisans',
    'artisan_metiers', 
    'interventions',
    'artisans'
  ];
  
  logInfo(`Tables ciblées: ${tablesToClear.join(', ')}`);
  
  // Afficher les compteurs avant nettoyage
  logInfo('📊 État avant nettoyage:');
  for (const table of tablesToClear) {
    const count = await getTableCount(table);
    if (count >= 0) {
      logInfo(`  - ${table}: ${count} enregistrements`);
    }
  }
  
  // Nettoyer les tables
  let successCount = 0;
  for (const table of tablesToClear) {
    const success = await clearTable(table);
    if (success) {
      successCount++;
    }
  }
  
  // Afficher les compteurs après nettoyage
  logInfo('📊 État après nettoyage:');
  for (const table of tablesToClear) {
    const count = await getTableCount(table);
    if (count >= 0) {
      logInfo(`  - ${table}: ${count} enregistrements`);
    }
  }
  
  if (successCount === tablesToClear.length) {
    logInfo('🎉 Nettoyage terminé avec succès !');
  } else {
    logError(`⚠️  Nettoyage partiel: ${successCount}/${tablesToClear.length} tables nettoyées`);
  }
}

main().catch(error => {
  logError(`❌ Erreur fatale: ${error.message}`);
  process.exit(1);
});