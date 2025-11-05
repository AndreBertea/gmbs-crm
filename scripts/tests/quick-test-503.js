#!/usr/bin/env node

/**
 * Script de Test Rapide pour l'erreur HTTP 503
 * 
 * Ce script teste rapidement les APIs qui génèrent l'erreur "name resolution failed"
 * pour identifier la cause exacte.
 * 
 * Usage:
 *   node scripts/tests/quick-test-503.js
 */

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

class QuickTest503 {
  constructor() {
    this.errors = [];
    this.successes = [];
  }

  log(message, level = 'info') {
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${prefix} ${message}`);
  }

  async runQuickTests() {
    this.log('🚀 Test rapide des APIs qui échouent...');
    
    // Test 1: Variables d'environnement
    await this.testEnvironment();
    
    // Test 2: Client Supabase basique
    await this.testSupabaseClient();
    
    // Test 3: APIs spécifiques qui échouent
    await this.testFailingAPIs();
    
    // Résumé
    this.showSummary();
  }

  async testEnvironment() {
    this.log('\n🔧 Test des variables d\'environnement...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      this.log('❌ NEXT_PUBLIC_SUPABASE_URL non définie', 'error');
      this.errors.push('Variable NEXT_PUBLIC_SUPABASE_URL manquante');
      return false;
    }
    
    if (!supabaseKey) {
      this.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY non définie', 'error');
      this.errors.push('Variable NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
      return false;
    }
    
    this.log(`✅ SUPABASE_URL: ${supabaseUrl}`, 'success');
    this.log(`✅ SUPABASE_KEY: ${supabaseKey.substring(0, 20)}...`, 'success');
    this.successes.push('Variables d\'environnement OK');
    
    return true;
  }

  async testSupabaseClient() {
    this.log('\n🔧 Test du client Supabase...');
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        this.log('❌ Impossible de créer le client: variables manquantes', 'error');
        this.errors.push('Client Supabase: variables manquantes');
        return false;
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      this.log('✅ Client Supabase créé', 'success');
      
      // Test de connexion simple
      this.log('🔍 Test de connexion...', 'debug');
      
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        this.log(`❌ Erreur de connexion: ${error.message}`, 'error');
        this.errors.push(`Connexion Supabase: ${error.message}`);
        return false;
      }
      
      this.log('✅ Connexion Supabase réussie', 'success');
      this.successes.push('Client Supabase OK');
      return true;
      
    } catch (error) {
      this.log(`❌ Erreur client Supabase: ${error.message}`, 'error');
      this.errors.push(`Client Supabase: ${error.message}`);
      return false;
    }
  }

  async testFailingAPIs() {
    this.log('\n🔧 Test des APIs qui échouent...');
    
    // Test des APIs une par une
    const apisToTest = [
      { name: 'interventionsApi.addCost', test: () => this.testAddCost() },
      { name: 'interventionsApi.assignArtisanSST', test: () => this.testAssignArtisanSST() },
      { name: 'tenantsApi.create', test: () => this.testCreateTenant() },
      { name: 'ownersApi.create', test: () => this.testCreateOwner() }
    ];
    
    for (const api of apisToTest) {
      try {
        this.log(`🔍 Test de ${api.name}...`, 'debug');
        await api.test();
        this.successes.push(`${api.name} OK`);
      } catch (error) {
        this.log(`❌ ${api.name}: ${error.message}`, 'error');
        this.errors.push(`${api.name}: ${error.message}`);
      }
    }
  }

  async testAddCost() {
    const { interventionsApi } = require('../../src/lib/api/v2');
    
    // Test avec des données factices
    const testData = {
      cost_type: 'test',
      label: 'Test Cost',
      amount: 100,
      currency: 'EUR'
    };
    
    // On s'attend à une erreur car l'intervention n'existe pas
    // mais on veut voir si c'est une erreur de connexion ou de logique
    try {
      await interventionsApi.addCost('test-intervention-id', testData);
    } catch (error) {
      if (error.message.includes('name resolution failed') || error.message.includes('HTTP 503')) {
        throw new Error(`Erreur de connexion: ${error.message}`);
      }
      // Autres erreurs sont acceptables (intervention non trouvée, etc.)
      this.log(`⚠️ Erreur attendue (logique): ${error.message}`, 'warning');
    }
  }

  async testAssignArtisanSST() {
    const { interventionsApi } = require('../../src/lib/api/v2');
    
    try {
      await interventionsApi.assignArtisan('test-intervention-id', 'test-artisan-id');
    } catch (error) {
      if (error.message.includes('name resolution failed') || error.message.includes('HTTP 503')) {
        throw new Error(`Erreur de connexion: ${error.message}`);
      }
      // Autres erreurs sont acceptables
      this.log(`⚠️ Erreur attendue (logique): ${error.message}`, 'warning');
    }
  }

  async testCreateTenant() {
    const { tenantsApi } = require('../../src/lib/api/v2');
    
    const testData = {
      firstname: 'Test',
      lastname: 'Tenant',
      email: 'test@example.com',
      telephone: '0123456789'
    };
    
    try {
      await tenantsApi.create(testData);
    } catch (error) {
      if (error.message.includes('name resolution failed') || error.message.includes('HTTP 503')) {
        throw new Error(`Erreur de connexion: ${error.message}`);
      }
      if (error.message.includes('email') && error.message.includes('column')) {
        throw new Error(`Erreur de schéma: ${error.message}`);
      }
      // Autres erreurs sont acceptables
      this.log(`⚠️ Erreur attendue (logique): ${error.message}`, 'warning');
    }
  }

  async testCreateOwner() {
    const { ownersApi } = require('../../src/lib/api/v2');
    
    const testData = {
      owner_firstname: 'Test',
      owner_lastname: 'Owner',
      telephone: '0123456789'
    };
    
    try {
      await ownersApi.create(testData);
    } catch (error) {
      if (error.message.includes('name resolution failed') || error.message.includes('HTTP 503')) {
        throw new Error(`Erreur de connexion: ${error.message}`);
      }
      if (error.message.includes('email') && error.message.includes('column')) {
        throw new Error(`Erreur de schéma: ${error.message}`);
      }
      // Autres erreurs sont acceptables
      this.log(`⚠️ Erreur attendue (logique): ${error.message}`, 'warning');
    }
  }

  showSummary() {
    this.log('\n📊 RÉSUMÉ DU TEST RAPIDE');
    this.log('='.repeat(40));
    
    if (this.successes.length > 0) {
      this.log(`\n✅ SUCCÈS (${this.successes.length}):`, 'success');
      this.successes.forEach(success => {
        this.log(`  • ${success}`, 'success');
      });
    }
    
    if (this.errors.length > 0) {
      this.log(`\n❌ ERREURS (${this.errors.length}):`, 'error');
      this.errors.forEach(error => {
        this.log(`  • ${error}`, 'error');
      });
    }
    
    // Diagnostic
    this.log('\n🔍 DIAGNOSTIC:', 'info');
    
    const connectionErrors = this.errors.filter(e => 
      e.includes('name resolution failed') || 
      e.includes('HTTP 503') || 
      e.includes('variables manquantes')
    );
    
    const schemaErrors = this.errors.filter(e => 
      e.includes('column') || 
      e.includes('schema')
    );
    
    if (connectionErrors.length > 0) {
      this.log('🚨 PROBLÈME DE CONNEXION DÉTECTÉ', 'error');
      this.log('   → Vérifiez vos variables d\'environnement (.env.local)', 'info');
      this.log('   → Vérifiez votre connexion internet', 'info');
      this.log('   → Vérifiez l\'URL Supabase', 'info');
    } else if (schemaErrors.length > 0) {
      this.log('🚨 PROBLÈME DE SCHÉMA DÉTECTÉ', 'error');
      this.log('   → Vérifiez la structure de votre base de données', 'info');
      this.log('   → Exécutez les migrations manquantes', 'info');
    } else if (this.errors.length === 0) {
      this.log('✅ TOUS LES TESTS SONT PASSÉS', 'success');
      this.log('   → Le problème pourrait être dans le script d\'import lui-même', 'info');
    } else {
      this.log('⚠️ ERREURS MIXTES DÉTECTÉES', 'warning');
      this.log('   → Mélange de problèmes de connexion et de logique', 'info');
    }
  }
}

// ===== EXÉCUTION =====

if (require.main === module) {
  async function main() {
    const tester = new QuickTest503();
    await tester.runQuickTests();
  }
  
  main().catch(console.error);
}

module.exports = { QuickTest503 };
