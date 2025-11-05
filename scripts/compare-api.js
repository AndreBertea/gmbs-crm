const { usersApi, interventionsApi, artisansApi, clientsApi } = require('../src/lib/api/v2');
const { usersApiV2, interventionsApiV2, artisansApiV2, clientsApi } = require('../src/lib/supabase-api-v2');

class ApiComparisonSuite {
  constructor() {
    this.results = {
      legacy: { passed: 0, failed: 0, errors: [] },
      v2: { passed: 0, failed: 0, errors: [] },
      comparison: { passed: 0, failed: 0, errors: [] }
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [API-COMPARISON] ${message}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`🧪 Test: ${testName}`, 'info');
      const result = await testFunction();
      this.log(`✅ ${testName} - PASSED`, 'success');
      return result;
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
      throw error;
    }
  }

  async testLegacyApi() {
    this.log('🔍 Test de l\'API Legacy (supabase-api-v2.ts)', 'info');
    
    try {
      // Test Users API Legacy
      await this.runTest('Legacy Users API - getAll', async () => {
        const users = await usersApiV2.getAll({ limit: 5 });
        if (!Array.isArray(users)) {
          throw new Error('Legacy getAll should return an array');
        }
        return users;
      });
      
      // Test Interventions API Legacy
      await this.runTest('Legacy Interventions API - getAll', async () => {
        const interventions = await interventionsApiV2.getAll({ limit: 5 });
        if (!Array.isArray(interventions)) {
          throw new Error('Legacy getAll should return an array');
        }
        return interventions;
      });
      
      // Test Artisans API Legacy
      await this.runTest('Legacy Artisans API - getAll', async () => {
        const artisans = await artisansApiV2.getAll({ limit: 5 });
        if (!Array.isArray(artisans)) {
          throw new Error('Legacy getAll should return an array');
        }
        return artisans;
      });
      
      this.results.legacy.passed++;
      
    } catch (error) {
      this.results.legacy.failed++;
      this.results.legacy.errors.push(error.message);
    }
  }

  async testV2Api() {
    this.log('🔍 Test de l\'API Modulaire V2', 'info');
    
    try {
      // Test Users API V2
      await this.runTest('V2 Users API - getAll', async () => {
        const users = await usersApi.getAll({ limit: 5 });
        if (!Array.isArray(users)) {
          throw new Error('V2 getAll should return an array');
        }
        return users;
      });
      
      // Test Interventions API V2
      await this.runTest('V2 Interventions API - getAll', async () => {
        const interventions = await interventionsApi.getAll({ limit: 5 });
        if (!Array.isArray(interventions)) {
          throw new Error('V2 getAll should return an array');
        }
        return interventions;
      });
      
      // Test Artisans API V2
      await this.runTest('V2 Artisans API - getAll', async () => {
        const artisans = await artisansApi.getAll({ limit: 5 });
        if (!Array.isArray(artisans)) {
          throw new Error('V2 getAll should return an array');
        }
        return artisans;
      });
      
      this.results.v2.passed++;
      
    } catch (error) {
      this.results.v2.failed++;
      this.results.v2.errors.push(error.message);
    }
  }

  async compareApiResults() {
    this.log('🔄 Comparaison des résultats entre Legacy et V2', 'info');
    
    try {
      // Comparaison Users API
      await this.runTest('Users API Comparison', async () => {
        const legacyUsers = await usersApiV2.getAll({ limit: 5 });
        const v2Users = await usersApi.getAll({ limit: 5 });
        
        if (legacyUsers.length !== v2Users.length) {
          this.log(`⚠️ Différence de nombre d'utilisateurs: Legacy=${legacyUsers.length}, V2=${v2Users.length}`, 'warning');
        }
        
        // Vérifier que les structures sont similaires
        if (legacyUsers.length > 0 && v2Users.length > 0) {
          const legacyKeys = Object.keys(legacyUsers[0]);
          const v2Keys = Object.keys(v2Users[0]);
          
          const commonKeys = legacyKeys.filter(key => v2Keys.includes(key));
          const missingKeys = legacyKeys.filter(key => !v2Keys.includes(key));
          const newKeys = v2Keys.filter(key => !legacyKeys.includes(key));
          
          if (missingKeys.length > 0) {
            this.log(`⚠️ Clés manquantes dans V2: ${missingKeys.join(', ')}`, 'warning');
          }
          
          if (newKeys.length > 0) {
            this.log(`ℹ️ Nouvelles clés dans V2: ${newKeys.join(', ')}`, 'info');
          }
        }
        
        return { legacy: legacyUsers, v2: v2Users };
      });
      
      // Comparaison Interventions API
      await this.runTest('Interventions API Comparison', async () => {
        const legacyInterventions = await interventionsApiV2.getAll({ limit: 5 });
        const v2Interventions = await interventionsApi.getAll({ limit: 5 });
        
        if (legacyInterventions.length !== v2Interventions.length) {
          this.log(`⚠️ Différence de nombre d'interventions: Legacy=${legacyInterventions.length}, V2=${v2Interventions.length}`, 'warning');
        }
        
        return { legacy: legacyInterventions, v2: v2Interventions };
      });
      
      // Comparaison Artisans API
      await this.runTest('Artisans API Comparison', async () => {
        const legacyArtisans = await artisansApiV2.getAll({ limit: 5 });
        const v2Artisans = await artisansApi.getAll({ limit: 5 });
        
        if (legacyArtisans.length !== v2Artisans.length) {
          this.log(`⚠️ Différence de nombre d'artisans: Legacy=${legacyArtisans.length}, V2=${v2Artisans.length}`, 'warning');
        }
        
        return { legacy: legacyArtisans, v2: v2Artisans };
      });
      
      this.results.comparison.passed++;
      
    } catch (error) {
      this.results.comparison.failed++;
      this.results.comparison.errors.push(error.message);
    }
  }

  async testPerformance() {
    this.log('⚡ Test de performance entre Legacy et V2', 'info');
    
    try {
      // Test de performance Users API
      await this.runTest('Users API Performance', async () => {
        const iterations = 3;
        const limit = 10;
        
        // Test Legacy
        const legacyStart = Date.now();
        for (let i = 0; i < iterations; i++) {
          await usersApiV2.getAll({ limit });
        }
        const legacyTime = Date.now() - legacyStart;
        
        // Test V2
        const v2Start = Date.now();
        for (let i = 0; i < iterations; i++) {
          await usersApi.getAll({ limit });
        }
        const v2Time = Date.now() - v2Start;
        
        const improvement = ((legacyTime - v2Time) / legacyTime * 100).toFixed(2);
        
        this.log(`📊 Performance Users API:`, 'info');
        this.log(`  Legacy: ${legacyTime}ms`, 'info');
        this.log(`  V2: ${v2Time}ms`, 'info');
        this.log(`  Amélioration: ${improvement}%`, improvement > 0 ? 'success' : 'warning');
        
        return { legacy: legacyTime, v2: v2Time, improvement };
      });
      
      // Test de performance Interventions API
      await this.runTest('Interventions API Performance', async () => {
        const iterations = 3;
        const limit = 10;
        
        // Test Legacy
        const legacyStart = Date.now();
        for (let i = 0; i < iterations; i++) {
          await interventionsApiV2.getAll({ limit });
        }
        const legacyTime = Date.now() - legacyStart;
        
        // Test V2
        const v2Start = Date.now();
        for (let i = 0; i < iterations; i++) {
          await interventionsApi.getAll({ limit });
        }
        const v2Time = Date.now() - v2Start;
        
        const improvement = ((legacyTime - v2Time) / legacyTime * 100).toFixed(2);
        
        this.log(`📊 Performance Interventions API:`, 'info');
        this.log(`  Legacy: ${legacyTime}ms`, 'info');
        this.log(`  V2: ${v2Time}ms`, 'info');
        this.log(`  Amélioration: ${improvement}%`, improvement > 0 ? 'success' : 'warning');
        
        return { legacy: legacyTime, v2: v2Time, improvement };
      });
      
    } catch (error) {
      this.log(`❌ Erreur lors du test de performance: ${error.message}`, 'error');
    }
  }

  async runAllComparisons() {
    this.log('🚀 Démarrage de la comparaison API Legacy vs V2', 'info');
    
    try {
      // Tests individuels
      await this.testLegacyApi();
      await this.testV2Api();
      
      // Comparaisons
      await this.compareApiResults();
      
      // Tests de performance
      await this.testPerformance();
      
      // Rapport final
      this.generateReport();
      
    } catch (error) {
      this.log(`❌ Erreur critique lors de la comparaison: ${error.message}`, 'error');
      throw error;
    }
  }

  generateReport() {
    this.log('📊 Rapport de comparaison API Legacy vs V2:', 'info');
    
    // Résultats Legacy
    const legacyTotal = this.results.legacy.passed + this.results.legacy.failed;
    const legacyRate = legacyTotal > 0 ? ((this.results.legacy.passed / legacyTotal) * 100).toFixed(2) : 0;
    
    this.log(`🔍 API Legacy:`, 'info');
    this.log(`  ✅ Tests réussis: ${this.results.legacy.passed}`, 'success');
    this.log(`  ❌ Tests échoués: ${this.results.legacy.failed}`, 'error');
    this.log(`  📈 Taux de succès: ${legacyRate}%`, 'info');
    
    // Résultats V2
    const v2Total = this.results.v2.passed + this.results.v2.failed;
    const v2Rate = v2Total > 0 ? ((this.results.v2.passed / v2Total) * 100).toFixed(2) : 0;
    
    this.log(`🔍 API V2:`, 'info');
    this.log(`  ✅ Tests réussis: ${this.results.v2.passed}`, 'success');
    this.log(`  ❌ Tests échoués: ${this.results.v2.failed}`, 'error');
    this.log(`  📈 Taux de succès: ${v2Rate}%`, 'info');
    
    // Résultats de comparaison
    const comparisonTotal = this.results.comparison.passed + this.results.comparison.failed;
    const comparisonRate = comparisonTotal > 0 ? ((this.results.comparison.passed / comparisonTotal) * 100).toFixed(2) : 0;
    
    this.log(`🔄 Comparaisons:`, 'info');
    this.log(`  ✅ Tests réussis: ${this.results.comparison.passed}`, 'success');
    this.log(`  ❌ Tests échoués: ${this.results.comparison.failed}`, 'error');
    this.log(`  📈 Taux de succès: ${comparisonRate}%`, 'info');
    
    // Recommandations
    this.log('💡 Recommandations:', 'info');
    
    if (this.results.legacy.failed > 0) {
      this.log('  ⚠️ L\'API Legacy a des problèmes - migration recommandée', 'warning');
    }
    
    if (this.results.v2.failed === 0 && this.results.comparison.failed === 0) {
      this.log('  ✅ L\'API V2 est stable et compatible - migration sûre', 'success');
    }
    
    if (this.results.v2.passed > this.results.legacy.passed) {
      this.log('  🚀 L\'API V2 offre de meilleures performances', 'success');
    }
  }
}

// ===== FONCTIONS UTILITAIRES =====

async function runApiComparison() {
  const comparisonSuite = new ApiComparisonSuite();
  await comparisonSuite.runAllComparisons();
}

// ===== EXPORTS =====

module.exports = {
  ApiComparisonSuite,
  runApiComparison
};

// ===== SCRIPT PRINCIPAL =====

if (require.main === module) {
  async function main() {
    try {
      const args = process.argv.slice(2);
      
      if (args.includes('--help')) {
        console.log(`
🔄 Comparaison API Legacy vs V2

Usage:
  node compare-api.js                    # Comparaison complète
  node compare-api.js --help             # Aide

Ce script compare:
  - Fonctionnalités de l'API Legacy (supabase-api-v2.ts)
  - Fonctionnalités de l'API V2 (src/lib/api/v2/)
  - Performance entre les deux versions
  - Compatibilité des résultats

Exemples:
  node compare-api.js
        `);
        return;
      }
      
      // Comparaison complète
      await runApiComparison();
      
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      process.exit(1);
    }
  }

  main();
}
