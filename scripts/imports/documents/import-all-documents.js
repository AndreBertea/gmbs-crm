/**
 * Script unifié pour l'import de tous les documents (artisans + interventions)
 * 
 * Ce script exécute séquentiellement :
 * 1. L'import des documents d'artisans
 * 2. L'import des documents d'interventions
 * 
 * Permet d'importer tous les documents en une seule commande
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Exécute un script npm et retourne une promesse
 */
function runNpmScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Exécution: npm run ${scriptName} ${args.join(' ')}`);
    console.log(`${'='.repeat(60)}\n`);

    const npmProcess = spawn('npm', ['run', scriptName, ...args], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '../../../')
    });

    npmProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptName} terminé avec succès\n`);
        resolve(code);
      } else {
        console.error(`\n❌ ${scriptName} terminé avec le code d'erreur ${code}\n`);
        reject(new Error(`Script ${scriptName} a échoué avec le code ${code}`));
      }
    });

    npmProcess.on('error', (error) => {
      console.error(`❌ Erreur lors de l'exécution de ${scriptName}:`, error.message);
      reject(error);
    });
  });
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run drive:import-all-documents [options]

Ce script exécute séquentiellement l'import des documents d'artisans et d'interventions.

Options:
  --skip-extraction, -e  Utiliser les fichiers JSON existants (ne pas réextraire depuis Drive)
  --first-month-only     Traiter uniquement le premier mois pour les interventions (développement)
  --dry-run, -d         Mode simulation (aucune insertion en base)
  --skip-insert, -s     Faire le matching sans insérer les documents
  --artisans-only       Importer uniquement les documents d'artisans
  --interventions-only  Importer uniquement les documents d'interventions
  --help, -h            Afficher cette aide

Exemples:
  npm run drive:import-all-documents                    # Import complet (artisans + interventions)
  npm run drive:import-all-documents --dry-run          # Simulation complète
  npm run drive:import-all-documents --skip-extraction  # Utiliser JSON existants (plus rapide)
  npm run drive:import-all-documents --artisans-only    # Import uniquement des artisans
  npm run drive:import-all-documents --interventions-only # Import uniquement des interventions
`);
    process.exit(0);
  }

  const artisansOnly = args.includes('--artisans-only');
  const interventionsOnly = args.includes('--interventions-only');
  const skipExtraction = args.includes('--skip-extraction') || args.includes('-e');
  const firstMonthOnly = args.includes('--first-month-only');
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const skipInsert = args.includes('--skip-insert') || args.includes('-s');

  console.log('📦 Import unifié de tous les documents depuis Google Drive\n');
  console.log('Ce script va exécuter :');
  if (!interventionsOnly) {
    console.log('  1️⃣  Import des documents d\'artisans');
  }
  if (!artisansOnly) {
    console.log(`  ${interventionsOnly ? '1️⃣' : '2️⃣'}  Import des documents d'interventions`);
  }
  console.log('');

  // Préparer les arguments à passer aux scripts
  const commonArgs = [];
  if (skipExtraction) commonArgs.push('--skip-extraction');
  if (dryRun) commonArgs.push('--dry-run');
  if (skipInsert) commonArgs.push('--skip-insert');

  const interventionArgs = [...commonArgs];
  if (firstMonthOnly) interventionArgs.push('--first-month-only');

  try {
    const startTime = Date.now();
    const errors = [];

    // 1. Import des documents d'artisans
    if (!interventionsOnly) {
      try {
        await runNpmScript('drive:import-documents-artisans', commonArgs);
      } catch (error) {
        console.error(`\n❌ Erreur lors de l'import des documents d'artisans:`, error.message);
        errors.push('artisans');
        
        // Demander si on continue malgré l'erreur
        if (!artisansOnly) {
          console.log('\n⚠️  Voulez-vous continuer avec l\'import des interventions ?');
          console.log('   (Le script va continuer automatiquement...)');
        }
      }
    }

    // 2. Import des documents d'interventions
    if (!artisansOnly) {
      try {
        await runNpmScript('drive:import-documents-interventions', interventionArgs);
      } catch (error) {
        console.error(`\n❌ Erreur lors de l'import des documents d'interventions:`, error.message);
        errors.push('interventions');
      }
    }

    // Résumé final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 RÉSUMÉ DE L\'IMPORT');
    console.log(`${'='.repeat(60)}\n`);
    
    if (errors.length === 0) {
      console.log('✅ Tous les imports ont été effectués avec succès !');
    } else {
      console.log(`⚠️  Import terminé avec ${errors.length} erreur(s):`);
      errors.forEach(err => console.log(`   - ${err}`));
    }
    
    console.log(`⏱️  Durée totale: ${duration} secondes\n`);

    // Exit avec code d'erreur si des erreurs sont survenues
    if (errors.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Erreur fatale lors de l\'import:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };

