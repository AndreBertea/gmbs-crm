const fs = require('fs');
const path = require('path');

class ImportScriptsMigration {
  constructor() {
    this.migrationMap = {
      // Imports d'API
      'supabase-api-v2': 'src/lib/api/v2',
      'usersApiV2': 'usersApi',
      'interventionsApiV2': 'interventionsApi',
      'artisansApiV2': 'artisansApi',
      'clientsApiV2': 'clientsApi',
      'documentsApiV2': 'documentsApi',
      'commentsApiV2': 'commentsApi',
      'rolesApiV2': 'rolesApi',
      'permissionsApiV2': 'permissionsApi',
      'utilsApiV2': 'utilsApi'
    };
    
    this.results = {
      filesProcessed: 0,
      filesModified: 0,
      errors: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [MIGRATION-IMPORT] ${message}`);
  }

  async migrateFile(filePath) {
    try {
      this.log(`🔄 Migration du fichier: ${filePath}`, 'info');
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
      }
      
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Migration des imports
      for (const [oldImport, newImport] of Object.entries(this.migrationMap)) {
        const oldPattern = new RegExp(oldImport, 'g');
        if (content.includes(oldImport)) {
          content = content.replace(oldPattern, newImport);
          modified = true;
          this.log(`  ✅ Remplacé: ${oldImport} → ${newImport}`, 'success');
        }
      }
      
      // Migration des imports require
      const requirePattern = /require\(['"]([^'"]*supabase-api-v2[^'"]*)['"]\)/g;
      const requireMatches = content.match(requirePattern);
      if (requireMatches) {
        content = content.replace(requirePattern, (match, importPath) => {
          const newImportPath = importPath.replace('supabase-api-v2', 'src/lib/api/v2');
          return `require('${newImportPath}')`;
        });
        modified = true;
        this.log(`  ✅ Remplacé require: ${requireMatches[0]}`, 'success');
      }
      
      // Migration des imports ES6
      const importPattern = /import\s+.*from\s+['"]([^'"]*supabase-api-v2[^'"]*)['"]/g;
      const importMatches = content.match(importPattern);
      if (importMatches) {
        content = content.replace(importPattern, (match, importPath) => {
          const newImportPath = importPath.replace('supabase-api-v2', 'src/lib/api/v2');
          return match.replace(importPath, newImportPath);
        });
        modified = true;
        this.log(`  ✅ Remplacé import: ${importMatches[0]}`, 'success');
      }
      
      if (modified) {
        // Créer une sauvegarde
        const backupPath = `${filePath}.backup`;
        fs.writeFileSync(backupPath, fs.readFileSync(filePath));
        this.log(`  💾 Sauvegarde créée: ${backupPath}`, 'info');
        
        // Écrire le fichier modifié
        fs.writeFileSync(filePath, content);
        this.log(`  ✅ Fichier migré: ${filePath}`, 'success');
        
        this.results.filesModified++;
      } else {
        this.log(`  ℹ️ Aucune migration nécessaire: ${filePath}`, 'info');
      }
      
      this.results.filesProcessed++;
      
    } catch (error) {
      this.log(`❌ Erreur lors de la migration de ${filePath}: ${error.message}`, 'error');
      this.results.errors.push({ file: filePath, error: error.message });
    }
  }

  async migrateDirectory(dirPath, extensions = ['.js', '.ts', '.tsx', '.jsx']) {
    this.log(`📁 Migration du répertoire: ${dirPath}`, 'info');
    
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Répertoire non trouvé: ${dirPath}`);
    }
    
    const files = this.getFilesRecursively(dirPath, extensions);
    this.log(`📄 ${files.length} fichiers trouvés`, 'info');
    
