#!/usr/bin/env node

/**
 * Script Principal d'Import Google Sheets - GMBS CRM
 * 
 * Script unique et modulaire pour l'import des données depuis Google Sheets
 * vers la base de données Supabase.
 * 
 * Usage:
 *   node scripts/imports/google-sheets-import.js [options]
 * 
 * Options:
 *   --test                 Mode test (génère rapport dans data/imports/processed)
 *   --artisans-only        Importer uniquement les artisans
 *   --interventions-only   Importer uniquement les interventions
 *   --dry-run              Mode test sans écriture en base
 *   --verbose              Affichage détaillé
 *   --batch-size=N         Taille des lots (défaut: 50)
 *   --credentials=PATH     Chemin vers credentials.json (défaut: ./credentials.json)
 *   --spreadsheet-id=ID    ID du Google Spreadsheet
 *   --help                 Afficher cette aide
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

// Imports des modules de traitement
const { DataMapper } = require('../data-processing/data-mapper');
const { dataValidator } = require('../data-processing/data-validator');
const { DatabaseManager } = require('./database/database-manager-clean');
const { googleSheetsConfig } = require('./config/google-sheets-config');
const { ReportGenerator } = require('./reporting/report-generator');

class GoogleSheetsImporter {
  constructor(options = {}) {
    this.options = {
      test: options.test || false,
      artisansOnly: options.artisansOnly || false,
      interventionsOnly: options.interventionsOnly || false,
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      batchSize: options.batchSize || 50,
      credentialsPath: options.credentialsPath || './credentials.json',
      spreadsheetId: options.spreadsheetId || null,
      upsert: options.upsert || false,
      ...options
    };
    
    this.sheets = null;
    this.auth = null;
    this.dataMapper = new DataMapper();
    this.databaseManager = new DatabaseManager({
      dryRun: this.options.dryRun,
      verbose: this.options.verbose,
      batchSize: this.options.batchSize,
      upsert: this.options.upsert
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
   * Initialise la connexion Google Sheets avec l'API native
   */
  async initialize() {
    try {
      // Utiliser la même méthode que dans test-config.js
      const credentials = googleSheetsConfig.getCredentials();
      const spreadsheetId = this.options.spreadsheetId || googleSheetsConfig.getSpreadsheetId();
      
      if (!credentials || !spreadsheetId) {
        throw new Error('Configuration Google Sheets incomplète. Vérifiez vos variables d\'environnement ou credentials.json');
      }

      // Initialiser l'API avec la même méthode que dans test-config.js
      this.auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Tester la connexion
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });
      
      this.log('✅ Connexion Google Sheets établie', 'success');
      this.log(`📄 Document: ${response.data.properties.title}`, 'info');
      this.log(`🔗 Spreadsheet ID: ${spreadsheetId}`, 'info');
      
    } catch (error) {
      this.log(`❌ Erreur initialisation Google Sheets: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===== LECTURE DES DONNÉES =====

  /**
   * Lit les données artisans depuis Google Sheets avec l'API native
   */
  async readArtisansData() {
    this.log('📖 Lecture des données artisans...', 'info');
    
    try {
      const spreadsheetId = googleSheetsConfig.getSpreadsheetId();
      const range = process.env.GOOGLE_SHEETS_ARTISANS_RANGE || 'BASE de DONNÉE SST ARTISANS!A1:Z';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range
      });
      
      if (!response.data.values || response.data.values.length === 0) {
        this.log('⚠️  Aucune donnée trouvée pour les artisans', 'warn');
        return [];
      }
      
      // Convertir en format CSV-like pour le DataMapper
      const headers = response.data.values[0];
      const rows = response.data.values.slice(1);
      
      const artisansData = rows.map(row => {
        const artisan = {};
        headers.forEach((header, index) => {
          artisan[header] = row[index] || '';
        });
        return artisan;
      });
      
      this.log(`✅ ${artisansData.length} artisans chargés`, 'success');
      return artisansData;
      
    } catch (error) {
      this.log(`❌ Erreur lecture artisans: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Lit les données interventions depuis Google Sheets avec l'API native
   */
  async readInterventionsData() {
    this.log('📖 Lecture des données interventions...', 'info');
    
    try {
      const spreadsheetId = googleSheetsConfig.getSpreadsheetId();
      const range = process.env.GOOGLE_SHEETS_INTERVENTIONS_RANGE || 'SUIVI INTER GMBS 2025!A1:Z';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range
      });
      
      if (!response.data.values || response.data.values.length === 0) {
        this.log('⚠️  Aucune donnée trouvée pour les interventions', 'warn');
        return [];
      }
      
      // Convertir en format CSV-like pour le DataMapper
      const headers = response.data.values[0];
      const rows = response.data.values.slice(1);
      
      const interventionsData = rows.map(row => {
        const intervention = {};
        headers.forEach((header, index) => {
          intervention[header] = row[index] || '';
        });
        return intervention;
      });
      
      this.log(`✅ ${interventionsData.length} interventions chargées`, 'success');
      return interventionsData;
      
    } catch (error) {
      this.log(`❌ Erreur lecture interventions: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===== TRAITEMENT DES DONNÉES =====

  /**
   * Traite les données d'artisans
   */
  async processArtisans(artisansData) {
    this.log('🔄 Traitement des artisans...', 'info');
    
    const results = {
      processed: 0,
      valid: 0,
      invalid: 0,
      mapped: [],
      errors: []
    };

    for (let i = 0; i < artisansData.length; i++) {
      const artisanData = artisansData[i];
      
      try {
        // Mapper les données
        const mappedArtisan = await this.dataMapper.mapArtisanFromCSV(artisanData);
        
        // Si la ligne est vide (pas de nom/prénom), l'ignorer
        if (!mappedArtisan) {
          if (this.options.verbose) {
            this.log(`⚠️  Artisan ${i + 1}: Ligne vide ignorée`, 'verbose');
          }
          continue;
        }
        
        // Compter seulement les lignes non vides
        results.processed++;
        
        // Gérer la colonne Document Drive
        if (artisanData['Document Drive']) {
          mappedArtisan.document_drive_url = this.processDriveUrl(artisanData['Document Drive']);
        }
        
        // Valider les données mappées
        const validation = dataValidator.validate(mappedArtisan, 'artisan');
        
        if (validation.isValid) {
          results.valid++;
          results.mapped.push({
            original: artisanData,
            mapped: mappedArtisan,
            validation: validation
          });
          
          // Enregistrer les warnings même pour les artisans valides
          if (validation.warnings && validation.warnings.length > 0) {
            results.warnings = results.warnings || [];
            results.warnings.push({
              index: i,
              artisan: artisanData,
              warnings: validation.warnings
            });
          }
          
          if (this.options.verbose) {
            this.log(`✅ Artisan ${i + 1}: ${mappedArtisan.prenom} ${mappedArtisan.nom}`, 'verbose');
          }
        } else {
          results.invalid++;
          results.errors.push({
            index: i,
            artisan: artisanData,
            errors: validation.errors,
            warnings: validation.warnings
          });
          
          this.log(`❌ Artisan ${i + 1} invalide: ${validation.errors.join(', ')}`, 'warn');
        }
      } catch (error) {
        results.invalid++;
        results.errors.push({
          index: i,
          artisan: artisanData,
          error: error.message
        });
        
        this.log(`❌ Erreur artisan ${i + 1}: ${error.message}`, 'error');
      }
    }

    this.results.artisans = results;
    this.log(`✅ Artisans traités: ${results.processed} (${results.valid} valides, ${results.invalid} invalides)`, 'success');
    
    return results;
  }

  /**
   * Traite les données d'interventions
   */
  async processInterventions(interventionsData) {
    this.log('🔄 Traitement des interventions...', 'info');
    
    const results = {
      processed: 0,
      valid: 0,
      invalid: 0,
      mapped: [],
      costs: [],
      clients: [],
      errors: []
    };

    for (let i = 0; i < interventionsData.length; i++) {
      const interventionData = interventionsData[i];
      
      try {
        // Mapper les données d'intervention
        const mappedIntervention = await this.dataMapper.mapInterventionFromCSV(interventionData);
        
        // Si la ligne est complètement vide, l'ignorer
        if (!mappedIntervention) {
          if (this.options.verbose) {
            this.log(`⚠️  Intervention ${i + 1}: Ligne vide ignorée`, 'verbose');
          }
          continue;
        }
        
        // Si pas d'ID mais d'autres données valides, continuer (ID auto-généré)
        if (!mappedIntervention.id_inter) {
          if (this.options.verbose) {
            this.log(`⚠️  Intervention ${i + 1}: ID manquant, ID auto-généré utilisé`, 'verbose');
          }
        }
        
        // Compter seulement les lignes non vides
        results.processed++;
        
        // Valider les données mappées
        const validation = dataValidator.validate(mappedIntervention, 'intervention');
        
        // Logger les adresses difficiles à parser
        if (interventionData['Adresse d\'intervention']) {
          const addressData = this.dataMapper.extractInterventionAddress(interventionData['Adresse d\'intervention']);
          if (!addressData.adresse || !addressData.ville || !addressData.codePostal) {
            this.reportGenerator.logDifficultAddress(
              interventionData['Adresse d\'intervention'],
              addressData,
              i
            );
          }
        }
        
        if (validation.isValid) {
          results.valid++;
          results.mapped.push({
            original: interventionData,
            mapped: mappedIntervention,
            validation: validation
          });
          
          // Enregistrer les warnings même pour les interventions valides
          if (validation.warnings && validation.warnings.length > 0) {
            results.warnings = results.warnings || [];
            results.warnings.push({
              index: i,
              intervention: interventionData,
              warnings: validation.warnings
            });
          }
          
          // Les coûts seront mappés après insertion des interventions avec le vrai ID
          
          // Mapper les clients
          const client = this.dataMapper.mapClientFromInterventionCSV(interventionData);
          if (client.firstname || client.lastname || client.email || client.telephone) {
            results.clients.push({
              original: interventionData,
              mapped: client
            });
          }
          
          if (this.options.verbose) {
            this.log(`✅ Intervention ${i + 1}: ${mappedIntervention.id_inter}`, 'verbose');
          }
        } else {
          results.invalid++;
          results.errors.push({
            index: i,
            intervention: interventionData,
            errors: validation.errors,
            warnings: validation.warnings
          });
          
          this.log(`❌ Intervention ${i + 1} invalide: ${validation.errors.join(', ')}`, 'warn');
        }
      } catch (error) {
        results.invalid++;
        results.errors.push({
          index: i,
          intervention: interventionData,
          error: error.message
        });
        
        this.log(`❌ Erreur intervention ${i + 1}: ${error.message}`, 'error');
      }
    }

    this.results.interventions = results;
    this.log(`✅ Interventions traitées: ${results.processed} (${results.valid} valides, ${results.invalid} invalides)`, 'success');
    
    return results;
  }

  // ===== INSERTION EN BASE =====

  /**
   * Insère toutes les données en base
   */
  async insertAllData(artisansResults, interventionsResults) {
    this.log('💾 Insertion des données en base...', 'info');
    
    const results = {
      artisans: { inserted: 0, errors: 0 },
      interventions: { inserted: 0, errors: 0 },
      clients: { inserted: 0, errors: 0 },
      costs: { inserted: 0, errors: 0 }
    };

    // Insérer les artisans
    if (artisansResults.mapped.length > 0) {
      const artisansData = artisansResults.mapped.map(item => item.mapped);
      const insertResult = await this.databaseManager.insertArtisans(artisansData);
      results.artisans = insertResult;
      
      // Insérer les métiers et zones pour chaque artisan
      if (insertResult.success > 0) {
        const metiersToInsert = [];
        const zonesToInsert = [];
        const documentsToInsert = [];
        
        for (let i = 0; i < artisansResults.mapped.length; i++) {
          const originalData = artisansResults.mapped[i].original;
          const artisan = insertResult.details[i]?.artisan;
          
          if (artisan) {
            // Mapper les métiers
            const metiers = await this.dataMapper.mapMetiersFromCSV(originalData);
            metiers.forEach(metier => {
              metiersToInsert.push({
                artisan_id: artisan.id,
                metier_id: metier.metier_id,
                is_primary: metier.is_primary
              });
            });
            
            // Mapper les zones
            const zones = await this.dataMapper.mapZonesFromCSV(originalData);
            zones.forEach(zone => {
              zonesToInsert.push({
                artisan_id: artisan.id,
                zone_id: zone.zone_id
              });
            });
            
            // Mapper les documents Drive
            const documentDriveUrl = this.dataMapper.getCSVValue(originalData, 'Document Drive');
            if (documentDriveUrl) {
              // Traiter l'URL Drive avec processDriveUrl avant de mapper les documents
              const processedUrl = this.processDriveUrl(documentDriveUrl);
              if (processedUrl) {
                // Créer un objet temporaire avec l'URL traitée pour le mapping
                const tempData = { ...originalData, 'Document Drive': processedUrl };
                const documents = this.dataMapper.mapDocumentsFromCSV(artisan, tempData);
                documentsToInsert.push(...documents);
              }
            }
          }
        }
        
        // Insérer les métiers
        if (metiersToInsert.length > 0) {
          const metiersResult = await this.databaseManager.insertArtisanMetiers(metiersToInsert);
          results.metiers = metiersResult;
        }
        
        // Insérer les zones
        if (zonesToInsert.length > 0) {
          const zonesResult = await this.databaseManager.insertArtisanZones(zonesToInsert);
          results.zones = zonesResult;
        }
        
        // Insérer les documents
        if (documentsToInsert.length > 0) {
          const documentsResult = await this.databaseManager.insertDocuments(documentsToInsert);
          results.documents = documentsResult;
        }
      }
    }

    // Insérer les interventions
    if (interventionsResults.mapped.length > 0) {
      const interventionsData = interventionsResults.mapped.map(item => item.mapped);
      const insertResult = await this.databaseManager.insertInterventions(interventionsData);
      results.interventions = insertResult;
      
      // Mapper et insérer les coûts avec les vrais IDs d'intervention
      if (insertResult.inserted > 0) {
        const costsToInsert = [];
        
        for (let i = 0; i < interventionsResults.mapped.length; i++) {
          const originalData = interventionsResults.mapped[i].original;
          const intervention = insertResult.details[i]?.intervention;
          
          if (intervention && intervention.id) {
            // Mapper les coûts avec le vrai ID de l'intervention
            const costs = this.dataMapper.mapInterventionCostsFromCSV(originalData, intervention.id);
            costsToInsert.push(...costs);
          }
        }
        
        if (costsToInsert.length > 0) {
          const costsResult = await this.databaseManager.insertInterventionCosts(costsToInsert);
          results.costs = costsResult;
        }
      }
    }

    // Insérer les clients
    if (interventionsResults.clients.length > 0) {
      const clientsData = interventionsResults.clients.map(item => item.mapped);
      const insertResult = await this.databaseManager.insertClients(clientsData);
      results.clients = insertResult;
    }

    this.log('✅ Insertion terminée', 'success');
    return results;
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Traite l'URL du Drive Google
   */
  processDriveUrl(driveName) {
    if (!driveName || driveName.trim() === '') return null;
    
    // Si c'est déjà une URL complète, la retourner
    if (driveName.startsWith('http')) {
      return driveName;
    }
    
    // Sinon, construire l'URL du Drive
    // Format: https://drive.google.com/drive/folders/FOLDER_ID
    // Pour l'instant, on retourne le nom tel quel
    // TODO: Implémenter la logique de conversion nom → ID
    return `https://drive.google.com/drive/folders/${driveName}`;
  }

  /**
   * Méthode de logging
   */
  log(message, level = 'info') {
    if (!this.options.verbose && level === 'verbose') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[GOOGLE-SHEETS-IMPORT]`;
    
    switch (level) {
      case 'error':
        console.error(`❌ ${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`⚠️  ${prefix} ${message}`);
        break;
      case 'success':
        console.log(`✅ ${prefix} ${message}`);
        break;
      case 'verbose':
        console.log(`🔍 ${prefix} ${message}`);
        break;
      default:
        console.log(`ℹ️  ${prefix} ${message}`);
    }
  }

  // ===== WORKFLOW PRINCIPAL =====

  /**
   * Exécute le workflow complet d'import
   */
  async run() {
    const startTime = Date.now();
    
    this.log('🚀 Démarrage de l\'import Google Sheets', 'info');
    
    // Afficher la configuration
    if (this.options.verbose) {
      googleSheetsConfig.displayConfig();
    }
    
    this.log(`📊 Spreadsheet ID: ${this.options.spreadsheetId || googleSheetsConfig.getSpreadsheetId() || 'Non défini'}`, 'info');
    this.log(`🔍 Mode: ${this.options.test ? 'TEST' : 'PRODUCTION'}`, 'info');
    this.log(`💾 Dry-run: ${this.options.dryRun ? 'Oui' : 'Non'}`, 'info');
    
    try {
      // 1. Initialiser la connexion Google Sheets
      await this.initialize();
      
      // 2. Déterminer quelles données charger
      let artisansData = [];
      let interventionsData = [];
      
      if (this.options.artisansOnly || (!this.options.interventionsOnly && !this.options.artisansOnly)) {
        artisansData = await this.readArtisansData();
      }
      
      if (this.options.interventionsOnly || (!this.options.interventionsOnly && !this.options.artisansOnly)) {
        interventionsData = await this.readInterventionsData();
      }
      
      // 3. Traiter les données
      const artisansResults = await this.processArtisans(artisansData);
      const interventionsResults = await this.processInterventions(interventionsData);
      
      // Collecter les résultats de traitement
      this.reportGenerator.collectArtisanResults(artisansResults);
      this.reportGenerator.collectInterventionResults(interventionsResults);
      
      // 4. Insérer les données en base
      // En mode test, on fait un dry-run complet (validation + simulation d'insertion)
      let insertResults = { artisans: { inserted: 0, errors: 0 }, interventions: { inserted: 0, errors: 0 }, clients: { inserted: 0, errors: 0 }, costs: { inserted: 0, errors: 0 } };
      
      if (this.options.test) {
        // Mode test : simulation complète avec dry-run (sans upsert)
        this.log('🔍 Mode test : simulation complète de l\'insertion...', 'info');
        const originalDryRun = this.databaseManager.options.dryRun;
        const originalUpsert = this.databaseManager.options.upsert;
        this.databaseManager.options.dryRun = true;
        this.databaseManager.options.upsert = false; // Pas d'upsert en mode test
        insertResults = await this.insertAllData(artisansResults, interventionsResults);
        this.databaseManager.options.dryRun = originalDryRun;
        this.databaseManager.options.upsert = originalUpsert;
      } else {
        // Mode production : insertion réelle avec upsert si activé
        insertResults = await this.insertAllData(artisansResults, interventionsResults);
      }
      
      // Collecter les résultats d'insertion
      this.reportGenerator.collectInsertionResults(insertResults);
      
      // 5. Générer et sauvegarder le rapport amélioré
      const reportResults = await this.reportGenerator.generateAndSaveReports();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.log(`🎉 Import terminé en ${duration}s`, 'success');
      
      // Afficher le résumé du rapport
      const summary = this.reportGenerator.reportData.summary;
      console.log(`\n🎯 RÉSUMÉ FINAL:`);
      console.log(`  📊 Taux de succès: ${summary.successRate}%`);
      console.log(`  ✅ Données insérées: ${summary.totalInserted}/${summary.totalValid}`);
      console.log(`  ❌ Erreurs: ${summary.totalErrors}`);
      console.log(`  ⚠️  Warnings: ${summary.totalWarnings}`);
      
      return {
        success: true,
        duration: duration,
        results: insertResults,
        reportResults: reportResults,
        summary: summary
      };
      
    } catch (error) {
      this.log(`❌ Erreur lors de l'import: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    }
  }
}

// ===== PARSER DES ARGUMENTS =====

function parseArgs(args) {
  const config = {
    test: false,
    testConnection: false,
    artisansOnly: false,
    interventionsOnly: false,
    dryRun: false,
    verbose: false,
    showEnvVars: false,
    upsert: true,
    batchSize: 50,
    credentialsPath: './credentials.json',
    spreadsheetId: null
  };
  
  args.forEach(arg => {
    if (arg === '--test') config.test = true;
    if (arg === '--test-connection') config.testConnection = true;
    if (arg === '--artisans-only') config.artisansOnly = true;
    if (arg === '--interventions-only') config.interventionsOnly = true;
    if (arg === '--dry-run') config.dryRun = true;
    if (arg === '--verbose') config.verbose = true;
    if (arg === '--env-vars') config.showEnvVars = true;
    if (arg === '--upsert') config.upsert = true;
    if (arg === '--help') showHelp();
    
    if (arg.startsWith('--batch-size=')) {
      config.batchSize = parseInt(arg.split('=')[1]) || 50;
    }
    
    if (arg.startsWith('--credentials=')) {
      config.credentialsPath = arg.split('=')[1];
    }
    
    if (arg.startsWith('--spreadsheet-id=')) {
      config.spreadsheetId = arg.split('=')[1];
    }
  });
  
  return config;
}

// ===== AFFICHAGE DE L'AIDE =====

function showHelp() {
  console.log(`
📋 GMBS CRM - Import Google Sheets

Usage:
  node scripts/imports/google-sheets-import.js [options]

Configuration:
  Les credentials peuvent être configurés de 3 façons (par ordre de priorité):
  1. Variables d'environnement: GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY
  2. Fichier .env.local avec ces mêmes variables
  3. Fichier credentials.json (fallback)

Options:
  --test                 Mode test (génère rapport dans data/imports/processed)
  --test-connection      Teste uniquement la connexion et le parsing (pas d'import)
  --artisans-only        Importer uniquement les artisans
  --interventions-only   Importer uniquement les interventions
  --dry-run              Mode test sans écriture en base
  --verbose              Affichage détaillé
  --upsert               Mode upsert (met à jour les doublons au lieu de créer)
  --env-vars             Affiche les variables d'environnement détectées
  --batch-size=N         Taille des lots (défaut: 50)
  --credentials=PATH     Chemin vers credentials.json (fallback si .env.local non disponible)
  --spreadsheet-id=ID    ID du Google Spreadsheet (peut aussi être défini via GOOGLE_SHEETS_SPREADSHEET_ID)
  --help                 Afficher cette aide

Exemples:
  # Test de connexion uniquement
  node scripts/imports/google-sheets-import.js --test-connection --verbose
  
  # Test complet (avec .env.local configuré)
  node scripts/imports/google-sheets-import.js --test --verbose
  
  # Import uniquement des artisans
  node scripts/imports/google-sheets-import.js --artisans-only
  
  # Import uniquement des interventions
  node scripts/imports/google-sheets-import.js --interventions-only
  
  # Import complet en production
  node scripts/imports/google-sheets-import.js --verbose

Configuration .env.local:
  GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
  GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY\\n-----END PRIVATE KEY-----"
  GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
`);
  process.exit(0);
}

// ===== FONCTION PRINCIPALE =====

async function main() {
  const config = parseArgs(process.argv.slice(2));
  
  // Si on veut juste afficher les variables d'environnement
  if (config.showEnvVars) {
    const importer = new GoogleSheetsImporter(config);
    importer.showEnvironmentVariables();
    return;
  }
  
  // Vérifier si l'ID du spreadsheet est disponible
  const spreadsheetId = config.spreadsheetId || googleSheetsConfig.getSpreadsheetId();
  if (!spreadsheetId) {
    console.error('❌ ID de spreadsheet requis. Options:');
    console.error('  1. Utilisez --spreadsheet-id=YOUR_ID');
    console.error('  2. Définissez GOOGLE_SHEETS_SPREADSHEET_ID dans .env.local');
    console.error('💡 Utilisez --help pour voir toutes les options');
    process.exit(1);
  }
  
  const importer = new GoogleSheetsImporter(config);
  
  // Si c'est juste un test de connexion
  if (config.testConnection) {
    const result = await importer.testConnection();
    if (!result.success) {
      process.exit(1);
    }
    return;
  }
  
  // Sinon, lancer l'import complet
  const result = await importer.run();
  
  if (!result.success) {
    process.exit(1);
  }
}

// ===== GESTION DES ERREURS =====

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erreur non gérée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// ===== LANCEMENT DU SCRIPT =====

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erreur fatale:', error.message);
    process.exit(1);
  });
}

module.exports = { GoogleSheetsImporter, parseArgs };
