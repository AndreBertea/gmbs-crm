#!/usr/bin/env node

/**
 * Script de Diagnostic pour l'erreur HTTP 503 "name resolution failed"
 * 
 * Ce script teste systématiquement tous les composants pour identifier
 * la cause exacte de l'erreur de résolution DNS.
 * 
 * Usage:
 *   node scripts/tests/diagnose-503-error.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

class DiagnosticTool {
  constructor() {
    this.results = {
      environment: {},
      network: {},
      supabase: {},
      apis: {},
      errors: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runAllTests() {
    this.log('🚀 Démarrage du diagnostic complet...', 'info');
    
    try {
      await this.testEnvironmentVariables();
      await this.testNetworkConnectivity();
      await this.testSupabaseConfiguration();
      await this.testIndividualAPIs();
      await this.testDatabaseManager();
      
      this.generateReport();
      
    } catch (error) {
      this.log(`Erreur fatale: ${error.message}`, 'error');
      this.results.errors.push(error.message);
    }
  }

  // ===== TEST 1: VARIABLES D'ENVIRONNEMENT =====
  
  async testEnvironmentVariables() {
    this.log('🔧 Test des variables d\'environnement...', 'info');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const optionalVars = [
      'GOOGLE_SHEETS_ARTISANS_ID',
      'GOOGLE_SHEETS_INTERVENTIONS_ID',
      'GOOGLE_CREDENTIALS_PATH'
    ];
    
    // Test des variables obligatoires
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (value) {
        this.results.environment[varName] = {
          status: 'defined',
          value: varName.includes('KEY') ? `${value.substring(0, 10)}...` : value,
          length: value.length
        };
        this.log(`✅ ${varName}: Définie (${value.length} caractères)`, 'success');
      } else {
        this.results.environment[varName] = {
          status: 'missing',
          value: null
        };
        this.log(`❌ ${varName}: NON DÉFINIE`, 'error');
        this.results.errors.push(`Variable manquante: ${varName}`);
      }
    }
    
    // Test des variables optionnelles
    for (const varName of optionalVars) {
      const value = process.env[varName];
      this.results.environment[varName] = {
        status: value ? 'defined' : 'missing',
        value: value || null
      };
      
      if (value) {
        this.log(`✅ ${varName}: Définie`, 'success');
      } else {
        this.log(`⚠️ ${varName}: Non définie (optionnel)`, 'warning');
      }
    }
    
    // Test de l'existence du fichier .env.local
    const envPath = path.resolve('.env.local');
    if (fs.existsSync(envPath)) {
      this.log('✅ Fichier .env.local trouvé', 'success');
      this.results.environment['.env.local'] = { status: 'exists', path: envPath };
    } else {
      this.log('❌ Fichier .env.local manquant', 'error');
      this.results.environment['.env.local'] = { status: 'missing', path: envPath };
      this.results.errors.push('Fichier .env.local manquant');
    }
  }

  // ===== TEST 2: CONNECTIVITÉ RÉSEAU =====
  
  async testNetworkConnectivity() {
    this.log('🌐 Test de la connectivité réseau...', 'info');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      this.log('❌ Impossible de tester la connectivité: URL Supabase non définie', 'error');
      return;
    }
    
    try {
      // Extraire le domaine de l'URL Supabase
      const url = new URL(supabaseUrl);
      const hostname = url.hostname;
      
      this.log(`🔍 Test de résolution DNS pour: ${hostname}`, 'debug');
      
      // Test de résolution DNS
      try {
        const addresses = await dns.resolve4(hostname);
        this.results.network.dns = {
          status: 'success',
          hostname: hostname,
          addresses: addresses
        };
        this.log(`✅ DNS résolu: ${addresses.join(', ')}`, 'success');
      } catch (dnsError) {
        this.results.network.dns = {
          status: 'failed',
          hostname: hostname,
          error: dnsError.message
        };
        this.log(`❌ Erreur DNS: ${dnsError.message}`, 'error');
        this.results.errors.push(`Erreur DNS: ${dnsError.message}`);
      }
      
      // Test de connectivité HTTP
      await this.testHttpConnectivity(supabaseUrl);
      
    } catch (error) {
      this.log(`❌ Erreur lors du test réseau: ${error.message}`, 'error');
      this.results.errors.push(`Erreur réseau: ${error.message}`);
    }
  }
  
  async testHttpConnectivity(url) {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: '/',
        method: 'GET',
        timeout: 10000
      };
      
      this.log(`🔍 Test de connectivité HTTP vers ${urlObj.hostname}:${options.port}`, 'debug');
      
      const req = client.request(options, (res) => {
        this.results.network.http = {
          status: 'success',
          statusCode: res.statusCode,
          headers: res.headers
        };
        this.log(`✅ Connectivité HTTP OK (${res.statusCode})`, 'success');
        resolve();
      });
      
      req.on('error', (error) => {
        this.results.network.http = {
          status: 'failed',
          error: error.message,
          code: error.code
        };
        this.log(`❌ Erreur HTTP: ${error.message} (${error.code})`, 'error');
        this.results.errors.push(`Erreur HTTP: ${error.message}`);
        resolve();
      });
      
      req.on('timeout', () => {
        this.log(`❌ Timeout HTTP après 10s`, 'error');
        this.results.errors.push('Timeout HTTP');
        resolve();
      });
      
      req.setTimeout(10000);
      req.end();
    });
  }

  // ===== TEST 3: CONFIGURATION SUPABASE =====
  
  async testSupabaseConfiguration() {
    this.log('🔧 Test de la configuration Supabase...', 'info');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      this.log('❌ Configuration Supabase incomplète', 'error');
      return;
    }
    
    try {
      // Test de création du client Supabase
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      this.log('✅ Client Supabase créé avec succès', 'success');
      
      // Test de connexion simple
      this.log('🔍 Test de connexion à la base de données...', 'debug');
      
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        this.results.supabase.connection = {
          status: 'failed',
          error: error.message,
          code: error.code
        };
        this.log(`❌ Erreur de connexion Supabase: ${error.message}`, 'error');
        this.results.errors.push(`Erreur Supabase: ${error.message}`);
      } else {
        this.results.supabase.connection = {
          status: 'success',
          data: data
        };
        this.log('✅ Connexion Supabase réussie', 'success');
      }
      
    } catch (error) {
      this.log(`❌ Erreur lors du test Supabase: ${error.message}`, 'error');
      this.results.errors.push(`Erreur Supabase: ${error.message}`);
    }
  }

  // ===== TEST 4: APIs INDIVIDUELLES =====
  
  async testIndividualAPIs() {
    this.log('🔧 Test des APIs individuelles...', 'info');
    
    try {
      // Test de l'API des utilisateurs
      await this.testAPI('usersApi', () => {
        const { usersApi } = require('../../src/lib/api/v2');
        return usersApi.getAll({ limit: 1 });
      });
      
      // Test de l'API des artisans
      await this.testAPI('artisansApi', () => {
        const { artisansApi } = require('../../src/lib/api/v2');
        return artisansApi.getAll({ limit: 1 });
      });
      
      // Test de l'API des interventions
      await this.testAPI('interventionsApi', () => {
        const { interventionsApi } = require('../../src/lib/api/v2');
        return interventionsApi.getAll({ limit: 1 });
      });
      
      // Test de l'API des tenants
      await this.testAPI('tenantsApi', () => {
        const { tenantsApi } = require('../../src/lib/api/v2');
        return tenantsApi.getAll({ limit: 1 });
      });
      
    } catch (error) {
      this.log(`❌ Erreur lors du test des APIs: ${error.message}`, 'error');
      this.results.errors.push(`Erreur APIs: ${error.message}`);
    }
  }
  
  async testAPI(apiName, apiCall) {
    try {
      this.log(`🔍 Test de ${apiName}...`, 'debug');
      
      const result = await apiCall();
      
      this.results.apis[apiName] = {
        status: 'success',
        hasData: result && (result.data || result.length > 0),
        resultType: typeof result
      };
      
      this.log(`✅ ${apiName}: OK`, 'success');
      
    } catch (error) {
      this.results.apis[apiName] = {
        status: 'failed',
        error: error.message,
        code: error.code || 'unknown'
      };
      
      this.log(`❌ ${apiName}: ${error.message}`, 'error');
      this.results.errors.push(`${apiName}: ${error.message}`);
    }
  }

  // ===== TEST 5: DATABASE MANAGER =====
  
  async testDatabaseManager() {
    this.log('🔧 Test du DatabaseManager...', 'info');
    
    try {
      const { DatabaseManager } = require('../imports/database/database-manager-v2');
      const dbManager = new DatabaseManager({
        dryRun: true,
        verbose: true
      });
      
      this.log('✅ DatabaseManager créé avec succès', 'success');
      
      // Test de connexion
      const connectionTest = await dbManager.testConnection();
      
      this.results.databaseManager = {
        status: connectionTest ? 'success' : 'failed',
        connectionTest: connectionTest
      };
      
      if (connectionTest) {
        this.log('✅ DatabaseManager: Connexion OK', 'success');
      } else {
        this.log('❌ DatabaseManager: Connexion échouée', 'error');
        this.results.errors.push('DatabaseManager: Connexion échouée');
      }
      
    } catch (error) {
      this.log(`❌ Erreur DatabaseManager: ${error.message}`, 'error');
      this.results.errors.push(`DatabaseManager: ${error.message}`);
    }
  }

  // ===== GÉNÉRATION DU RAPPORT =====
  
  generateReport() {
    this.log('\n📊 RAPPORT DE DIAGNOSTIC', 'info');
    this.log('='.repeat(50), 'info');
    
    // Résumé des erreurs
    if (this.results.errors.length > 0) {
      this.log(`\n❌ ERREURS DÉTECTÉES (${this.results.errors.length}):`, 'error');
      this.results.errors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'error');
      });
    } else {
      this.log('\n✅ Aucune erreur détectée', 'success');
    }
    
    // Variables d'environnement
    this.log('\n🔧 VARIABLES D\'ENVIRONNEMENT:', 'info');
    Object.entries(this.results.environment).forEach(([key, value]) => {
      const status = value.status === 'defined' ? '✅' : value.status === 'missing' ? '❌' : '⚠️';
      this.log(`  ${status} ${key}: ${value.status}`, value.status === 'defined' ? 'success' : 'error');
    });
    
    // Connectivité réseau
    this.log('\n🌐 CONNECTIVITÉ RÉSEAU:', 'info');
    if (this.results.network.dns) {
      const status = this.results.network.dns.status === 'success' ? '✅' : '❌';
      this.log(`  ${status} DNS: ${this.results.network.dns.status}`, this.results.network.dns.status === 'success' ? 'success' : 'error');
    }
    if (this.results.network.http) {
      const status = this.results.network.http.status === 'success' ? '✅' : '❌';
      this.log(`  ${status} HTTP: ${this.results.network.http.status}`, this.results.network.http.status === 'success' ? 'success' : 'error');
    }
    
    // Supabase
    this.log('\n🔧 SUPABASE:', 'info');
    if (this.results.supabase.connection) {
      const status = this.results.supabase.connection.status === 'success' ? '✅' : '❌';
      this.log(`  ${status} Connexion: ${this.results.supabase.connection.status}`, this.results.supabase.connection.status === 'success' ? 'success' : 'error');
    }
    
    // APIs
    this.log('\n🔧 APIs:', 'info');
    Object.entries(this.results.apis).forEach(([apiName, result]) => {
      const status = result.status === 'success' ? '✅' : '❌';
      this.log(`  ${status} ${apiName}: ${result.status}`, result.status === 'success' ? 'success' : 'error');
    });
    
    // Recommandations
    this.log('\n💡 RECOMMANDATIONS:', 'info');
    this.generateRecommendations();
    
    // Sauvegarder le rapport
    this.saveReport();
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Vérifier les variables d'environnement
    const missingVars = Object.entries(this.results.environment)
      .filter(([key, value]) => value.status === 'missing')
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      recommendations.push(`Créer le fichier .env.local avec les variables: ${missingVars.join(', ')}`);
    }
    
    // Vérifier la connectivité DNS
    if (this.results.network.dns && this.results.network.dns.status === 'failed') {
      recommendations.push('Vérifier votre connexion internet et les paramètres DNS');
    }
    
    // Vérifier la connectivité HTTP
    if (this.results.network.http && this.results.network.http.status === 'failed') {
      recommendations.push('Vérifier que l\'URL Supabase est correcte et accessible');
    }
    
    // Vérifier Supabase
    if (this.results.supabase.connection && this.results.supabase.connection.status === 'failed') {
      recommendations.push('Vérifier vos clés Supabase et les permissions');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Tous les tests sont passés avec succès !');
    }
    
    recommendations.forEach((rec, index) => {
      this.log(`  ${index + 1}. ${rec}`, 'info');
    });
  }
  
  saveReport() {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const reportPath = `./data/imports/reports/diagnostic-${timestamp}.json`;
      
      // Créer le dossier s'il n'existe pas
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      this.log(`\n📄 Rapport sauvegardé: ${reportPath}`, 'success');
      
    } catch (error) {
      this.log(`❌ Impossible de sauvegarder le rapport: ${error.message}`, 'error');
    }
  }
}

// ===== EXÉCUTION PRINCIPALE =====

if (require.main === module) {
  async function main() {
    const diagnostic = new DiagnosticTool();
    await diagnostic.runAllTests();
  }
  
  main().catch(console.error);
}

module.exports = { DiagnosticTool };
