/**
 * Système de validation des données mappées
 * 
 * Ce module centralise toutes les validations pour éviter la redondance
 * et permettre la réutilisation entre les différents composants.
 * 
 * Fusion de data-validator.js et centralized-validator.js pour simplifier l'architecture.
 */

const { ArtisanValidator } = require('./validation/artisan-validator');
const { InterventionValidator } = require('./validation/intervention-validator');
const { ClientValidator } = require('./validation/client-validator');
const { CommonValidationRules } = require('./validation/common-rules');

class DataValidator {
  constructor() {
    this.validators = {
      artisan: new ArtisanValidator(),
      intervention: new InterventionValidator(),
      client: new ClientValidator()
    };
    
    // Exposer les règles communes pour réutilisation
    this.commonRules = CommonValidationRules;
  }

  /**
   * Valide des données selon le type spécifié
   * @param {Object} data - Données à valider
   * @param {string} type - Type de données
   * @returns {Object} - Résultat de validation
   */
  validate(data, type) {
    const validator = this.validators[type];
    if (!validator) {
      throw new Error(`Validateur non trouvé pour le type: ${type}`);
    }
    return validator.validate(data);
  }

  /**
   * Valide un lot de données
   * @param {Array} dataArray - Tableau de données
   * @param {string} type - Type de données
   * @returns {Object} - Résultats de validation
   */
  validateBatch(dataArray, type) {
    const validator = this.validators[type];
    if (!validator) {
      throw new Error(`Validateur non trouvé pour le type: ${type}`);
    }
    return validator.validateBatch(dataArray);
  }

  /**
   * Convertit le résultat de validation vers le format API
   * @param {Object} validation - Résultat de validation
   * @returns {Object} - Format API avec codes d'erreur
   */
  convertToApiFormat(validation) {
    const errors = validation.errors.map(error => ({
      field: this.extractFieldFromError(error),
      code: this.extractCodeFromError(error),
      message: error,
      severity: 'error'
    }));
    
    const warnings = validation.warnings.map(warning => ({
      field: this.extractFieldFromError(warning),
      code: this.extractCodeFromError(warning),
      message: warning
    }));

    return {
      isValid: validation.isValid,
      errors,
      warnings
    };
  }

  /**
   * Valide et convertit vers le format API en une seule opération
   * @param {Object} data - Données à valider
   * @param {string} type - Type de données
   * @returns {Object} - Résultat au format API
   */
  validateForApi(data, type) {
    const validation = this.validate(data, type);
    return this.convertToApiFormat(validation);
  }

  /**
   * Extrait le nom du champ depuis un message d'erreur
   * @param {string} errorMessage - Message d'erreur
   * @returns {string} - Nom du champ
   */
  extractFieldFromError(errorMessage) {
    const fieldMatch = errorMessage.match(/^([^:]+):/);
    return fieldMatch ? fieldMatch[1] : 'unknown';
  }

  /**
   * Extrait le code d'erreur depuis un message
   * @param {string} errorMessage - Message d'erreur
   * @returns {string} - Code d'erreur
   */
  extractCodeFromError(errorMessage) {
    if (errorMessage.includes('requis')) return 'REQUIRED_FIELD';
    if (errorMessage.includes('email')) return 'INVALID_EMAIL';
    if (errorMessage.includes('téléphone')) return 'INVALID_PHONE';
    if (errorMessage.includes('SIRET')) return 'INVALID_SIRET';
    if (errorMessage.includes('postal')) return 'INVALID_POSTAL_CODE';
    if (errorMessage.includes('contact')) return 'NO_CONTACT';
    if (errorMessage.includes('adresse')) return 'INCOMPLETE_ADDRESS';
    if (errorMessage.includes('date')) return 'INVALID_DATE';
    if (errorMessage.includes('latitude')) return 'INVALID_LATITUDE';
    if (errorMessage.includes('longitude')) return 'INVALID_LONGITUDE';
    if (errorMessage.includes('pourcentage')) return 'INVALID_PERCENTAGE';
    return 'VALIDATION_ERROR';
  }

  /**
   * Génère un rapport de validation pour un type spécifique
   * @param {Object} validationResult - Résultat de validation
   * @param {string} type - Type de données
   * @returns {string} - Rapport formaté
   */
  generateReport(validationResult, type) {
    const validator = this.validators[type];
    if (!validator || !validator.generateReport) {
      return this.generateGenericReport(validationResult, type);
    }
    return validator.generateReport(validationResult);
  }

  /**
   * Génère un rapport générique
   * @param {Object} validationResult - Résultat de validation
   * @param {string} type - Type de données
   * @returns {string} - Rapport formaté
   */
  generateGenericReport(validationResult, type) {
    let report = `\n📊 VALIDATION ${type.toUpperCase()}\n`;
    report += `========================\n`;
    report += `Total: ${validationResult.total}\n`;
    report += `✅ Valides: ${validationResult.validCount}\n`;
    report += `❌ Invalides: ${validationResult.invalidCount}\n`;
    report += `📊 Taux de succès: ${validationResult.total > 0 ? ((validationResult.validCount / validationResult.total) * 100).toFixed(2) : 0}%\n`;
    
    if (validationResult.errors.length > 0) {
      report += `\n❌ ERREURS:\n`;
      validationResult.errors.slice(0, 10).forEach(error => {
        report += `  - ${error}\n`;
      });
      if (validationResult.errors.length > 10) {
        report += `  ... et ${validationResult.errors.length - 10} autres erreurs\n`;
      }
    }
    
    if (validationResult.warnings.length > 0) {
      report += `\n⚠️  AVERTISSEMENTS:\n`;
      validationResult.warnings.slice(0, 10).forEach(warning => {
        report += `  - ${warning}\n`;
      });
      if (validationResult.warnings.length > 10) {
        report += `  ... et ${validationResult.warnings.length - 10} autres avertissements\n`;
      }
    }
    
    return report;
  }
}

// Instance singleton pour éviter la redondance
const dataValidator = new DataValidator();

module.exports = { 
  DataValidator,
  dataValidator // Instance singleton pour compatibilité
};
