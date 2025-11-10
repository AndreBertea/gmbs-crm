#!/usr/bin/env tsx

/**
 * Script de debug pour analyser les données mappées AVANT insertion
 * 
 * Ce script lit 10 lignes du CSV et affiche exactement ce qui est mappé
 * pour comprendre pourquoi les coûts et artisans ne sont pas insérés
 * 
 * Usage:
 *   npx tsx scripts/tests/debug-import-data.js
 */

import fs from 'fs';
import Papa from 'papaparse';
import { DataMapper } from '../data-processing/data-mapper.js';

async function main() {
  console.log('\n🔍 DEBUG - Analyse des données mappées\n');
  
  try {
    // Lire le fichier CSV
    const csvPath = './data/samples/sheets/GMBS-SUIVI_INTER_GMBS_2025.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Fichier CSV non trouvé: ${csvPath}`);
      console.error('💡 Vérifier le chemin du fichier');
      process.exit(1);
    }
    
    console.log(`📄 Lecture de: ${csvPath}\n`);
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (!parsed.data || parsed.data.length === 0) {
      console.error('❌ Aucune donnée dans le CSV');
      process.exit(1);
    }
    
    console.log(`✅ ${parsed.data.length} lignes trouvées\n`);
    
    // Afficher les colonnes disponibles
    const columns = Object.keys(parsed.data[0]);
    console.log('📋 COLONNES DISPONIBLES:');
    console.log('='.repeat(80));
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. "${col}"`);
    });
    console.log('\n');
    
    // Initialiser le mapper
    const mapper = new DataMapper();
    await mapper.initialize();
    
    // Analyser les 10 premières interventions
    console.log('🔬 ANALYSE DES 10 PREMIÈRES INTERVENTIONS:');
    console.log('='.repeat(80));
    
    const interventionsToAnalyze = parsed.data.slice(0, 10);
    let countWithCosts = 0;
    let countWithArtisan = 0;
    let countWithStatus = 0;
    
    for (let i = 0; i < interventionsToAnalyze.length; i++) {
      const csvRow = interventionsToAnalyze[i];
      
      console.log(`\n--- INTERVENTION ${i + 1} ---`);
      
      try {
        // Mapper l'intervention
        const mapped = await mapper.mapInterventionFromCSV(csvRow, false);
        
        console.log(`ID: ${mapped.id_inter || 'NULL'}`);
        console.log(`Date: ${mapped.date || 'NULL'}`);
        console.log(`Statut ID: ${mapped.statut_id || 'NULL'}`);
        
        if (mapped.statut_id) countWithStatus++;
        
        // Analyser les coûts
        console.log('\n💰 COÛTS:');
        if (mapped.costs) {
          const hasCosts = 
            mapped.costs.sst !== null || 
            mapped.costs.materiel !== null || 
            mapped.costs.intervention !== null || 
            mapped.costs.total !== null;
          
          if (hasCosts) {
            countWithCosts++;
            console.log(`  ✅ Coûts trouvés:`);
            if (mapped.costs.sst !== null) console.log(`     - SST: ${mapped.costs.sst}€`);
            if (mapped.costs.materiel !== null) console.log(`     - Matériel: ${mapped.costs.materiel}€`);
            if (mapped.costs.intervention !== null) console.log(`     - Intervention: ${mapped.costs.intervention}€`);
            if (mapped.costs.total !== null) console.log(`     - Marge: ${mapped.costs.total}€`);
            if (mapped.costs.numeroSST) console.log(`     - Numéro SST: ${mapped.costs.numeroSST}`);
          } else {
            console.log(`  ❌ Aucun coût (tous null)`);
          }
          
          // Debug : afficher les valeurs brutes du CSV
          console.log('\n  📝 Valeurs brutes CSV:');
          console.log(`     - COUT SST: "${csvRow['COUT SST'] || 'N/A'}"`);
          console.log(`     - COÛT MATERIEL: "${csvRow['COÛT MATERIEL'] || 'N/A'}"`);
          console.log(`     - COUT INTER: "${csvRow['COUT INTER'] || 'N/A'}"`);
          console.log(`     - Numéro SST: "${csvRow['Numéro SST'] || 'N/A'}"`);
        } else {
          console.log(`  ❌ Objet costs manquant`);
        }
        
        // Analyser l'artisan SST
        console.log('\n👷 ARTISAN SST:');
        if (mapped.artisanSST) {
          countWithArtisan++;
          console.log(`  ✅ "${mapped.artisanSST}"`);
          console.log(`  📝 Valeur brute CSV: "${csvRow['SST'] || 'N/A'}"`);
        } else {
          console.log(`  ❌ Aucun artisan SST`);
          console.log(`  📝 Valeur brute CSV: "${csvRow['SST'] || 'N/A'}"`);
        }
        
      } catch (error) {
        console.error(`  ❌ Erreur mapping: ${error.message}`);
      }
    }
    
    // Résumé
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ (sur 10 interventions analysées)');
    console.log('='.repeat(80));
    console.log(`✅ Avec statut: ${countWithStatus}/10 (${(countWithStatus / 10 * 100).toFixed(0)}%)`);
    console.log(`💰 Avec coûts: ${countWithCosts}/10 (${(countWithCosts / 10 * 100).toFixed(0)}%)`);
    console.log(`👷 Avec artisan SST: ${countWithArtisan}/10 (${(countWithArtisan / 10 * 100).toFixed(0)}%)`);
    
    if (countWithCosts < 8) {
      console.log('\n⚠️  PROBLÈME DÉTECTÉ : Peu de coûts trouvés !');
      console.log('💡 Vérifier les noms de colonnes dans le CSV');
      console.log('💡 Vérifier la méthode extractCostsData() dans data-mapper.js');
    }
    
    if (countWithArtisan < 8) {
      console.log('\n⚠️  PROBLÈME DÉTECTÉ : Peu d\'artisans SST trouvés !');
      console.log('💡 Vérifier la colonne "SST" dans le CSV');
      console.log('💡 Vérifier que les noms d\'artisans sont bien renseignés');
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

