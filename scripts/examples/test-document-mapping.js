#!/usr/bin/env node

/**
 * Script de test pour le mapping des documents Drive
 * Teste l'extraction des noms de documents depuis les URLs Drive
 */

const { DataMapper } = require('../data-processing/data-mapper');

console.log('🧪 Test du mapping des documents Drive\n');

// Créer une instance du mapper
const dataMapper = new DataMapper();

// Données de test
const testCases = [
  {
    name: 'Fichier Drive standard',
    url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    expected: 'Document_1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  },
  {
    name: 'Document Google',
    url: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    expected: 'Document_1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  },
  {
    name: 'Feuille de calcul',
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    expected: 'Document_1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  },
  {
    name: 'Dossier Drive',
    url: 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    expected: 'Document_1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  },
  {
    name: 'URL invalide',
    url: 'https://example.com/invalid',
    expected: null
  },
  {
    name: 'URL vide',
    url: '',
    expected: null
  }
];

// Tests d'extraction de nom
console.log('📝 Tests d\'extraction de nom depuis URL:');
console.log('=' .repeat(60));

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = dataMapper.extractDocumentNameFromUrl(testCase.url);
  const passed = result === testCase.expected;
  
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   URL: ${testCase.url}`);
  console.log(`   Attendu: ${testCase.expected}`);
  console.log(`   Obtenu: ${result}`);
  console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (passed) passedTests++;
});

// Tests de mapping complet
console.log('\n\n📄 Tests de mapping complet:');
console.log('=' .repeat(60));

const artisanTest = {
  id: 'test-artisan-id',
  prenom: 'Jean',
  nom: 'Dupont'
};

const csvRowTests = [
  {
    name: 'Avec documentDrive',
    csvRow: {
      documentDrive: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view'
    }
  },
  {
    name: 'Avec document_drive',
    csvRow: {
      document_drive: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    }
  },
  {
    name: 'Avec documentdrive',
    csvRow: {
      documentdrive: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    }
  },
  {
    name: 'Avec Document Drive (avec espace)',
    csvRow: {
      'Document Drive': 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view'
    }
  },
  {
    name: 'Avec Document_Drive (avec underscore)',
    csvRow: {
      'Document_Drive': 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    }
  },
  {
    name: 'Avec DocumentDrive (camelCase)',
    csvRow: {
      'DocumentDrive': 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    }
  },
  {
    name: 'Sans document',
    csvRow: {}
  },
  {
    name: 'Document vide',
    csvRow: {
      documentDrive: ''
    }
  }
];

csvRowTests.forEach((testCase, index) => {
  const documents = dataMapper.mapDocumentsFromCSV(artisanTest, testCase.csvRow);
  
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   CSV Row: ${JSON.stringify(testCase.csvRow)}`);
  console.log(`   Documents générés: ${documents.length}`);
  
  if (documents.length > 0) {
    documents.forEach((doc, docIndex) => {
      console.log(`   Document ${docIndex + 1}:`);
      console.log(`     - ID Artisan: ${doc.artisan_id}`);
      console.log(`     - Type: ${doc.kind}`);
      console.log(`     - URL: ${doc.url}`);
      console.log(`     - Nom: ${doc.filename}`);
    });
  }
});

// Résumé des tests
console.log('\n\n📊 Résumé des tests:');
console.log('=' .repeat(60));
console.log(`Tests d'extraction: ${passedTests}/${totalTests} passés`);
console.log(`Tests de mapping: ${csvRowTests.length} cas testés`);

if (passedTests === totalTests) {
  console.log('\n🎉 Tous les tests sont passés !');
} else {
  console.log(`\n⚠️  ${totalTests - passedTests} test(s) ont échoué.`);
}

console.log('\n✨ Test terminé !');
