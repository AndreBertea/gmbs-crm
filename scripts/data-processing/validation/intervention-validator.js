/**
 * Validateur spécialisé pour les interventions
 * 
 * Ce module contient les règles de validation spécifiques
 * aux interventions selon le schéma de base de données.
 */

const { CommonValidationRules } = require('./common-rules');

class InterventionValidator {
  constructor() {
    this.rules = {
      // Champs requis
      required: ['date', 'statut_id'],
      
      // Champs optionnels mais recommandés
      recommended: ['adresse', 'ville', 'id_inter', 'metier_id', 'assigned_user_id'],
      
      // Validations spécifiques
      validations: {
        date: CommonValidationRules.validateDate,
        date_intervention: CommonValidationRules.validateDate,
        date_termine: CommonValidationRules.validateDate,
        date_prevue: CommonValidationRules.validateDate,
        due_date: CommonValidationRules.validateDate,
        latitude: CommonValidationRules.validateLatitude,
        longitude: CommonValidationRules.validateLongitude,
        pourcentage_sst: CommonValidationRules.validatePercentage,
        numero_sst: (value) => CommonValidationRules.validateString(value, 200)
      },
      
      // Contraintes de longueur selon le schéma
      maxLengths: {
        id_inter: 50,
        contexte_intervention: 10000,
        consigne_intervention: 2000,
        consigne_second_artisan: 2000,
        commentaire_agent: 1000,
        adresse: 500,
        ville: 100,
        code_postal: 5,
        numero_sst: 200
      }
    };
  }

  /**
   * Valide une intervention selon les règles définies
   * @param {Object} intervention - Intervention à valider
   * @returns {Object} - Résultat de validation
   */
  validate(intervention) {
    const errors = [];
    const warnings = [];

    // Vérifier les champs requis
    this.validateRequiredFields(intervention, errors);

    // Vérifier les champs recommandés
    this.validateRecommendedFields(intervention, warnings);

    // Appliquer les validations spécifiques
    this.applySpecificValidations(intervention, errors);

    // Vérifier les contraintes de longueur
    this.validateMaxLengths(intervention, errors, warnings);

    // Validations métier spécifiques
    this.validateBusinessRules(intervention, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide les champs requis
   * @param {Object} intervention - Intervention à valider
   * @param {Array} errors - Tableau d'erreurs
   */
  validateRequiredFields(intervention, errors) {
    this.rules.required.forEach(field => {
      if (!intervention[field] || intervention[field] === '') {
        errors.push(`Champ requis manquant: ${field}`);
      }
    });
  }

  /**
   * Valide les champs recommandés
   * @param {Object} intervention - Intervention à valider
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateRecommendedFields(intervention, warnings) {
    this.rules.recommended.forEach(field => {
      if (!intervention[field] || intervention[field] === '') {
        warnings.push(`Champ recommandé manquant: ${field}`);
      }
    });
  }

  /**
   * Applique les validations spécifiques
   * @param {Object} intervention - Intervention à valider
   * @param {Array} errors - Tableau d'erreurs
   */
  applySpecificValidations(intervention, errors) {
    Object.keys(this.rules.validations).forEach(field => {
      if (intervention[field] !== undefined && intervention[field] !== null && intervention[field] !== '') {
        const validation = this.rules.validations[field](intervention[field]);
        if (!validation.isValid) {
          errors.push(`${field}: ${validation.message}`);
        }
      }
    });
  }

  /**
   * Valide les contraintes de longueur
   * @param {Object} intervention - Intervention à valider
   * @param {Array} errors - Tableau d'erreurs
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateMaxLengths(intervention, errors, warnings) {
    Object.keys(this.rules.maxLengths).forEach(field => {
      if (intervention[field] && typeof intervention[field] === 'string') {
        if (intervention[field].length > this.rules.maxLengths[field]) {
          warnings.push(`${field}: Longueur maximale dépassée (${intervention[field].length} > ${this.rules.maxLengths[field]})`);
        }
      }
    });
  }

  /**
   * Valide les règles métier spécifiques
   * @param {Object} intervention - Intervention à valider
   * @param {Array} errors - Tableau d'erreurs
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateBusinessRules(intervention, errors, warnings) {
    // Règle métier : Si adresse présente, ville et code postal recommandés
    if (intervention.adresse && (!intervention.ville || !intervention.code_postal)) {
      warnings.push('Ville et code postal recommandés si adresse présente');
    }

    // Règle métier : Si coordonnées présentes, les deux doivent l'être
    if ((intervention.latitude && !intervention.longitude) ||
        (!intervention.latitude && intervention.longitude)) {
      warnings.push('Latitude et longitude doivent être présentes ensemble');
    }

    // Règle métier : Date d'intervention ne peut pas être dans le futur (trop loin)
    if (intervention.date_intervention) {
      const interventionDate = new Date(intervention.date_intervention);
      const now = new Date();
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      if (interventionDate > oneYearFromNow) {
        warnings.push('Date d\'intervention très éloignée dans le futur');
      }
    }

    // Règle métier : Date de fin ne peut pas être avant la date de début
    if (intervention.date && intervention.date_termine) {
      const startDate = new Date(intervention.date);
      const endDate = new Date(intervention.date_termine);
      
      if (endDate < startDate) {
        errors.push('Date de fin ne peut pas être antérieure à la date de début');
      }
    }

    // Règle métier : Pourcentage SST doit être cohérent
    if (intervention.pourcentage_sst !== null && intervention.pourcentage_sst !== undefined) {
      if (intervention.pourcentage_sst < 0 || intervention.pourcentage_sst > 100) {
        errors.push('Pourcentage SST doit être entre 0 et 100');
      }
    }

    // Règle métier : ID intervention doit être unique (sera vérifié en base)
    if (intervention.id_inter && intervention.id_inter.trim() === '') {
      warnings.push('ID intervention vide');
    }
  }

  /**
   * Valide un lot d'interventions
   * @param {Array} interventions - Tableau d'interventions à valider
   * @returns {Object} - Résultats de validation
   */
  validateBatch(interventions) {
    const results = {
      valid: [],
      invalid: [],
      total: interventions.length,
      validCount: 0,
      invalidCount: 0,
      errors: [],
      warnings: []
    };

    interventions.forEach((intervention, index) => {
      const validation = this.validate(intervention);
      
      if (validation.isValid) {
        results.valid.push({
          index,
          intervention,
          warnings: validation.warnings
        });
        results.validCount++;
      } else {
        results.invalid.push({
          index,
          intervention,
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
   * Génère un rapport de validation pour les interventions
   * @param {Object} validationResult - Résultat de validation
   * @returns {string} - Rapport formaté
   */
  generateReport(validationResult) {
    let report = `\n🔧 VALIDATION INTERVENTIONS\n`;
    report += `=============================\n`;
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

module.exports = { InterventionValidator };