    for (const file of files) {
      await this.migrateFile(file);
    }
  }

  getFilesRecursively(dirPath, extensions) {
    const files = [];
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Ignorer certains répertoires
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
            scanDir(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    scanDir(dirPath);
    return files;
  }

  async migrateImportScripts() {
    this.log('🚀 Démarrage de la migration des scripts d\'import vers l\'API V2', 'info');
    
    try {
      // Répertoires à migrer
      const directories = [
        'scripts/imports',
        'scripts',
        'examples'
      ];
      
      for (const dir of directories) {
        if (fs.existsSync(dir)) {
          await this.migrateDirectory(dir);
        } else {
          this.log(`⚠️ Répertoire non trouvé: ${dir}`, 'warning');
        }
      }
      
      // Rapport final
      this.generateReport();
      
    } catch (error) {
      this.log(`❌ Erreur critique lors de la migration: ${error.message}`, 'error');
      throw error;
    }
  }

  generateReport() {
    this.log('📊 Rapport de migration des scripts d\'import:', 'info');
    this.log(`📄 Fichiers traités: ${this.results.filesProcessed}`, 'info');
    this.log(`✅ Fichiers modifiés: ${this.results.filesModified}`, 'success');
    this.log(`❌ Erreurs: ${this.results.errors.length}`, 'error');
    
    if (this.results.errors.length > 0) {
      this.log('🔍 Détails des erreurs:', 'warning');
      this.results.errors.forEach(({ file, error }) => {
        this.log(`  - ${file}: ${error}`, 'error');
      });
    }
    
    if (this.results.filesModified > 0) {
      this.log('💡 Prochaines étapes:', 'info');
      this.log('  1. Vérifier les scripts migrés', 'info');
      this.log('  2. Tester les fonctionnalités d\'import', 'info');
      this.log('  3. Supprimer les fichiers de sauvegarde (.backup)', 'info');
      this.log('  4. Mettre à jour la documentation', 'info');
    }
  }

  async validateMigration() {
    this.log('🔍 Validation de la migration des scripts d\'import...', 'info');
    
    const validationResults = {
      legacyImports: 0,
      v2Imports: 0,
      mixedImports: 0
    };
    
    try {
      const directories = ['scripts/imports', 'scripts', 'examples'];
      
      for (const dir of directories) {
        if (fs.existsSync(dir)) {
          const files = this.getFilesRecursively(dir, ['.js', '.ts', '.tsx', '.jsx']);
          
          for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            
            if (content.includes('supabase-api-v2')) {
              validationResults.legacyImports++;
            }
            
            if (content.includes('src/lib/api/v2')) {
              validationResults.v2Imports++;
            }
            
            if (content.includes('supabase-api-v2') && content.includes('src/lib/api/v2')) {
              validationResults.mixedImports++;
            }
          }
        }
      }
      
      this.log('📊 Résultats de validation:', 'info');
      this.log(`  🔍 Imports Legacy restants: ${validationResults.legacyImports}`, 'warning');
      this.log(`  ✅ Imports V2: ${validationResults.v2Imports}`, 'success');
      this.log(`  ⚠️ Imports mixtes: ${validationResults.mixedImports}`, 'warning');
      
      if (validationResults.legacyImports > 0) {
        this.log('⚠️ Des imports Legacy sont encore présents - migration incomplète', 'warning');
      } else {
        this.log('✅ Migration complète - tous les imports ont été migrés', 'success');
      }
      
    } catch (error) {
      this.log(`❌ Erreur lors de la validation: ${error.message}`, 'error');
    }
  }
}

// ===== FONCTIONS UTILITAIRES =====

async function migrateImportScripts() {
  const migrationHelper = new ImportScriptsMigration();
  await migrationHelper.migrateImportScripts();
}

async function validateImportMigration() {
  const migrationHelper = new ImportScriptsMigration();
  await migrationHelper.validateMigration();
}

async function migrateSpecificImportFile(filePath) {
  const migrationHelper = new ImportScriptsMigration();
  await migrationHelper.migrateFile(filePath);
}

async function migrateSpecificImportDirectory(dirPath) {
  const migrationHelper = new ImportScriptsMigration();
  await migrationHelper.migrateDirectory(dirPath);
}

// ===== EXPORTS =====

module.exports = {
  ImportScriptsMigration,
  migrateImportScripts,
  validateImportMigration,
  migrateSpecificImportFile,
  migrateSpecificImportDirectory
};

// ===== SCRIPT PRINCIPAL =====

if (require.main === module) {
  async function main() {
    try {
      const args = process.argv.slice(2);
      
      if (args.includes('--help')) {
        console.log(`
🔄 Migration Scripts d'Import vers API V2

Usage:
  node migrate-import-scripts.js                           # Migration complète
  node migrate-import-scripts.js --validate                # Validation de la migration
  node migrate-import-scripts.js --file <path>             # Migration d'un fichier spécifique
  node migrate-import-scripts.js --dir <path>              # Migration d'un répertoire spécifique
  node migrate-import-scripts.js --help                    # Aide

Exemples:
  node migrate-import-scripts.js
  node migrate-import-scripts.js --validate
  node migrate-import-scripts.js --file scripts/imports/google-sheets-import-clean.js
  node migrate-import-scripts.js --dir scripts/imports

Ce script migre:
  - Les imports de 'supabase-api-v2' vers 'src/lib/api/v2'
  - Les alias d'API (usersApiV2 → usersApi)
  - Les imports require et ES6
  - Crée des sauvegardes (.backup) des fichiers modifiés
        `);
        return;
      }
      
      if (args.includes('--validate')) {
        await validateImportMigration();
      } else if (args.includes('--file') && args[args.indexOf('--file') + 1]) {
        const filePath = args[args.indexOf('--file') + 1];
        await migrateSpecificImportFile(filePath);
      } else if (args.includes('--dir') && args[args.indexOf('--dir') + 1]) {
        const dirPath = args[args.indexOf('--dir') + 1];
        await migrateSpecificImportDirectory(dirPath);
      } else {
        // Migration complète
        await migrateImportScripts();
      }
      
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      process.exit(1);
    }
  }

  main();
}
