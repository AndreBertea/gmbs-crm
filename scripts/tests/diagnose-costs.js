#!/usr/bin/env node

/**
 * Script de diagnostic pour identifier les valeurs numériques problématiques
 * qui causent l'erreur "numeric field overflow" lors de l'import des coûts
 */

const fs = require('fs');
const path = require('path');

// Import du DataMapper pour utiliser la même logique de parsing
const DataMapper = require('../data-processing/data-mapper.js');

class CostDiagnostic {
  constructor() {
    this.dataMapper = new DataMapper();
    this.problematicValues = [];
    this.stats = {
      totalRows: 0,
      validCosts: 0,
      problematicCosts: 0,
      maxValues: {
        sst: 0,
        materiel: 0,
        intervention: 0,
        total: 0
      }
    };
    
    // Limite PostgreSQL numeric(12,2) = 9,999,999,999.99
    this.MAX_VALUE = 9999999999.99;
  }

  /**
   * Analyse un fichier CSV pour identifier les valeurs problématiques
   */
  async analyzeCSV(csvPath) {
    console.log(`🔍 Analyse du fichier: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Fichier non trouvé: ${csvPath}`);
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log(`📊 En-têtes détectés: ${headers.join(', ')}`);
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      this.stats.totalRows++;
      const values = this.parseCSVLine(lines[i]);
      const row = {};
      
      // Créer l'objet row avec les en-têtes
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      this.analyzeRow(row, i);
    }
    
