#!/usr/bin/env node

/**
 * Script de diagnostic pour identifier pourquoi id_inter est NULL
 * 
 * Ce script analyse les données brutes du Google Sheets pour voir
 * comment la colonne ID est traitée.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

// Imports des modules de traitement
const { DataMapper } = require('../data-processing/data-mapper');
const { googleSheetsConfig } = require('../imports/config/google-sheets-config');

class InterventionIdAnalyzer {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.dataMapper = new DataMapper();
  }

  async initialize() {
    try {
      const credentials = googleSheetsConfig.getCredentials();
      const spreadsheetId = googleSheetsConfig.getSpreadsheetId();
      
      if (!credentials || !spreadsheetId) {
        throw new Error('Configuration Google Sheets incomplète');
      }

      this.auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('✅ Connexion Google Sheets établie');
      
    } catch (error) {
      console.error(`❌ Erreur initialisation: ${error.message}`);
      throw error;
    }
  }

  async debugInterventionIds() {
    console.log('🔍 Diagnostic des IDs d\'intervention...\n');
    
    try {
      const spreadsheetId = googleSheetsConfig.getSpreadsheetId();
      const range = process.env.GOOGLE_SHEETS_INTERVENTIONS_RANGE || 'SUIVI INTER GMBS 2025!A1:Z';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range
      });
      
      if (!response.data.values || response.data.values.length === 0) {
        console.log('⚠️  Aucune donnée trouvée');
        return;
      }
      
      const headers = response.data.values[0];
      const rows = response.data.values.slice(1);
      
      console.log('📋 En-têtes détectés:');
      headers.forEach((header, index) => {
        console.log(`  ${index}: "${header}"`);
      });
      
      // Trouver l'index de la colonne ID
      const idColumnIndex = headers.findIndex(header => 
        header && (
          header.toLowerCase().includes('id') ||
          header.toLowerCase().includes('numéro') ||
          header.toLowerCase().includes('numero')
        )
      );
      
      console.log(`\n🎯 Colonne ID trouvée à l'index: ${idColumnIndex}`);
      if (idColumnIndex >= 0) {
        console.log(`   Nom de la colonne: "${headers[idColumnIndex]}"`);
      }
      
      // Analyser les premières lignes
      console.log('\n📊 Analyse des 10 premières lignes:');
      console.log('Ligne | Valeur brute | Valeur extraite | Résultat');
      console.log('------|--------------|-----------------|---------');
      
      let nullCount = 0;
      let emptyCount = 0;
      let validCount = 0;
      
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        const rawValue = idColumnIndex >= 0 ? (row[idColumnIndex] || '') : '';
        const extractedValue = this.dataMapper.extractInterventionId(rawValue);
        const result = extractedValue ? '✅ VALIDE' : '❌ NULL';
        
        console.log(`${(i + 1).toString().padStart(4)} | ${rawValue.toString().padEnd(12)} | ${(extractedValue || 'NULL').toString().padEnd(15)} | ${result}`);
        
        if (!extractedValue) {
          if (!rawValue || rawValue.trim() === '') {
            emptyCount++;
          } else {
            nullCount++;
          }
        } else {
          validCount++;
        }
      }
      
      // Statistiques globales
      console.log('\n📈 Statistiques globales (toutes les lignes):');
      let globalNullCount = 0;
      let globalEmptyCount = 0;
      let globalValidCount = 0;
      let sampleValues = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawValue = idColumnIndex >= 0 ? (row[idColumnIndex] || '') : '';
        const extractedValue = this.dataMapper.extractInterventionId(rawValue);
        
        if (!extractedValue) {
          if (!rawValue || rawValue.trim() === '') {
            globalEmptyCount++;
          } else {
            globalNullCount++;
            // Collecter quelques exemples de valeurs qui échouent
            if (sampleValues.length < 5 && rawValue.trim() !== '') {
              sampleValues.push(rawValue);
            }
          }
        } else {
          globalValidCount++;
        }
      }
      
      console.log(`  ✅ IDs valides: ${globalValidCount} (${((globalValidCount / rows.length) * 100).toFixed(1)}%)`);
      console.log(`  ❌ IDs NULL (valeur non vide): ${globalNullCount} (${((globalNullCount / rows.length) * 100).toFixed(1)}%)`);
      console.log(`  ⚪ IDs vides: ${globalEmptyCount} (${((globalEmptyCount / rows.length) * 100).toFixed(1)}%)`);
      console.log(`  📊 Total lignes: ${rows.length}`);
      
      if (sampleValues.length > 0) {
        console.log('\n🔍 Exemples de valeurs qui échouent à l\'extraction:');
        sampleValues.forEach((value, index) => {
          console.log(`  ${index + 1}. "${value}"`);
        });
      }
      
      // Test de la fonction extractInterventionId
      console.log('\n🧪 Test de la fonction extractInterventionId:');
      const testValues = [
        '11754',
        '11754 inter meme adresse',
        'INT-2025-001',
        'ABC123',
        '123.456',
        '',
        '   ',
        'TEXT_WITHOUT_NUMBERS'
      ];
      
      testValues.forEach(testValue => {
        const result = this.dataMapper.extractInterventionId(testValue);
        console.log(`  "${testValue}" -> "${result || 'NULL'}"`);
      });
      
    } catch (error) {
      console.error(`❌ Erreur lors du diagnostic: ${error.message}`);
    }
  }
}

async function main() {
  const analyzer = new InterventionIdAnalyzer();
  
  try {
    await analyzer.initialize();
    await analyzer.debugInterventionIds();
  } catch (error) {
    console.error(`💥 Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { InterventionIdAnalyzer };
