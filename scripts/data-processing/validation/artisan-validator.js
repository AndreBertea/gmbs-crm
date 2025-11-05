/**
 * Validateur spécialisé pour les artisans
 * 
 * Ce module contient les règles de validation spécifiques
 * aux artisans selon le schéma de base de données.
 */

const { CommonValidationRules } = require('./common-rules');

class ArtisanValidator {
  constructor() {
    this.rules = {
      // Champs requis (au moins un des deux)
      required: ['prenom', 'nom'], // Au moins un des deux
      
      // Champs optionnels mais recommandés
      recommended: ['email', 'telephone'],
      
      // Validations spécifiques
      validations: {
        email: CommonValidationRules.validateEmail,
        telephone: CommonValidationRules.validatePhone,
        telephone2: CommonValidationRules.validatePhone,
        siret: CommonValidationRules.validateSiret,
        code_postal_siege_social: CommonValidationRules.validatePostalCode,
        date_ajout: CommonValidationRules.validateDate,
        intervention_latitude: CommonValidationRules.validateLatitude,
        intervention_longitude: CommonValidationRules.validateLongitude
      },
      
      // Contraintes de longueur selon le schéma
      maxLengths: {
        prenom: 100,
        nom: 100,
        email: 255,
        telephone: 20,
        telephone2: 20,
        raison_sociale: 255,
        siret: 14,
        statut_juridique: 100,
        adresse_siege_social: 500,
        ville_siege_social: 100,
        code_postal_siege_social: 5,
        departement: 3,
        adresse_intervention: 500,
        ville_intervention: 100,
        code_postal_intervention: 5,
        numero_associe: 50,
        suivi_relances_docs: 1000
      }
    };
  }

  /**
   * Valide un artisan selon les règles définies
   * @param {Object} artisan - Artisan à valider
   * @returns {Object} - Résultat de validation
   */
  validate(artisan) {
    const errors = [];
    const warnings = [];

    // Vérifier les champs requis (au moins prénom OU nom)
    this.validateRequiredFields(artisan, errors);

    // Vérifier les champs recommandés
    this.validateRecommendedFields(artisan, warnings);

    // Appliquer les validations spécifiques
    this.applySpecificValidations(artisan, errors);

    // Vérifier les contraintes de longueur
    this.validateMaxLengths(artisan, errors, warnings);

    // Validations métier spécifiques
    this.validateBusinessRules(artisan, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide les champs requis
   * @param {Object} artisan - Artisan à valider
   * @param {Array} errors - Tableau d'erreurs
   */
  validateRequiredFields(artisan, errors) {
    // Au moins un des deux champs requis doit être présent
    if (!artisan.prenom && !artisan.nom) {
      errors.push('Prénom ou nom requis');
    }
  }

  /**
   * Valide les champs recommandés
   * @param {Object} artisan - Artisan à valider
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateRecommendedFields(artisan, warnings) {
    this.rules.recommended.forEach(field => {
      if (!artisan[field] || artisan[field] === '') {
        warnings.push(`Champ recommandé manquant: ${field}`);
      }
    });
  }

  /**
   * Applique les validations spécifiques
   * @param {Object} artisan - Artisan à valider
   * @param {Array} errors - Tableau d'erreurs
   */
  applySpecificValidations(artisan, errors) {
    Object.keys(this.rules.validations).forEach(field => {
      if (artisan[field] !== undefined && artisan[field] !== null && artisan[field] !== '') {
        const validation = this.rules.validations[field](artisan[field]);
        if (!validation.isValid) {
          errors.push(`${field}: ${validation.message}`);
        }
      }
    });
  }

  /**
   * Valide les contraintes de longueur
   * @param {Object} artisan - Artisan à valider
   * @param {Array} errors - Tableau d'erreurs
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateMaxLengths(artisan, errors, warnings) {
    Object.keys(this.rules.maxLengths).forEach(field => {
      if (artisan[field] && typeof artisan[field] === 'string') {
        if (artisan[field].length > this.rules.maxLengths[field]) {
          warnings.push(`${field}: Longueur maximale dépassée (${artisan[field].length} > ${this.rules.maxLengths[field]})`);
        }
      }
    });
  }

  /**
   * Valide les règles métier spécifiques
   * @param {Object} artisan - Artisan à valider
   * @param {Array} errors - Tableau d'erreurs
   * @param {Array} warnings - Tableau d'avertissements
   */
  validateBusinessRules(artisan, errors, warnings) {
    // Règle métier : Si SIRET présent, il doit être valide
    if (artisan.siret && artisan.siret !== 'NaN') {
      const siretValidation = CommonValidationRules.validateSiret(artisan.siret);
      if (!siretValidation.isValid) {
        errors.push(`SIRET: ${siretValidation.message}`);
      }
    }

    // Règle métier : Si email présent, il doit être valide
    if (artisan.email && artisan.email !== 'NaN') {
      const emailValidation = CommonValidationRules.validateEmail(artisan.email);
      if (!emailValidation.isValid) {
        errors.push(`Email: ${emailValidation.message}`);
      }
    }

    // Règle métier : Au moins un moyen de contact (email OU téléphone)
    if (!artisan.email && !artisan.telephone) {
      warnings.push('Aucun moyen de contact (email ou téléphone)');
    }

    // Règle métier : Si adresse siège social présente, ville et code postal recommandés
    if (artisan.adresse_siege_social && (!artisan.ville_siege_social || !artisan.code_postal_siege_social)) {
      warnings.push('Ville et code postal recommandés si adresse siège social présente');
    }

    // Validation du département
    if (artisan.departement) {
      // Format département : 2 chiffres (ou 3 pour DOM-TOM)
      const departementRegex = /^(0[1-9]|[1-9][0-9]|9[7-8][0-9])$/;
      if (!departementRegex.test(artisan.departement)) {
        errors.push('Format département invalide (doit être 2 chiffres, ou 3 pour DOM-TOM)');
      }
    }

    // Règle métier : Si coordonnées intervention présentes, les deux doivent l'être
    if ((artisan.intervention_latitude && !artisan.intervention_longitude) ||
        (!artisan.intervention_latitude && artisan.intervention_longitude)) {
      warnings.push('Latitude et longitude doivent être présentes ensemble');
    }
  }

  /**
   * Valide un lot d'artisans
   * @param {Array} artisans - Tableau d'artisans à valider
   * @returns {Object} - Résultats de validation
   */
  validateBatch(artisans) {
    const results = {
      valid: [],
      invalid: [],
      total: artisans.length,
      validCount: 0,
      invalidCount: 0,
      errors: [],
      warnings: []
    };

    artisans.forEach((artisan, index) => {
      const validation = this.validate(artisan);
      
      if (validation.isValid) {
        results.valid.push({
          index,
          artisan,
          warnings: validation.warnings
        });
        results.validCount++;
      } else {
        results.invalid.push({
          index,
          artisan,
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
   * Génère un rapport de validation pour les artisans
   * @param {Object} validationResult - Résultat de validation
   * @returns {string} - Rapport formaté
   */
  generateReport(validationResult) {
    let report = `\n👷 VALIDATION ARTISANS\n`;
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

module.exports = { ArtisanValidator };
