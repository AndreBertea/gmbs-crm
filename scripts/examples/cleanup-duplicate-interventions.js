#!/usr/bin/env node

/**
 * Script de nettoyage des doublons d'interventions
 * 
 * Ce script identifie et supprime les doublons basés sur id_inter
 * en gardant la version la plus récente.
 */

const { supabaseAdmin } = require('../lib/supabase-client');

class DuplicateInterventionCleaner {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || true,
      verbose: options.verbose || false,
      ...options
    };
  }

  async findDuplicates() {
    console.log('🔍 Recherche des doublons d\'interventions...\n');
    
    try {
      // Requête pour trouver les doublons par id_inter
      const { data: duplicates, error } = await supabaseAdmin
        .from('interventions')
        .select('id_inter, COUNT(*) as count, ARRAY_AGG(id ORDER BY created_at DESC) as ids')
        .not('id_inter', 'is', null)
        .neq('id_inter', '')
        .group('id_inter')
        .having('COUNT(*)', 'gt', 1);

      if (error) {
        throw error;
      }

      console.log(`📊 Doublons trouvés: ${duplicates.length}`);
      
      let totalDuplicates = 0;
      duplicates.forEach(dup => {
        totalDuplicates += dup.count - 1; // -1 car on garde une version
        if (this.options.verbose) {
          console.log(`  ID: ${dup.id_inter} - ${dup.count} occurrences`);
        }
      });

      console.log(`📈 Total d'interventions à supprimer: ${totalDuplicates}\n`);
      
      return duplicates;
      
    } catch (error) {
      console.error(`❌ Erreur lors de la recherche: ${error.message}`);
      throw error;
    }
  }

  async cleanupDuplicates(duplicates) {
    console.log('🧹 Nettoyage des doublons...\n');
    
    if (this.options.dryRun) {
      console.log('🔍 MODE DRY-RUN - Aucune suppression réelle\n');
    }

    let totalDeleted = 0;
    let totalErrors = 0;

    for (const duplicate of duplicates) {
      const ids = duplicate.ids;
      const toKeep = ids[0]; // Garder le plus récent
      const toDelete = ids.slice(1); // Supprimer les autres

      console.log(`🔄 Traitement ID: ${duplicate.id_inter}`);
      console.log(`  ✅ À garder: ${toKeep}`);
      console.log(`  🗑️  À supprimer: ${toDelete.length} interventions`);

      if (this.options.verbose) {
        toDelete.forEach(id => console.log(`    - ${id}`));
      }

      if (!this.options.dryRun) {
        try {
          // Supprimer les doublons (soft delete)
          const { error } = await supabaseAdmin
            .from('interventions')
            .update({ is_active: false })
            .in('id', toDelete);

          if (error) {
            throw error;
          }

          totalDeleted += toDelete.length;
          console.log(`  ✅ ${toDelete.length} interventions supprimées\n`);
          
        } catch (error) {
          totalErrors++;
          console.error(`  ❌ Erreur: ${error.message}\n`);
        }
      } else {
        totalDeleted += toDelete.length;
        console.log(`  🔍 [DRY-RUN] ${toDelete.length} interventions seraient supprimées\n`);
      }
    }

    console.log('📊 RÉSUMÉ DU NETTOYAGE:');
    console.log(`  🗑️  Interventions supprimées: ${totalDeleted}`);
    console.log(`  ❌ Erreurs: ${totalErrors}`);
    
    if (this.options.dryRun) {
      console.log(`\n💡 Pour effectuer le nettoyage réel, utilisez --no-dry-run`);
    }

    return { deleted: totalDeleted, errors: totalErrors };
  }

  async run() {
    console.log('🚀 DÉMARRAGE DU NETTOYAGE DES DOUBLONS');
    console.log('=====================================\n');
    
    try {
      const duplicates = await this.findDuplicates();
      
      if (duplicates.length === 0) {
        console.log('✅ Aucun doublon trouvé !');
        return;
      }

      const result = await this.cleanupDuplicates(duplicates);
      
      console.log('\n✅ Nettoyage terminé !');
      
    } catch (error) {
      console.error(`💥 Erreur fatale: ${error.message}`);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes('--no-dry-run'),
    verbose: args.includes('--verbose')
  };

  const cleaner = new DuplicateInterventionCleaner(options);
  
  try {
    await cleaner.run();
  } catch (error) {
    console.error(`💥 Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DuplicateInterventionCleaner };
