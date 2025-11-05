const fs = require('fs');
const path = require('path');

class ApiV2Deployment {
  constructor() {
    this.deploymentSteps = [
      'validate-structure',
      'test-apis',
      'backup-legacy',
      'deploy-v2',
      'validate-deployment',
      'cleanup'
    ];
    
    this.results = {
      stepsCompleted: 0,
      stepsFailed: 0,
      errors: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [DEPLOY-V2] ${message}`);
  }

  async validateStructure() {
    this.log('🔍 Validation de la structure API V2...', 'info');
    
    const requiredFiles = [
      'src/lib/api/v2/index.ts',
      'src/lib/api/v2/common/types.ts',
      'src/lib/api/v2/common/utils.ts',
      'src/lib/api/v2/usersApi.ts',
      'src/lib/api/v2/interventionsApi.ts',
      'src/lib/api/v2/artisansApi.ts',
      'src/lib/api/v2/clientsApi.ts',
      'src/lib/api/v2/documentsApi.ts',
      'src/lib/api/v2/commentsApi.ts',
      'src/lib/api/v2/rolesApi.ts',
      'src/lib/api/v2/utilsApi.ts'
    ];
    
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      this.log(`❌ Fichiers manquants: ${missingFiles.join(', ')}`, 'error');
      throw new Error('Structure API V2 incomplète');
    }
    
    this.log('✅ Structure API V2 validée', 'success');
  }

  async testApis() {
    this.log('🧪 Test des APIs V2...', 'info');
    
    try {
      const { runApiV2Tests } = require('./tests/test-api-v2');
      await runApiV2Tests();
      this.log('✅ Tests APIs V2 réussis', 'success');
    } catch (error) {
      this.log(`❌ Tests APIs V2 échoués: ${error.message}`, 'error');
      throw error;
    }
  }

  async backupLegacy() {
    this.log('💾 Sauvegarde de l\'API Legacy...', 'info');
    
    const legacyFile = 'src/lib/supabase-api-v2.ts';
    const backupFile = 'src/lib/supabase-api-v2.ts.backup';
    
    if (fs.existsSync(legacyFile)) {
      fs.copyFileSync(legacyFile, backupFile);
      this.log(`✅ Sauvegarde créée: ${backupFile}`, 'success');
    } else {
      this.log('⚠️ Fichier Legacy non trouvé - pas de sauvegarde nécessaire', 'warning');
    }
  }

  async deployV2() {
    this.log('🚀 Déploiement de l\'API V2...', 'info');
    
    // Vérifier que l'API V2 est fonctionnelle
    try {
      const { usersApi, interventionsApi, artisansApi } = require('../src/lib/api/v2');
      
      // Test de base
      await usersApi.getAll({ limit: 1 });
      await interventionsApi.getAll({ limit: 1 });
      await artisansApi.getAll({ limit: 1 });
      
      this.log('✅ API V2 déployée et fonctionnelle', 'success');
    } catch (error) {
      this.log(`❌ Erreur lors du déploiement: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateDeployment() {
    this.log('🔍 Validation du déploiement...', 'info');
    
    try {
      // Test de compatibilité
      const { runApiComparison } = require('./compare-api');
      await runApiComparison();
      
      this.log('✅ Déploiement validé', 'success');
    } catch (error) {
      this.log(`❌ Validation échouée: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanup() {
    this.log('🧹 Nettoyage...', 'info');
    
    // Supprimer les fichiers temporaires si nécessaire
    const tempFiles = [
      'src/lib/supabase-api-v2.ts.backup'
    ];
    
    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        // Garder la sauvegarde pour l'instant
        this.log(`ℹ️ Sauvegarde conservée: ${file}`, 'info');
      }
    }
    
    this.log('✅ Nettoyage terminé', 'success');
  }

  async deploy() {
    this.log('🚀 Démarrage du déploiement API V2', 'info');
    
    try {
      for (const step of this.deploymentSteps) {
        this.log(`📋 Étape: ${step}`, 'info');
        
        switch (step) {
          case 'validate-structure':
            await this.validateStructure();
            break;
          case 'test-apis':
            await this.testApis();
            break;
          case 'backup-legacy':
            await this.backupLegacy();
            break;
          case 'deploy-v2':
            await this.deployV2();
            break;
          case 'validate-deployment':
            await this.validateDeployment();
            break;
          case 'cleanup':
            await this.cleanup();
            break;
        }
        
        this.results.stepsCompleted++;
        this.log(`✅ Étape ${step} terminée`, 'success');
      }
      
      this.generateReport();
      
    } catch (error) {
      this.log(`❌ Erreur critique lors du déploiement: ${error.message}`, 'error');
      this.results.stepsFailed++;
      this.results.errors.push(error.message);
      throw error;
    }
  }

  generateReport() {
    this.log('📊 Rapport de déploiement:', 'info');
    this.log(`✅ Étapes réussies: ${this.results.stepsCompleted}`, 'success');
    this.log(`❌ Étapes échouées: ${this.results.stepsFailed}`, 'error');
    
    if (this.results.errors.length > 0) {
      this.log('🔍 Détails des erreurs:', 'warning');
      this.results.errors.forEach(error => {
        this.log(`  - ${error}`, 'error');
      });
    }
    
    if (this.results.stepsFailed === 0) {
      this.log('🎉 Déploiement API V2 réussi!', 'success');
      this.log('💡 Prochaines étapes:', 'info');
      this.log('  1. Tester les fonctionnalités en production', 'info');
      this.log('  2. Former l\'équipe sur la nouvelle API', 'info');
      this.log('  3. Mettre à jour la documentation', 'info');
      this.log('  4. Planifier la suppression de l\'API Legacy', 'info');
    } else {
      this.log('⚠️ Déploiement partiellement réussi', 'warning');
    }
  }
}

// ===== FONCTIONS UTILITAIRES =====

async function deployApiV2() {
  const deployment = new ApiV2Deployment();
  await deployment.deploy();
}

// ===== EXPORTS =====

module.exports = {
  ApiV2Deployment,
  deployApiV2
};

// ===== SCRIPT PRINCIPAL =====

if (require.main === module) {
  async function main() {
    try {
      const args = process.argv.slice(2);
      
      if (args.includes('--help')) {
        console.log(`
🚀 Déploiement API Modulaire V2

Usage:
  node deploy-api-v2.js                    # Déploiement complet
  node deploy-api-v2.js --help             # Aide

Ce script effectue:
  1. Validation de la structure API V2
  2. Tests des APIs
  3. Sauvegarde de l'API Legacy
  4. Déploiement de l'API V2
  5. Validation du déploiement
  6. Nettoyage

Exemples:
  node deploy-api-v2.js
        `);
        return;
      }
      
      await deployApiV2();
      
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      process.exit(1);
    }
  }

  main();
}