    this.printReport();
  }

  /**
   * Parse une ligne CSV en gérant les virgules dans les valeurs
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim().replace(/"/g, ''));
    return values;
  }

  /**
   * Analyse une ligne pour identifier les valeurs problématiques
   */
  analyzeRow(row, rowNumber) {
    try {
      // Utiliser la même logique que le DataMapper
      const costsData = this.dataMapper.extractCostsData(row);
      
      // Vérifier chaque type de coût
      this.checkCostValue('sst', costsData.sst, rowNumber, row);
      this.checkCostValue('materiel', costsData.materiel, rowNumber, row);
      this.checkCostValue('intervention', costsData.intervention, rowNumber, row);
      this.checkCostValue('total', costsData.total, rowNumber, row);
      
      // Compter les coûts valides
      if (costsData.sst !== null || costsData.materiel !== null || 
          costsData.intervention !== null || costsData.total !== null) {
        this.stats.validCosts++;
      }
      
    } catch (error) {
      console.error(`❌ Erreur ligne ${rowNumber}: ${error.message}`);
    }
  }

  /**
   * Vérifie si une valeur de coût est problématique
   */
  checkCostValue(costType, value, rowNumber, row) {
    if (value === null || value === undefined) return;
    
    // Mettre à jour les statistiques
    if (value > this.stats.maxValues[costType]) {
      this.stats.maxValues[costType] = value;
    }
    
    // Vérifier si la valeur dépasse la limite
    if (Math.abs(value) > this.MAX_VALUE) {
      this.stats.problematicCosts++;
      
      this.problematicValues.push({
        row: rowNumber,
        costType,
        value,
        originalData: {
          'COUT SST': row['COUT SST'] || row['COÛT SST'] || '',
          'COÛT MATERIEL': row['COÛT MATERIEL'] || row['COUT MATERIEL'] || '',
          'COUT INTER': row['COUT INTER'] || row['COÛT INTER'] || '',
          'ID': row['ID'] || row['id_inter'] || ''
        }
      });
    }
  }

  /**
   * Affiche le rapport de diagnostic
   */
  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT DE DIAGNOSTIC - VALEURS NUMÉRIQUES');
    console.log('='.repeat(80));
    
    console.log(`\n📈 STATISTIQUES GÉNÉRALES:`);
    console.log(`  📄 Lignes analysées: ${this.stats.totalRows}`);
    console.log(`  ✅ Lignes avec coûts valides: ${this.stats.validCosts}`);
    console.log(`  ❌ Valeurs problématiques: ${this.stats.problematicCosts}`);
    
    console.log(`\n🔢 VALEURS MAXIMALES DÉTECTÉES:`);
    console.log(`  💰 SST: ${this.stats.maxValues.sst.toLocaleString('fr-FR')}€`);
    console.log(`  🔧 Matériel: ${this.stats.maxValues.materiel.toLocaleString('fr-FR')}€`);
    console.log(`  🏗️ Intervention: ${this.stats.maxValues.intervention.toLocaleString('fr-FR')}€`);
    console.log(`  📊 Total: ${this.stats.maxValues.total.toLocaleString('fr-FR')}€`);
    
    console.log(`\n⚠️ LIMITE POSTGRESQL numeric(12,2): ${this.MAX_VALUE.toLocaleString('fr-FR')}€`);
    
    if (this.problematicValues.length > 0) {
      console.log(`\n🚨 VALEURS PROBLÉMATIQUES DÉTECTÉES:`);
      console.log('='.repeat(80));
      
      this.problematicValues.forEach((item, index) => {
        console.log(`\n${index + 1}. Ligne ${item.row} - ${item.costType.toUpperCase()}`);
        console.log(`   Valeur parsée: ${item.value.toLocaleString('fr-FR')}€`);
        console.log(`   Données originales:`);
        Object.entries(item.originalData).forEach(([key, value]) => {
          if (value) console.log(`     ${key}: "${value}"`);
        });
      });
      
      console.log(`\n💡 RECOMMANDATIONS:`);
      console.log(`  1. Vérifier les données source (Google Sheets/CSV)`);
      console.log(`  2. Corriger les valeurs erronées dans le fichier source`);
      console.log(`  3. Ou modifier le schéma DB: ALTER TABLE intervention_costs ALTER COLUMN amount TYPE numeric(15,2);`);
      console.log(`  4. Ou ajouter une validation dans le parsing pour limiter les valeurs`);
      
    } else {
      console.log(`\n✅ Aucune valeur problématique détectée !`);
      console.log(`   Le problème pourrait venir d'ailleurs (calculs, conversions, etc.)`);
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Analyse un échantillon de données pour tester rapidement
   */
  async analyzeSample() {
    console.log('🧪 ANALYSE D\'ÉCHANTILLON - Valeurs de test');
    console.log('='.repeat(50));
    
    const testValues = [
      { 'COUT SST': '1000', 'COÛT MATERIEL': '500', 'COUT INTER': '2000' },
      { 'COUT SST': '9999999999.99', 'COÛT MATERIEL': '100', 'COUT INTER': '10000' },
      { 'COUT SST': '10000000000', 'COÛT MATERIEL': '200', 'COUT INTER': '15000' },
      { 'COUT SST': '2 976,55 dire 2900', 'COÛT MATERIEL': '1 500,25', 'COUT INTER': '5000' },
      { 'COUT SST': '2976550000', 'COÛT MATERIEL': '5000000000', 'COUT INTER': '8000000000' }
    ];
    
    testValues.forEach((row, index) => {
      console.log(`\nTest ${index + 1}:`);
      this.analyzeRow(row, index + 1);
    });
    
    this.printReport();
  }
}

// Fonction principale
async function main() {
  const diagnostic = new CostDiagnostic();
  
  // Vérifier les arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔍 DIAGNOSTIC DES VALEURS NUMÉRIQUES');
    console.log('='.repeat(50));
    console.log('\nUsage:');
    console.log('  node diagnose-costs.js <fichier.csv>     # Analyser un fichier CSV');
    console.log('  node diagnose-costs.js --sample          # Analyser des valeurs de test');
    console.log('\nExemples:');
    console.log('  node diagnose-costs.js data/samples/interventions.csv');
    console.log('  node diagnose-costs.js --sample');
    
    // Analyser un échantillon par défaut
    await diagnostic.analyzeSample();
    return;
  }
  
  if (args[0] === '--sample') {
    await diagnostic.analyzeSample();
  } else {
    const csvPath = args[0];
    await diagnostic.analyzeCSV(csvPath);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CostDiagnostic;

