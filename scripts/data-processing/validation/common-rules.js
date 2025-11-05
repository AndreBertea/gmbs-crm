/**
 * Règles de validation communes
 * 
 * Ce module contient les règles de validation de base utilisées
 * par tous les validateurs spécialisés.
 */

class CommonValidationRules {
  /**
   * Valide un email
   * @param {string} email - Email à valider
   * @returns {Object} - Résultat de validation
   */
  static validateEmail(email) {
    if (!email) return { isValid: true }; // Optionnel
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      message: isValid ? null : 'Format email invalide'
    };
  }

  /**
   * Valide un téléphone
   * @param {string} phone - Téléphone à valider
   * @returns {Object} - Résultat de validation
   */
  static validatePhone(phone) {
    if (!phone) return { isValid: true }; // Optionnel
    
    // Nettoyer le téléphone (garder seulement les chiffres)
    const cleaned = phone.replace(/[^\d]/g, '');
    const isValid = cleaned.length >= 8 && cleaned.length <= 15;
    
    return {
      isValid,
      message: isValid ? null : 'Téléphone invalide (8-15 chiffres)'
    };
  }

  /**
   * Valide un SIRET
   * @param {string} siret - SIRET à valider
   * @returns {Object} - Résultat de validation
   */
  static validateSiret(siret) {
    if (!siret) return { isValid: true }; // Optionnel
    
    const cleaned = siret.replace(/[^\d]/g, '');
    const isValid = cleaned.length === 14;
    
    return {
      isValid,
      message: isValid ? null : 'SIRET invalide (14 chiffres)'
    };
  }

  /**
   * Valide un code postal français
   * @param {string} postalCode - Code postal à valider
   * @returns {Object} - Résultat de validation
   */
  static validatePostalCode(postalCode) {
    if (!postalCode) return { isValid: true }; // Optionnel
    
    const postalRegex = /^\d{5}$/;
    const isValid = postalRegex.test(postalCode);
    
    return {
      isValid,
      message: isValid ? null : 'Code postal invalide (5 chiffres)'
    };
  }

  /**
   * Valide une date
   * @param {string} date - Date à valider
   * @returns {Object} - Résultat de validation
   */
  static validateDate(date) {
    if (!date) return { isValid: true }; // Optionnel
    
    const dateObj = new Date(date);
    const isValid = !isNaN(dateObj.getTime());
    
    return {
      isValid,
      message: isValid ? null : 'Date invalide'
    };
  }

  /**
   * Valide une latitude
   * @param {number} lat - Latitude à valider
   * @returns {Object} - Résultat de validation
   */
  static validateLatitude(lat) {
    if (!lat) return { isValid: true }; // Optionnel
    
    const numLat = parseFloat(lat);
    const isValid = !isNaN(numLat) && numLat >= -90 && numLat <= 90;
    
    return {
      isValid,
      message: isValid ? null : 'Latitude invalide (-90 à 90)'
    };
  }

  /**
   * Valide une longitude
   * @param {number} lng - Longitude à valider
   * @returns {Object} - Résultat de validation
   */
  static validateLongitude(lng) {
    if (!lng) return { isValid: true }; // Optionnel
    
    const numLng = parseFloat(lng);
    const isValid = !isNaN(numLng) && numLng >= -180 && numLng <= 180;
    
    return {
      isValid,
      message: isValid ? null : 'Longitude invalide (-180 à 180)'
    };
  }

  /**
   * Valide un pourcentage
   * @param {number} percentage - Pourcentage à valider
   * @returns {Object} - Résultat de validation
   */
  static validatePercentage(percentage) {
    if (!percentage) return { isValid: true }; // Optionnel
    
    const numPercentage = parseFloat(percentage);
    const isValid = !isNaN(numPercentage) && numPercentage >= 0 && numPercentage <= 100;
    
    return {
      isValid,
      message: isValid ? null : 'Pourcentage invalide (0 à 100)'
    };
  }

  /**
   * Valide un montant
   * @param {number} amount - Montant à valider
   * @returns {Object} - Résultat de validation
   */
  static validateAmount(amount) {
    if (!amount) return { isValid: false, message: 'Montant requis' };
    
    const numAmount = parseFloat(amount);
    const isValid = !isNaN(numAmount) && numAmount >= 0;
    
    return {
      isValid,
      message: isValid ? null : 'Montant invalide (nombre positif)'
    };
  }

  /**
   * Valide une chaîne de caractères
   * @param {string} value - Valeur à valider
   * @param {number} maxLength - Longueur maximale
   * @returns {Object} - Résultat de validation
   */
  static validateString(value, maxLength = null) {
    if (!value) return { isValid: true }; // Optionnel
    
    if (maxLength && value.length > maxLength) {
      return {
        isValid: true, // Changé en true pour que ce soit un warning
        message: `Longueur maximale dépassée (${value.length} > ${maxLength})`,
        severity: 'warning' // Ajout du niveau de sévérité
      };
    }
    
    return { isValid: true };
  }

  /**
   * Valide un type de coût
   * @param {string} costType - Type de coût à valider
   * @returns {Object} - Résultat de validation
   */
  static validateCostType(costType) {
    const validTypes = ['sst', 'materiel', 'intervention', 'total'];
    const isValid = validTypes.includes(costType);
    
    return {
      isValid,
      message: isValid ? null : `Type de coût invalide (${validTypes.join(', ')})`
    };
  }

  /**
   * Valide une devise
   * @param {string} currency - Devise à valider
   * @returns {Object} - Résultat de validation
   */
  static validateCurrency(currency) {
    if (!currency) return { isValid: true }; // Optionnel, défaut EUR
    
    const validCurrencies = ['EUR', 'USD', 'GBP'];
    const isValid = validCurrencies.includes(currency.toUpperCase());
    
    return {
      isValid,
      message: isValid ? null : `Devise invalide (${validCurrencies.join(', ')})`
    };
  }
}

module.exports = { CommonValidationRules };

