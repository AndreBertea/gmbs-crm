#!/usr/bin/env node

/**
 * Script de test de cohérence des données
 * 
 * Compare les données entre :
 * 1. Google Sheets (source)
 * 2. API v2 (Edge Functions)
 * 3. Base de données (directement)
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

// Imports des modules de traitement
const { DataMapper } = require('../data-processing/data-mapper');
const { googleSheetsConfig } = require('../imports/config/google-sheets-config');

// Import de l'API v2 (si disponible)
let interventionsApiV2, artisansApiV2;
try {
  const apiV2 = require('../../src/lib/supabase-api-v2');
  interventionsApiV2 = apiV2.interventionsApiV2;
  artisansApiV2 = apiV2.artisansApiV2;
} catch (error) {
  console.log('⚠️  API v2 non disponible, tests API ignorés');
}

// Import du client Supabase existant
let supabaseAdmin;
try {
  const { supabaseAdmin: adminClient } = require('../../src/lib/supabase-client');
  supabaseAdmin = adminClient;
} catch (error) {
  console.log('⚠️  Client Supabase non disponible, tests DB ignorés');
}

class DataConsistencyTester {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.dataMapper = new DataMapper();
    this.results = {
      googleSheets: { interventions: 0, artisans: 0 },
      apiV2: { interventions: 0, artisans: 0 },
      database: { interventions: 0, artisans: 0 },
      comparisons: {
        interventions: { matches: 0, mismatches: 0, details: [] },
        artisans: { matches: 0, mismatches: 0, details: [] }
      }
    };
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

  // ===== TESTS GOOGLE SHEETS =====

  async testGoogleSheetsData() {
    console.log('\n📊 TEST GOOGLE SHEETS');
    console.log('=====================');
    
    try {
      // Test interventions
      const interventionsRange = process.env.GOOGLE_SHEETS_INTERVENTIONS_RANGE || 'SUIVI INTER GMBS 2025!A1:Z';
      const interventionsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: googleSheetsConfig.getSpreadsheetId(),
        range: interventionsRange
      });
      
      if (interventionsResponse.data.values && interventionsResponse.data.values.length > 0) {
        const interventionsRows = interventionsResponse.data.values.slice(1);
        this.results.googleSheets.interventions = interventionsRows.length;
        
        // Analyser les IDs
        const headers = interventionsResponse.data.values[0];
        const idColumnIndex = headers.findIndex(h => h && h.toLowerCase().includes('id'));
        
        let validIds = 0;
        let emptyIds = 0;
        
        interventionsRows.forEach(row => {
          const idValue = idColumnIndex >= 0 ? (row[idColumnIndex] || '') : '';
          const extractedId = this.dataMapper.extractInterventionId(idValue);
          if (extractedId) {
            validIds++;
          } else {
            emptyIds++;
          }
        });
        
        console.log(`  📋 Interventions: ${interventionsRows.length}`);
        console.log(`  ✅ IDs valides: ${validIds} (${((validIds / interventionsRows.length) * 100).toFixed(1)}%)`);
        console.log(`  ⚪ IDs vides: ${emptyIds} (${((emptyIds / interventionsRows.length) * 100).toFixed(1)}%)`);
      }
      
      // Test artisans
      const artisansRange = process.env.GOOGLE_SHEETS_ARTISANS_RANGE || 'BASE de DONNÉE SST ARTISANS!A1:Z';
      const artisansResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: googleSheetsConfig.getSpreadsheetId(),
        range: artisansRange
      });
      
      if (artisansResponse.data.values && artisansResponse.data.values.length > 0) {
        const artisansRows = artisansResponse.data.values.slice(1);
        this.results.googleSheets.artisans = artisansRows.length;
        
        console.log(`  👷 Artisans: ${artisansRows.length}`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur test Google Sheets: ${error.message}`);
    }
  }

  // ===== TESTS API V2 =====

  async testApiV2Data() {
    if (!interventionsApiV2 || !artisansApiV2) {
      console.log('\n⚠️  TESTS API V2 IGNORÉS (API non disponible)');
      return;
    }
    
    console.log('\n🔌 TEST API V2');
    console.log('==============');
    
    try {
      // Test interventions via API
      const interventionsApi = await interventionsApiV2.getAll({ limit: 100 });
      this.results.apiV2.interventions = interventionsApi.pagination.total;
      
      console.log(`  📋 Interventions (API): ${interventionsApi.pagination.total}`);
      console.log(`  📄 Récupérées: ${interventionsApi.data.length}`);
      
      // Analyser les IDs dans l'API
      let validIds = 0;
      let emptyIds = 0;
      
      interventionsApi.data.forEach(intervention => {
        if (intervention.id_inter && intervention.id_inter.trim() !== '') {
          validIds++;
        } else {
          emptyIds++;
        }
      });
      
      console.log(`  ✅ IDs valides: ${validIds} (${interventionsApi.data.length > 0 ? ((validIds / interventionsApi.data.length) * 100).toFixed(1) : 0}%)`);
      console.log(`  ⚪ IDs vides: ${emptyIds} (${interventionsApi.data.length > 0 ? ((emptyIds / interventionsApi.data.length) * 100).toFixed(1) : 0}%)`);
      
      // Test artisans via API
      const artisansApi = await artisansApiV2.getAll({ limit: 100 });
      this.results.apiV2.artisans = artisansApi.pagination.total;
      
      console.log(`  👷 Artisans (API): ${artisansApi.pagination.total}`);
      console.log(`  📄 Récupérés: ${artisansApi.data.length}`);
      
    } catch (error) {
      console.error(`❌ Erreur test API V2: ${error.message}`);
    }
  }

  // ===== TESTS BASE DE DONNÉES =====

  async testDatabaseData() {
    if (!supabaseAdmin) {
      console.log('\n⚠️  TESTS BASE DE DONNÉES IGNORÉS (Client non disponible)');
      return;
    }
    
    console.log('\n🗄️  TEST BASE DE DONNÉES');
    console.log('========================');
    
    try {
      // Test interventions en base - d'abord compter le total
      const { count: totalInterventions, error: countError } = await supabaseAdmin
        .from('interventions')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      console.log(`  📊 Total interventions en base: ${totalInterventions}`);
      
      // Récupérer les interventions récentes (derniers 30 jours pour avoir plus de données)
      const { data: interventionsDb, error: interventionsError } = await supabaseAdmin
        .from('interventions')
        .select('id, id_inter, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (interventionsError) {
        throw interventionsError;
      }
      
      this.results.database.interventions = totalInterventions;
      
      // Analyser les IDs en base
      let validIds = 0;
      let emptyIds = 0;
      let autoGeneratedIds = 0;
      
      interventionsDb.forEach(intervention => {
        if (intervention.id_inter && intervention.id_inter.trim() !== '') {
          if (intervention.id_inter.startsWith('AUTO-')) {
            autoGeneratedIds++;
          } else {
            validIds++;
          }
        } else {
          emptyIds++;
        }
      });
      
      console.log(`  📋 Interventions récentes analysées: ${interventionsDb.length}`);
      console.log(`  ✅ IDs valides: ${validIds} (${interventionsDb.length > 0 ? ((validIds / interventionsDb.length) * 100).toFixed(1) : 0}%)`);
      console.log(`  🤖 IDs auto-générés: ${autoGeneratedIds} (${interventionsDb.length > 0 ? ((autoGeneratedIds / interventionsDb.length) * 100).toFixed(1) : 0}%)`);
      console.log(`  ⚪ IDs vides: ${emptyIds} (${interventionsDb.length > 0 ? ((emptyIds / interventionsDb.length) * 100).toFixed(1) : 0}%)`);
      
      // Analyser les données récentes (derniers 7 jours)
      const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentInterventions = interventionsDb.filter(i => i.created_at >= recentDate);
      
      if (recentInterventions.length > 0) {
        let recentValidIds = 0;
        let recentAutoIds = 0;
        let recentEmptyIds = 0;
        
        recentInterventions.forEach(intervention => {
          if (intervention.id_inter && intervention.id_inter.trim() !== '') {
            if (intervention.id_inter.startsWith('AUTO-')) {
              recentAutoIds++;
            } else {
              recentValidIds++;
            }
          } else {
            recentEmptyIds++;
          }
        });
        
        console.log(`\n  📅 DONNÉES RÉCENTES (7 derniers jours): ${recentInterventions.length} interventions`);
        console.log(`  ✅ IDs valides: ${recentValidIds} (${((recentValidIds / recentInterventions.length) * 100).toFixed(1)}%)`);
        console.log(`  🤖 IDs auto-générés: ${recentAutoIds} (${((recentAutoIds / recentInterventions.length) * 100).toFixed(1)}%)`);
        console.log(`  ⚪ IDs vides: ${recentEmptyIds} (${((recentEmptyIds / recentInterventions.length) * 100).toFixed(1)}%)`);
      }
      
      // Test artisans en base - d'abord compter le total
      const { count: totalArtisans, error: artisansCountError } = await supabaseAdmin
        .from('artisans')
        .select('*', { count: 'exact', head: true });
      
      if (artisansCountError) {
        throw artisansCountError;
      }
      
      console.log(`  📊 Total artisans en base: ${totalArtisans}`);
      
      // Récupérer les artisans récents (derniers 30 jours)
      const { data: artisansDb, error: artisansError } = await supabaseAdmin
        .from('artisans')
        .select('id, prenom, nom, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (artisansError) {
        throw artisansError;
      }
      
      this.results.database.artisans = totalArtisans;
      
      console.log(`  👷 Artisans récents analysés: ${artisansDb.length}`);
      
    } catch (error) {
      console.error(`❌ Erreur test base de données: ${error.message}`);
    }
  }

  // ===== COMPARAISONS =====

  async compareData() {
    console.log('\n🔍 COMPARAISONS');
    console.log('================');
    
    // Comparaison interventions
    console.log('\n📋 INTERVENTIONS:');
    console.log(`  Google Sheets: ${this.results.googleSheets.interventions}`);
    console.log(`  API V2: ${this.results.apiV2.interventions}`);
    console.log(`  Base de données: ${this.results.database.interventions}`);
    
    // Vérifier la cohérence
    const sheetsVsDb = Math.abs(this.results.googleSheets.interventions - this.results.database.interventions);
    const apiVsDb = Math.abs(this.results.apiV2.interventions - this.results.database.interventions);
    
    if (sheetsVsDb === 0) {
      console.log('  ✅ Google Sheets ↔ Base de données: COHÉRENT');
    } else {
      console.log(`  ⚠️  Google Sheets ↔ Base de données: Écart de ${sheetsVsDb}`);
    }
    
    if (apiVsDb === 0) {
      console.log('  ✅ API V2 ↔ Base de données: COHÉRENT');
    } else {
      console.log(`  ⚠️  API V2 ↔ Base de données: Écart de ${apiVsDb}`);
    }
    
    // Comparaison artisans
    console.log('\n👷 ARTISANS:');
    console.log(`  Google Sheets: ${this.results.googleSheets.artisans}`);
    console.log(`  API V2: ${this.results.apiV2.artisans}`);
    console.log(`  Base de données: ${this.results.database.artisans}`);
    
    const sheetsVsDbArtisans = Math.abs(this.results.googleSheets.artisans - this.results.database.artisans);
    const apiVsDbArtisans = Math.abs(this.results.apiV2.artisans - this.results.database.artisans);
    
    if (sheetsVsDbArtisans === 0) {
      console.log('  ✅ Google Sheets ↔ Base de données: COHÉRENT');
    } else {
      console.log(`  ⚠️  Google Sheets ↔ Base de données: Écart de ${sheetsVsDbArtisans}`);
    }
    
    if (apiVsDbArtisans === 0) {
      console.log('  ✅ API V2 ↔ Base de données: COHÉRENT');
    } else {
      console.log(`  ⚠️  API V2 ↔ Base de données: Écart de ${apiVsDbArtisans}`);
    }
  }

  // ===== RAPPORT FINAL =====

  generateReport() {
    console.log('\n📊 RAPPORT FINAL');
    console.log('=================');
    
    const report = {
      timestamp: new Date().toISOString(),
      googleSheets: this.results.googleSheets,
      apiV2: this.results.apiV2,
      database: this.results.database,
      summary: {
        interventionsConsistent: this.results.googleSheets.interventions === this.results.database.interventions,
        artisansConsistent: this.results.googleSheets.artisans === this.results.database.artisans,
        totalDataPoints: this.results.googleSheets.interventions + this.results.googleSheets.artisans
      }
    };
    
    console.log(JSON.stringify(report, null, 2));
    
    // Sauvegarder le rapport
    const reportPath = './data/imports/processed/consistency-report.json';
    if (!fs.existsSync('./data/imports/processed')) {
      fs.mkdirSync('./data/imports/processed', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Rapport sauvegardé: ${reportPath}`);
  }

  // ===== WORKFLOW PRINCIPAL =====

  async run() {
    console.log('🚀 DÉMARRAGE DES TESTS DE COHÉRENCE');
    console.log('===================================');
    
    try {
      await this.initialize();
      await this.testGoogleSheetsData();
      await this.testApiV2Data();
      await this.testDatabaseData();
      await this.compareData();
      this.generateReport();
      
      console.log('\n✅ Tests de cohérence terminés');
      
    } catch (error) {
      console.error(`❌ Erreur lors des tests: ${error.message}`);
      throw error;
    }
  }
}

async function main() {
  const tester = new DataConsistencyTester();
  
  try {
    await tester.run();
  } catch (error) {
    console.error(`💥 Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DataConsistencyTester };
