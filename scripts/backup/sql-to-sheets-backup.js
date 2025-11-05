/**
 * Système de sauvetage SQL → Google Sheets
 * 
 * Ce module permet d'exporter les données de la base SQL
 * vers Google Sheets en cas de panne du CRM.
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { supabase } = require('../../src/lib/supabase-client');

class SQLToSheetsBackup {
  constructor(options = {}) {
    this.options = {
      credentialsPath: options.credentialsPath || './credentials.json',
      spreadsheetId: options.spreadsheetId || null,
      verbose: options.verbose || false,
      ...options
    };
    
    this.doc = null;
    this.results = {
      artisans: { exported: 0, errors: 0 },
      interventions: { exported: 0, errors: 0 },
      clients: { exported: 0, errors: 0 },
      costs: { exported: 0, errors: 0 }
    };
  }

  // ===== INITIALISATION =====

  /**
   * Initialise la connexion Google Sheets
   */
  async initialize() {
    try {
      if (!this.options.spreadsheetId) {
        throw new Error('ID de spreadsheet requis');
      }

      this.doc = new GoogleSpreadsheet(this.options.spreadsheetId);
      
      // Charger les credentials
      const credentials = require(this.options.credentialsPath);
      await this.doc.useServiceAccountAuth(credentials);
      
      // Charger les informations du document
      await this.doc.loadInfo();
      
      this.log('✅ Connexion Google Sheets établie', 'success');
      this.log(`📄 Document: ${this.doc.title}`, 'info');
      
    } catch (error) {
      this.log(`❌ Erreur initialisation Google Sheets: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===== EXPORT ARTISANS =====

  /**
   * Exporte les artisans vers Google Sheets
   * @param {string} sheetName - Nom de la feuille (défaut: 'Artisans')
   */
  async exportArtisans(sheetName = 'Artisans') {
    this.log(`📤 Export des artisans vers "${sheetName}"...`, 'info');
    
    try {
      // Récupérer les données depuis Supabase
      const { data: artisans, error } = await supabase
        .from('artisans')
        .select(`
          *,
          users!gestionnaire_id(username),
          artisan_statuses!statut_id(code, label)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!artisans || artisans.length === 0) {
        this.log('⚠️  Aucun artisan à exporter', 'warn');
        return;
      }

      // Préparer les données pour Google Sheets
      const sheetData = artisans.map(artisan => ({
        'ID': artisan.id,
        'Nom Prénom': `${artisan.prenom || ''} ${artisan.nom || ''}`.trim(),
        'Adresse Mail': artisan.email || '',
        'Numéro Téléphone': artisan.telephone || '',
        'Téléphone 2': artisan.telephone2 || '',
        'Raison Social': artisan.raison_sociale || '',
        'Siret': artisan.siret || '',
        'STATUT JURIDIQUE': artisan.statut_juridique || '',
        'STATUT': artisan.artisan_statuses?.code || '',
        'Adresse Postale': this.formatAddress(artisan),
        'Gestionnaire': artisan.users?.username || '',
        'MÉTIER': await this.getArtisanMetiers(artisan.id),
        'DATE D\'AJOUT': artisan.date_ajout ? new Date(artisan.date_ajout).toLocaleDateString('fr-FR') : '',
        'SUIVI DES RELANCES DOCS': artisan.suivi_relances_docs || '',
        'Date Export': new Date().toLocaleString('fr-FR')
      }));

      // Créer ou utiliser la feuille existante
      let sheet = this.doc.sheetsByTitle[sheetName];
      if (!sheet) {
        sheet = await this.doc.addSheet({ title: sheetName });
        this.log(`📄 Feuille "${sheetName}" créée`, 'info');
      } else {
        // Vider la feuille existante
        await sheet.clear();
        this.log(`📄 Feuille "${sheetName}" vidée`, 'info');
      }

      // Ajouter les en-têtes
      const headers = Object.keys(sheetData[0]);
      await sheet.setHeaderRow(headers);

      // Ajouter les données
      await sheet.addRows(sheetData);

      this.results.artisans.exported = sheetData.length;
      this.log(`✅ ${sheetData.length} artisans exportés vers "${sheetName}"`, 'success');

    } catch (error) {
      this.results.artisans.errors++;
      this.log(`❌ Erreur export artisans: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===== EXPORT INTERVENTIONS =====

  /**
   * Exporte les interventions vers Google Sheets
   * @param {string} sheetName - Nom de la feuille (défaut: 'Interventions')
   */
  async exportInterventions(sheetName = 'Interventions') {
    this.log(`📤 Export des interventions vers "${sheetName}"...`, 'info');
    
    try {
      // Récupérer les données depuis Supabase
      const { data: interventions, error } = await supabase
        .from('interventions')
        .select(`
          *,
          agencies!agence_id(name),
          clients(firstname, lastname, email, telephone),
          users!assigned_user_id(username),
          intervention_statuses!statut_id(code, label),
          metiers(code, label)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!interventions || interventions.length === 0) {
        this.log('⚠️  Aucune intervention à exporter', 'warn');
        return;
      }

      // Préparer les données pour Google Sheets
      const sheetData = interventions.map(intervention => ({
        'ID': intervention.id_inter || intervention.id,
        'Date': intervention.date ? new Date(intervention.date).toLocaleDateString('fr-FR') : '',
        'Agence': intervention.agencies?.name || '',
        'Adresse d\'intervention': this.formatInterventionAddress(intervention),
        'Statut': intervention.intervention_statuses?.code || '',
        'Contexte d\'intervention': intervention.contexte_intervention || '',
        'Métier': intervention.metiers?.code || '',
        'Gest.': intervention.users?.username || '',
        'SST': intervention.numero_sst || '',
        'COUT SST': await this.getInterventionCost(intervention.id, 'sst'),
        'COÛT MATERIEL': await this.getInterventionCost(intervention.id, 'materiel'),
        'COUT INTER': await this.getInterventionCost(intervention.id, 'intervention'),
        '% SST': intervention.pourcentage_sst || '',
        'Date d\'intervention': intervention.date_intervention ? new Date(intervention.date_intervention).toLocaleDateString('fr-FR') : '',
        'Date Terminé': intervention.date_termine ? new Date(intervention.date_termine).toLocaleDateString('fr-FR') : '',
        'COMMENTAIRE': intervention.commentaire_agent || '',
        'Client': this.formatClientInfo(intervention.clients),
        'Date Export': new Date().toLocaleString('fr-FR')
      }));

      // Créer ou utiliser la feuille existante
      let sheet = this.doc.sheetsByTitle[sheetName];
      if (!sheet) {
        sheet = await this.doc.addSheet({ title: sheetName });
        this.log(`📄 Feuille "${sheetName}" créée`, 'info');
      } else {
        // Vider la feuille existante
        await sheet.clear();
        this.log(`📄 Feuille "${sheetName}" vidée`, 'info');
      }

      // Ajouter les en-têtes
      const headers = Object.keys(sheetData[0]);
      await sheet.setHeaderRow(headers);

      // Ajouter les données
      await sheet.addRows(sheetData);

      this.results.interventions.exported = sheetData.length;
      this.log(`✅ ${sheetData.length} interventions exportées vers "${sheetName}"`, 'success');

    } catch (error) {
      this.results.interventions.errors++;
      this.log(`❌ Erreur export interventions: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===== EXPORT CLIENTS =====

  /**
   * Exporte les clients vers Google Sheets
   * @param {string} sheetName - Nom de la feuille (défaut: 'Clients')
   */
  async exportClients(sheetName = 'Clients') {
    this.log(`📤 Export des clients vers "${sheetName}"...`, 'info');
    
    try {
      // Récupérer les données depuis Supabase
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!clients || clients.length === 0) {
        this.log('⚠️  Aucun client à exporter', 'warn');
        return;
      }

      // Préparer les données pour Google Sheets
      const sheetData = clients.map(client => ({
        'ID': client.id,
        'Référence Externe': client.external_ref || '',
        'Prénom': client.firstname || '',
        'Nom': client.lastname || '',
        'Email': client.email || '',
        'Téléphone': client.telephone || '',
        'Téléphone 2': client.telephone2 || '',
        'Adresse': client.adresse || '',
        'Ville': client.ville || '',
        'Code Postal': client.code_postal || '',
        'Date Export': new Date().toLocaleString('fr-FR')
      }));

      // Créer ou utiliser la feuille existante
      let sheet = this.doc.sheetsByTitle[sheetName];
      if (!sheet) {
        sheet = await this.doc.addSheet({ title: sheetName });
        this.log(`📄 Feuille "${sheetName}" créée`, 'info');
      } else {
        // Vider la feuille existante
        await sheet.clear();
        this.log(`📄 Feuille "${sheetName}" vidée`, 'info');
      }

      // Ajouter les en-têtes
      const headers = Object.keys(sheetData[0]);
      await sheet.setHeaderRow(headers);

      // Ajouter les données
      await sheet.addRows(sheetData);

      this.results.clients.exported = sheetData.length;
      this.log(`✅ ${sheetData.length} clients exportés vers "${sheetName}"`, 'success');

    } catch (error) {
      this.results.clients.errors++;
      this.log(`❌ Erreur export clients: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===== EXPORT COMPLET =====

  /**
   * Exécute l'export complet vers Google Sheets
   * @param {Object} options - Options d'export
   */
  async exportAll(options = {}) {
    const startTime = Date.now();
    
    this.log('🚀 Démarrage de l\'export complet SQL → Google Sheets', 'info');
    this.log(`📊 Spreadsheet ID: ${this.options.spreadsheetId}`, 'info');
    
    try {
      // Initialiser la connexion
      await this.initialize();
      
      // Exporter toutes les données
      await Promise.all([
        this.exportArtisans(options.artisansSheetName),
        this.exportInterventions(options.interventionsSheetName),
        this.exportClients(options.clientsSheetName)
      ]);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Générer le rapport
      const report = this.generateReport();
      this.log(report, 'info');
      
      this.log(`🎉 Export complet terminé en ${duration}s`, 'success');
      
      return {
        success: true,
        duration: duration,
        results: this.results,
        report: report
      };
      
    } catch (error) {
      this.log(`❌ Erreur lors de l'export: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Formate l'adresse d'un artisan
   * @param {Object} artisan - Artisan
   * @returns {string} - Adresse formatée
   */
  formatAddress(artisan) {
    const parts = [];
    
    if (artisan.adresse_siege_social) parts.push(artisan.adresse_siege_social);
    if (artisan.code_postal_siege_social) parts.push(artisan.code_postal_siege_social);
    if (artisan.ville_siege_social) parts.push(artisan.ville_siege_social);
    
    return parts.join(' ');
  }

  /**
   * Formate l'adresse d'une intervention
   * @param {Object} intervention - Intervention
   * @returns {string} - Adresse formatée
   */
  formatInterventionAddress(intervention) {
    const parts = [];
    
    if (intervention.adresse) parts.push(intervention.adresse);
    if (intervention.code_postal) parts.push(intervention.code_postal);
    if (intervention.ville) parts.push(intervention.ville);
    
    return parts.join(' ');
  }

  /**
   * Formate les informations client
   * @param {Object} client - Client
   * @returns {string} - Informations formatées
   */
  formatClientInfo(client) {
    if (!client) return '';
    
    const parts = [];
    if (client.firstname) parts.push(client.firstname);
    if (client.lastname) parts.push(client.lastname);
    if (client.email) parts.push(`(${client.email})`);
    
    return parts.join(' ');
  }

  /**
   * Récupère les métiers d'un artisan
   * @param {string} artisanId - ID de l'artisan
   * @returns {Promise<string>} - Métiers formatés
   */
  async getArtisanMetiers(artisanId) {
    try {
      const { data: metiers } = await supabase
        .from('artisan_metiers')
        .select('metiers(code, label)')
        .eq('artisan_id', artisanId)
        .eq('is_primary', true);
      
      if (!metiers || metiers.length === 0) return '';
      
      return metiers.map(m => m.metiers?.code || m.metiers?.label).join(', ');
    } catch (error) {
      return '';
    }
  }

  /**
   * Récupère le coût d'une intervention par type
   * @param {string} interventionId - ID de l'intervention
   * @param {string} costType - Type de coût
   * @returns {Promise<number>} - Montant du coût
   */
  async getInterventionCost(interventionId, costType) {
    try {
      const { data: cost } = await supabase
        .from('intervention_costs')
        .select('amount')
        .eq('intervention_id', interventionId)
        .eq('cost_type', costType)
        .single();
      
      return cost?.amount || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Génère un rapport d'export
   * @returns {string} - Rapport formaté
   */
  generateReport() {
    let report = `\n📤 RAPPORT D'EXPORT SQL → GOOGLE SHEETS\n`;
    report += `==========================================\n`;
    report += `📅 Date: ${new Date().toLocaleString('fr-FR')}\n`;
    report += `📊 Spreadsheet: ${this.doc?.title || 'N/A'}\n\n`;
    
    report += `📈 RÉSULTATS:\n`;
    report += `👷 Artisans: ${this.results.artisans.exported} exportés, ${this.results.artisans.errors} erreurs\n`;
    report += `🔧 Interventions: ${this.results.interventions.exported} exportées, ${this.results.interventions.errors} erreurs\n`;
    report += `👥 Clients: ${this.results.clients.exported} exportés, ${this.results.clients.errors} erreurs\n`;
    
    const totalExported = 
      this.results.artisans.exported + 
      this.results.interventions.exported + 
      this.results.clients.exported;
    
    const totalErrors = 
      this.results.artisans.errors + 
      this.results.interventions.errors + 
      this.results.clients.errors;
    
    report += `\n📊 TOTAL: ${totalExported} enregistrements exportés, ${totalErrors} erreurs\n`;
    
    if (totalErrors === 0) {
      report += `\n🎉 Export réussi sans erreur !\n`;
    } else {
      report += `\n⚠️  ${totalErrors} erreur(s) détectée(s) - Vérifiez les logs\n`;
    }
    
    return report;
  }

  /**
   * Méthode de logging
   * @param {string} message - Message à logger
   * @param {string} level - Niveau de log
   */
  log(message, level = 'info') {
    if (!this.options.verbose && level === 'verbose') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[SQL-TO-SHEETS]`;
    
    switch (level) {
      case 'error':
        console.error(`❌ ${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`⚠️  ${prefix} ${message}`);
        break;
      case 'success':
        console.log(`✅ ${prefix} ${message}`);
        break;
      case 'verbose':
        console.log(`🔍 ${prefix} ${message}`);
        break;
      default:
        console.log(`ℹ️  ${prefix} ${message}`);
    }
  }
}

module.exports = { SQLToSheetsBackup };

