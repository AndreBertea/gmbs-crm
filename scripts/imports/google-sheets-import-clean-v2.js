#!/usr/bin/env node

/**
 * Script Principal d'Import Google Sheets V2 - GMBS CRM
 * 
 * Version refactorisée utilisant l'API modulaire V2 pour l'import des données 
 * depuis Google Sheets vers la base de données Supabase.
 * 
 * Usage:
 *   node scripts/imports/google-sheets-import-clean-v2.js [options]
 * 
 * Options:
 *   --test                 Mode test (génère rapport dans data/imports/processed)
 *   --artisans-only        Importer uniquement les artisans
 *   --interventions-only   Importer uniquement les interventions
 *   --dry-run              Mode test sans écriture en base
 *   --verbose              Affichage détaillé
 *   --limit=N              Limiter le nombre d'interventions/artisans (pour debug)
 *   --batch-size=N         Taille des lots (défaut: 50)
 *   --credentials=PATH     Chemin vers credentials.json (défaut: ./credentials.json)
 *   --spreadsheet-id=ID    ID du Google Spreadsheet
 *   --help                 Afficher cette aide
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { DatabaseManager } = require('./database/database-manager-v2');

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

// Imports des modules de traitement existants
const { DataMapper } = require('../data-processing/data-mapper');
const { dataValidator } = require('../data-processing/data-validator');
const { googleSheetsConfig } = require('./config/google-sheets-config');
const { ReportGenerator } = require('./reporting/report-generator');

class GoogleSheetsImportCleanV2 {
  constructor(options = {}) {
    this.options = {
      test: options.test || false,
      artisansOnly: options.artisansOnly || false,
      interventionsOnly: options.interventionsOnly || false,
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      limit: options.limit || null, // Limite pour debug
      batchSize: options.batchSize || 100,
      credentialsPath: options.credentialsPath || './credentials.json',
      spreadsheetId: options.spreadsheetId || null,
      upsert: options.upsert || false,
      ...options
    };
    
    this.sheets = null;
    this.auth = null;
    this.dataMapper = new DataMapper();
    
    // Utiliser le nouveau DatabaseManager V2 avec l'API modulaire
    this.databaseManager = new DatabaseManager({
      dryRun: this.options.dryRun,
      verbose: this.options.verbose,
      batchSize: this.options.batchSize,
      upsert: this.options.upsert,
      dataMapper: this.dataMapper // Passer la référence au DataMapper
    });
    
    this.reportGenerator = new ReportGenerator({
      dryRun: this.options.dryRun,
      verbose: this.options.verbose
    });
    
    this.results = {
      artisans: { processed: 0, valid: 0, invalid: 0, inserted: 0, errors: 0 },
      interventions: { processed: 0, valid: 0, invalid: 0, inserted: 0, errors: 0 },
      clients: { processed: 0, valid: 0, invalid: 0, inserted: 0, errors: 0 },
      costs: { processed: 0, valid: 0, invalid: 0, inserted: 0, errors: 0 }
    };
  }

  // ===== AFFICHAGE DE LA CONFIGURATION =====

  /**
   * Affiche les variables d'environnement détectées
   */
  showEnvironmentVariables() {
    console.log('🔧 Variables d\'environnement détectées:\n');
    
    // Variables spécifiques au projet
    const projectVars = [
      'GOOGLE_CREDENTIALS_PATH',
      'GOOGLE_SHEETS_ID',
      'GOOGLE_SHEETS_ARTISANS_RANGE',
      'GOOGLE_SHEETS_INTERVENTIONS_RANGE'
    ];
    
    // Variables génériques
    const genericVars = [
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_SPREADSHEET_ID'
    ];
    
    console.log('📋 Variables spécifiques au projet:');
    projectVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`  ✅ ${varName}: ${value}`);
      } else {
        console.log(`  ❌ ${varName}: Non définie`);
      }
    });
    
    console.log('\n📋 Variables génériques:');
    genericVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        if (varName.includes('KEY')) {
          console.log(`  ✅ ${varName}: Définie (${value.length} caractères)`);
        } else {
          console.log(`  ✅ ${varName}: ${value}`);
        }
      } else {
        console.log(`  ❌ ${varName}: Non définie`);
      }
    });
    
    // Afficher la configuration centralisée
    console.log('\n🔧 Configuration centralisée:');
    googleSheetsConfig.displayConfig();
  }

  // ===== INITIALISATION =====

  /**
   * Initialise l'authentification Google Sheets
   */
  async initializeAuth() {
    try {
      console.log('🔐 Initialisation de l\'authentification Google Sheets...');
      
      // Utiliser la configuration centralisée
      const credentials = googleSheetsConfig.getCredentials();
      
      if (!credentials || !credentials.client_email || !credentials.private_key) {
        throw new Error('Configuration Google Sheets incomplète. Vérifiez les variables d\'environnement.');
      }
      
      // Créer l'authentification JWT avec la syntaxe correcte
      this.auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      
      // Initialiser l'API Sheets
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('✅ Authentification Google Sheets initialisée');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de l\'authentification:', error.message);
      return false;
    }
  }

  /**
   * Teste la connexion à Google Sheets
   */
  async testConnectionToSheets() {
    try {
      console.log('🔌 Test de connexion à Google Sheets...');
      
      const spreadsheetId = googleSheetsConfig.getSpreadsheetId();
      
      if (!spreadsheetId) {
        throw new Error('ID du spreadsheet non défini');
      }
      
      // Test simple de lecture
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        fields: 'properties.title'
      });
      
      console.log(`✅ Connexion réussie - Spreadsheet: "${response.data.properties.title}"`);
      return true;
      
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      return false;
    }
  }

  // ===== IMPORT DES DONNÉES =====

  /**
   * Importe les artisans depuis Google Sheets
   */
  async importArtisans() {
    try {
      console.log('👷 Import des artisans...');
      
      const spreadsheetId = googleSheetsConfig.getSpreadsheetId();
      const range = process.env.GOOGLE_SHEETS_ARTISANS_RANGE || 'Artisans!A:Z';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range
      });
      
      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        console.log('⚠️ Aucune donnée d\'artisan trouvée');
        return { success: 0, errors: 0 };
      }
      
      // Traitement des données
      const headers = rows[0];
      let dataRows = rows.slice(1);
      
      // Appliquer la limite si spécifiée (pour debug)
      if (this.options.limit && this.options.limit > 0) {
        console.log(`⚠️  MODE DEBUG: Limitation à ${this.options.limit} artisans`);
        dataRows = dataRows.slice(0, this.options.limit);
      }
      
      console.log(`📊 ${dataRows.length} lignes d'artisans à traiter`);
      
      // Conversion des données en objets
      const validArtisans = [];
      const invalidArtisans = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Créer un objet à partir des headers et de la row
        const artisanObj = {};
        headers.forEach((header, index) => {
          artisanObj[header] = row[index] || '';
        });
        
        try {
          // Mapper les données avec le DataMapper
          const mappedArtisan = await this.dataMapper.mapArtisanFromCSV(artisanObj);
          
          if (mappedArtisan) {
            validArtisans.push(mappedArtisan);
            this.results.artisans.valid++;
          } else {
            invalidArtisans.push({ row: i + 2, reason: 'Ligne vide ou invalide' });
            this.results.artisans.invalid++;
          }
        } catch (error) {
          invalidArtisans.push({ row: i + 2, error: error.message });
          this.results.artisans.invalid++;
        }
        
        this.results.artisans.processed++;
      }
      
      // Insertion en base de données
      if (validArtisans.length > 0) {
        const insertResults = await this.databaseManager.insertArtisans(validArtisans);
        this.results.artisans.inserted += insertResults.success;
        this.results.artisans.errors += insertResults.errors;
      }
      
      console.log(`✅ Artisans importés: ${this.results.artisans.inserted} succès, ${this.results.artisans.errors} erreurs`);
      
      return {
        success: this.results.artisans.inserted,
        errors: this.results.artisans.errors,
        invalid: invalidArtisans
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import des artisans:', error.message);
      return { success: 0, errors: 1 };
    }
  }

  /**
   * Importe les interventions depuis Google Sheets
   */
  async importInterventions() {
    try {
      console.log('🔧 Import des interventions...');
      
      const spreadsheetId = googleSheetsConfig.getSpreadsheetId();
      const range = process.env.GOOGLE_SHEETS_INTERVENTIONS_RANGE || 'Interventions!A:Z';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range
      });
      
      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        console.log('⚠️ Aucune donnée d\'intervention trouvée');
        return { success: 0, errors: 0 };
      }
      
      // Traitement des données
      const headers = rows[0];
      let dataRows = rows.slice(1);
      
      // Appliquer la limite si spécifiée (pour debug)
      if (this.options.limit && this.options.limit > 0) {
        console.log(`⚠️  MODE DEBUG: Limitation à ${this.options.limit} interventions`);
        dataRows = dataRows.slice(0, this.options.limit);
      }
      
      console.log(`📊 ${dataRows.length} lignes d'interventions à traiter`);
      
      // Conversion des données en objets
      const validInterventions = [];
      const invalidInterventions = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Créer un objet à partir des headers et de la row
        const interventionObj = {};
        headers.forEach((header, index) => {
          interventionObj[header] = row[index] || '';
        });
        
        try {
          // Mapper les données avec le DataMapper
          const mappedIntervention = await this.dataMapper.mapInterventionFromCSV(interventionObj, this.options.verbose);
          
          if (mappedIntervention) {
            validInterventions.push(mappedIntervention);
            this.results.interventions.valid++;
          } else {
            invalidInterventions.push({ row: i + 2, reason: 'Ligne vide ou invalide' });
            this.results.interventions.invalid++;
          }
        } catch (error) {
          invalidInterventions.push({ row: i + 2, error: error.message });
          this.results.interventions.invalid++;
        }
        
        this.results.interventions.processed++;
      }
      
      // Insertion en base de données
      if (validInterventions.length > 0) {
        const insertResults = await this.databaseManager.insertInterventions(validInterventions);
        this.results.interventions.inserted += insertResults.success;
        this.results.interventions.errors += insertResults.errors;
      }
      
      console.log(`✅ Interventions importées: ${this.results.interventions.inserted} succès, ${this.results.interventions.errors} erreurs`);
      
      return {
        success: this.results.interventions.inserted,
        errors: this.results.interventions.errors,
        invalid: invalidInterventions
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import des interventions:', error.message);
      return { success: 0, errors: 1 };
    }
  }

  // ===== IMPORT PRINCIPAL =====

  /**
   * Lance l'import complet
   */
  async importAll() {
    try {
      console.log('🚀 Démarrage de l\'import Google Sheets V2...');
      
      // Test de connexion (l'auth est déjà initialisée)
      if (!await this.testConnectionToSheets()) {
        throw new Error('Échec du test de connexion');
      }
      
      // Import selon les options
      if (this.options.artisansOnly) {
        await this.importArtisans();
      } else if (this.options.interventionsOnly) {
        await this.importInterventions();
      } else {
        // Import complet
        await this.importArtisans();
        await this.importInterventions();
      }
      
      // Génération du rapport
      await this.generateReport();
      
      console.log('✅ Import terminé avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error.message);
      throw error;
    }
  }

  /**
   * Génère le rapport final
   */
  async generateReport() {
    try {
      console.log('\n📊 Rapport d\'import:');
      console.log('='.repeat(50));
      
      console.log('👷 Artisans:');
      console.log(`  - Traités: ${this.results.artisans.processed}`);
      console.log(`  - Valides: ${this.results.artisans.valid}`);
      console.log(`  - Invalides: ${this.results.artisans.invalid}`);
      console.log(`  - Insérés: ${this.results.artisans.inserted}`);
      console.log(`  - Erreurs: ${this.results.artisans.errors}`);
      
      console.log('\n🔧 Interventions:');
      console.log(`  - Traitées: ${this.results.interventions.processed}`);
      console.log(`  - Valides: ${this.results.interventions.valid}`);
      console.log(`  - Invalides: ${this.results.interventions.invalid}`);
      console.log(`  - Insérées: ${this.results.interventions.inserted}`);
      console.log(`  - Erreurs: ${this.results.interventions.errors}`);
      
      console.log('\n👥 Clients:');
      console.log(`  - Traités: ${this.results.clients.processed}`);
      console.log(`  - Valides: ${this.results.clients.valid}`);
      console.log(`  - Invalides: ${this.results.clients.invalid}`);
      console.log(`  - Insérés: ${this.results.clients.inserted}`);
      console.log(`  - Erreurs: ${this.results.clients.errors}`);
      
      // Générer le rapport détaillé si demandé
      if (this.options.test || this.options.verbose) {
        try {
          // Vérifier si la méthode existe avant de l'appeler
          if (this.reportGenerator && typeof this.reportGenerator.generateDetailedReport === 'function') {
            await this.reportGenerator.generateDetailedReport(this.results);
          } else {
            console.log('ℹ️ Rapport détaillé non disponible (méthode non implémentée)');
          }
        } catch (reportError) {
          console.log('⚠️ Impossible de générer le rapport détaillé:', reportError.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport:', error.message);
    }
  }

  // ===== MÉTHODES DE CONFIGURATION =====

  setDryRun(enabled = true) {
    this.options.dryRun = enabled;
    this.databaseManager.options.dryRun = enabled;
    console.log(`🔧 Mode dry-run ${enabled ? 'activé' : 'désactivé'}`);
  }

  setVerbose(enabled = true) {
    this.options.verbose = enabled;
    this.databaseManager.options.verbose = enabled;
    console.log(`🔧 Mode verbose ${enabled ? 'activé' : 'désactivé'}`);
  }

  setBatchSize(size) {
    this.options.batchSize = size;
    this.databaseManager.options.batchSize = size;
    console.log(`🔧 Taille des lots définie à ${size}`);
  }

  // ===== MÉTHODES DE DIAGNOSTIC =====

  async testConnection() {
    console.log('🔌 Test de connexion à la base de données...');
    
    try {
      // Test simple avec la nouvelle API
      const { usersApi } = require('../../src/lib/api/v2');
      const users = await usersApi.getAll({ limit: 1 });
      
      console.log('✅ Connexion à la base de données réussie');
      return true;
    } catch (error) {
      console.log(`❌ Erreur de connexion: ${error.message}`);
      return false;
    }
  }

  async validateConfiguration() {
    console.log('⚙️ Validation de la configuration...');
    
    const issues = [];
    
    // Vérifier la configuration Google Sheets
    const config = googleSheetsConfig.getConfig();
    if (!config.clientEmail || !config.privateKey) {
      issues.push('Configuration Google Sheets manquante');
    }
    
    // Vérifier la configuration de la base de données
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      issues.push('Configuration base de données manquante');
    }
    
    if (issues.length > 0) {
      console.log(`⚠️ Problèmes de configuration détectés: ${issues.join(', ')}`);
      return false;
    }
    
    console.log('✅ Configuration validée');
    return true;
  }
}

// ===== FONCTIONS UTILITAIRES =====

function createImportInstance(options = {}) {
  return new GoogleSheetsImportCleanV2(options);
}

function createDryRunInstance() {
  return new GoogleSheetsImportCleanV2({
    dryRun: true,
    verbose: true
  });
}

function createVerboseInstance() {
  return new GoogleSheetsImportCleanV2({
    verbose: true
  });
}

// ===== EXPORTS =====

module.exports = {
  GoogleSheetsImportCleanV2,
  createImportInstance,
  createDryRunInstance,
  createVerboseInstance
};

// ===== SCRIPT PRINCIPAL =====

if (require.main === module) {
  async function main() {
    try {
      const args = process.argv.slice(2);
      
      // Afficher l'aide si demandé
      if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🚀 Script d'Import Google Sheets V2 - GMBS CRM

Usage:
  npx tsx scripts/imports/google-sheets-import-clean-v2.js [options]

Options:
  --help, -h                 Afficher cette aide
  --test                     Mode test (génère rapport dans data/imports/processed)
  --artisans-only            Importer uniquement les artisans
  --interventions-only       Importer uniquement les interventions
  --dry-run                  Mode test sans écriture en base
  --verbose                  Affichage détaillé
  --limit=N                  Limiter le nombre d'interventions/artisans (pour debug)
  --batch-size=N             Taille des lots (défaut: 50)
  --credentials=PATH         Chemin vers credentials.json (défaut: ./credentials.json)
  --spreadsheet-id=ID        ID du Google Spreadsheet
  --test-connection          Tester la connexion à la base de données
  --validate-config          Valider la configuration

Exemples:
  # Import complet
  npx tsx scripts/imports/google-sheets-import-clean-v2.js

  # Import en mode dry-run avec verbose
  npx tsx scripts/imports/google-sheets-import-clean-v2.js --dry-run --verbose

  # Import des artisans uniquement
  npx tsx scripts/imports/google-sheets-import-clean-v2.js --artisans-only

  # Import rapide pour debug (10 premières interventions)
  npx tsx scripts/imports/google-sheets-import-clean-v2.js --interventions-only --limit=10 --verbose

  # Test de connexion
  npx tsx scripts/imports/google-sheets-import-clean-v2.js --test-connection
        `);
        return;
      }
      
      const options = {};

      // Parsing des arguments
      if (args.includes('--dry-run')) options.dryRun = true;
      if (args.includes('--verbose')) options.verbose = true;
      if (args.includes('--test')) options.test = true;
      if (args.includes('--artisans-only')) options.artisansOnly = true;
      if (args.includes('--interventions-only')) options.interventionsOnly = true;
      
      // Limite pour debug
      const limitArg = args.find(arg => arg.startsWith('--limit='));
      if (limitArg) {
        options.limit = parseInt(limitArg.split('=')[1]) || null;
      }
      
      // Taille des lots
      const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
      if (batchSizeArg) {
        options.batchSize = parseInt(batchSizeArg.split('=')[1]) || 50;
      }
      
      // Credentials
      const credentialsArg = args.find(arg => arg.startsWith('--credentials='));
      if (credentialsArg) {
        options.credentialsPath = credentialsArg.split('=')[1];
      }
      
      // Spreadsheet ID
      const spreadsheetArg = args.find(arg => arg.startsWith('--spreadsheet-id='));
      if (spreadsheetArg) {
        options.spreadsheetId = spreadsheetArg.split('=')[1];
      }

      // Tests de connexion et configuration
      if (args.includes('--test-connection')) {
        const instance = new GoogleSheetsImportCleanV2(options);
        await instance.testConnection();
        return;
      }
      if (args.includes('--validate-config')) {
        const instance = new GoogleSheetsImportCleanV2(options);
        await instance.validateConfiguration();
        return;
      }

      // Déterminer le type d'import
      const instance = new GoogleSheetsImportCleanV2(options);
      
      // Initialiser l'authentification pour tous les types d'import
      if (!await instance.initializeAuth()) {
        throw new Error('Échec de l\'initialisation de l\'authentification');
      }
      
      if (args.includes('--artisans-only')) {
        await instance.importArtisans();
      } else if (args.includes('--interventions-only')) {
        await instance.importInterventions();
      } else {
        // Import complet
        await instance.importAll();
      }
      
      // Afficher les rapports si les méthodes existent
      if (typeof instance.databaseManager.displayInvalidInterventionsReport === 'function') {
        instance.databaseManager.displayInvalidInterventionsReport();
      }
      
      if (typeof instance.databaseManager.displayUnmappedArtisansReport === 'function') {
        instance.databaseManager.displayUnmappedArtisansReport();
      }
      
      if (typeof instance.databaseManager.displayCostsDebugReport === 'function') {
        instance.databaseManager.displayCostsDebugReport();
      }
      
      // Sauvegarder les rapports si les méthodes existent
      if (typeof instance.databaseManager.saveInvalidInterventionsReport === 'function') {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const invalidInterventionsPath = `./data/imports/reports/invalid-interventions-${timestamp}.json`;
        await instance.databaseManager.saveInvalidInterventionsReport(invalidInterventionsPath);
      }
      
      if (typeof instance.databaseManager.saveUnmappedArtisansReport === 'function') {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const unmappedArtisansPath = `./data/imports/reports/unmapped-artisans-${timestamp}.json`;
        await instance.databaseManager.saveUnmappedArtisansReport(unmappedArtisansPath);
      }

    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      process.exit(1);
    }
  }

  main();
}