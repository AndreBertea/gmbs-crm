#!/usr/bin/env node

/**
 * Script de test pour la génération de rapports améliorés
 * Teste la séparation entre validation et insertion
 */

const { GoogleSheetsImporter } = require('../imports/google-sheets-import');

console.log('🧪 Test de génération de rapport amélioré\n');

// Créer une instance du script d'import
const importer = new GoogleSheetsImporter({
  test: true,
  dryRun: false, // Mode insertion réelle pour tester
  verbose: true
});

// Simuler des résultats d'import
const mockInsertResults = {
  artisans: {
    success: 8,
    errors: 2,
    details: [
      { index: 0, success: true, artisan: { id: 'artisan-1', prenom: 'Jean', nom: 'Dupont' } },
      { index: 1, success: true, artisan: { id: 'artisan-2', prenom: 'Marie', nom: 'Martin' } },
      { index: 2, success: false, error: 'Email déjà existant' },
      { index: 3, success: true, artisan: { id: 'artisan-3', prenom: 'Pierre', nom: 'Durand' } },
      { index: 4, success: false, error: 'Données manquantes' },
      { index: 5, success: true, artisan: { id: 'artisan-4', prenom: 'Sophie', nom: 'Bernard' } },
      { index: 6, success: true, artisan: { id: 'artisan-5', prenom: 'Luc', nom: 'Moreau' } },
      { index: 7, success: true, artisan: { id: 'artisan-6', prenom: 'Emma', nom: 'Petit' } },
      { index: 8, success: true, artisan: { id: 'artisan-7', prenom: 'Thomas', nom: 'Robert' } },
      { index: 9, success: true, artisan: { id: 'artisan-8', prenom: 'Julie', nom: 'Richard' } }
    ]
  },
  metiers: {
    success: 15,
    errors: 1,
    details: []
  },
  zones: {
    success: 12,
    errors: 0,
    details: []
  },
  documents: {
    success: 6,
    errors: 1,
    details: []
  }
};

// Simuler des résultats de validation
importer.results = {
  artisans: {
    processed: 10,
    valid: 8,
    invalid: 2,
    errors: [
      { index: 2, errors: ['Email invalide'] },
      { index: 4, errors: ['Nom manquant'] }
    ],
    warnings: [
      { index: 0, warnings: ['Téléphone au format non standard'] },
      { index: 1, warnings: ['Adresse incomplète'] }
    ]
  },
  interventions: {
    processed: 5,
    valid: 5,
    invalid: 0,
    errors: [],
    warnings: []
  },
  clients: {
    processed: 0,
    valid: 0,
    invalid: 0,
    errors: [],
    warnings: []
  },
  costs: {
    processed: 0,
    valid: 0,
    invalid: 0,
    errors: [],
    warnings: []
  }
};

// Simuler des statistiques du mapper
importer.dataMapper = {
  getStats() {
    return {
      metiersCreated: 3,
      newMetiers: ['PLOMBERIE', 'ÉLECTRICITÉ', 'CHAUFFAGE'],
      zonesCreated: 2,
      newZones: ['PARIS', 'LYON'],
      artisanStatusesCreated: 1,
      newArtisanStatuses: ['POTENTIEL'],
      interventionStatusesCreated: 0,
      newInterventionStatuses: [],
      documentsCreated: 6,
      newDocuments: ['Document_1', 'Document_2', 'Document_3', 'Document_4', 'Document_5', 'Document_6']
    };
  }
};

// Simuler le document
importer.doc = {
  title: 'Test Spreadsheet'
};

console.log('📊 Génération du rapport amélioré...\n');

// Générer le rapport
const report = importer.generateReport(mockInsertResults);

console.log(report);

console.log('\n✨ Test terminé !');
console.log('\n💡 Ce rapport montre maintenant clairement :');
console.log('   - Les résultats de validation (dry-run)');
console.log('   - Les résultats d\'insertion réelle en base');
console.log('   - Les erreurs séparées par type');
console.log('   - Un résumé final avec taux de succès');
