/**
 * Validateur spécialisé pour les clients
 * 
 * Ce module contient les règles de validation spécifiques
 * aux clients selon le schéma de base de données.
 */

const { CommonValidationRules } = require('./common-rules');

class ClientValidator {
  constructor() {
    this.rules = {
      // Champs requis (au moins un des deux)
      required: ['firstname', 'lastname'], // Au moins un des deux
      
      // Champs optionnels mais recommandés
      recommended: ['email', 'telephone'],
      
      // Validations spécifiques
      validations: {
        email: CommonValidationRules.validateEmail,
        telephone: CommonValidationRules.validatePhone,
        telephone2: CommonValidationRules.validatePhone,
        code_postal: CommonValidationRules.validatePostalCode
      },
      
      // Contraintes de longueur selon le schéma
      maxLengths: {
        external_ref: 100,
        firstname: 100,
        lastname: 100,
        email: 255,
        telephone: 20,
        telephone2: 20,
        adresse: 500,
        ville: 100,
        code_postal: 5
      }
    };
  }

  /**
   * Valide un client selon les règles définies
   * @param {Object} client - Client à valider
   * @returns {Object} - Résultat de validation
   */
  validate(client) {
    const errors = [];
    const warnings = [];

    // Vérifier les champs requis
    this.validateRequiredFields(client, errors);

    // Vérifier les champs recommandés
    this.validateRecommendedFields(client, warnings);

    // Appliquer les validations spécifiques
    this.applySpecificValidations(client, errors);

    // Vérifier les contraintes de longueur
    this.validateMaxLengths(client, errors, warnings);

    // Validations métier spécifiques
    this.validateBusinessRules(client, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide les champs requis
   * @param {Object} client - Client à valider
   * @param {Array} errors - Tableau d'erreurs
   */
  validateRequiredFields(client, errors) {
    // Au moins un des deux champs requis doit être présent
    if (!client.firstname && !client.lastname) {
      errors.push('Prénom ou nom requis');
    }
  }

  /**
   * Valide les champs recommandés
   * @param {Object} client - Client à valider
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateRecommendedFields(client, warnings) {
    this.rules.recommended.forEach(field => {
      if (!client[field] || client[field] === '') {
        warnings.push(`Champ recommandé manquant: ${field}`);
      }
    });
  }

  /**
   * Applique les validations spécifiques
   * @param {Object} client - Client à valider
   * @param {Array} errors - Tableau d'erreurs
   */
  applySpecificValidations(client, errors) {
    Object.keys(this.rules.validations).forEach(field => {
      if (client[field] !== undefined && client[field] !== null && client[field] !== '') {
        const validation = this.rules.validations[field](client[field]);
        if (!validation.isValid) {
          errors.push(`${field}: ${validation.message}`);
        }
      }
    });
  }

  /**
   * Valide les contraintes de longueur
   * @param {Object} client - Client à valider
   * @param {Array} errors - Tableau d'erreurs
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateMaxLengths(client, errors, warnings) {
    Object.keys(this.rules.maxLengths).forEach(field => {
      if (client[field] && typeof client[field] === 'string') {
        if (client[field].length > this.rules.maxLengths[field]) {
          errors.push(`${field}: Longueur maximale dépassée (${client[field].length} > ${this.rules.maxLengths[field]})`);
        }
      }
    });
  }

  /**
   * Valide les règles métier spécifiques
   * @param {Object} client - Client à valider
   * @param {Array} errors - Tableau d'erreurs
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateBusinessRules(client, errors, warnings) {
    // Règle métier : Si email présent, il doit être valide
    if (client.email && client.email !== 'NaN') {
      const emailValidation = CommonValidationRules.validateEmail(client.email);
      if (!emailValidation.isValid) {
        errors.push(`Email: ${emailValidation.message}`);
      }
    }

    // Règle métier : Au moins un moyen de contact (email OU téléphone)
    if (!client.email && !client.telephone) {
      warnings.push('Aucun moyen de contact (email ou téléphone)');
    }

    // Règle métier : Si adresse présente, ville et code postal recommandés
    if (client.adresse && (!client.ville || !client.code_postal)) {
      warnings.push('Ville et code postal recommandés si adresse présente');
    }

    // Règle métier : Référence externe doit être unique (sera vérifié en base)
    if (client.external_ref && client.external_ref.trim() === '') {
      warnings.push('Référence externe vide');
    }
  }

  /**
   * Valide un lot de clients
   * @param {Array} clients - Tableau de clients à valider
   * @returns {Object} - Résultats de validation
   */
  validateBatch(clients) {
    const results = {
      valid: [],
      invalid: [],
      total: clients.length,
      validCount: 0,
      invalidCount: 0,
      errors: [],
      warnings: []
    };

    clients.forEach((client, index) => {
      const validation = this.validate(client);
      
      if (validation.isValid) {
        results.valid.push({
          index,
          client,
          warnings: validation.warnings
        });
        results.validCount++;
      } else {
        results.invalid.push({
          index,
          client,
          errors: validation.errors,
          warnings: validation.warnings
        });
        results.invalidCount++;
      }
      
      results.errors.push(...validation.errors.map(error => `Ligne ${index + 1}: ${error}`));
      results.warnings.push(...validation.warnings.map(warning => `Ligne ${index + 1}: ${warning}`));
    });

    return results;
  }

  /**
   * Génère un rapport de validation pour les clients
   * @param {Object} validationResult - Résultat de validation
   * @returns {string} - Rapport formaté
   */
  generateReport(validationResult) {
    let report = `\n👥 VALIDATION CLIENTS\n`;
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

module.exports = { ClientValidator };