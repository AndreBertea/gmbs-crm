#!/usr/bin/env node

/**
 * Script de test pour le mapping des métiers et zones
 * Teste l'extraction des métiers et zones depuis les données CSV
 */

const { DataMapper } = require('../data-processing/data-mapper');

async function runTests() {
  console.log('🧪 Test du mapping des métiers et zones\n');

// Créer une instance du mapper
const dataMapper = new DataMapper();

  // Données de test
  const testCases = [
  {
    name: 'Métier simple',
    csvRow: {
      'MÉTIER': 'PLOMBERIE'
    },
    expectedMetiers: 1,
    expectedZones: 0
  },
  {
    name: 'Métiers multiples',
    csvRow: {
      'MÉTIER': 'PLOMBERIE, ÉLECTRICITÉ'
    },
    expectedMetiers: 2,
    expectedZones: 0
  },
  {
    name: 'Métiers avec séparateurs variés',
    csvRow: {
      'MÉTIER': 'PLOMBERIE; ÉLECTRICITÉ / CHAUFFAGE'
    },
    expectedMetiers: 3,
    expectedZones: 0
  },
  {
    name: 'Zone simple',
    csvRow: {
      'ZONE': 'PARIS'
    },
    expectedMetiers: 0,
    expectedZones: 1
  },
  {
    name: 'Zones multiples',
    csvRow: {
      'ZONE': 'PARIS, LYON, MARSEILLE'
    },
    expectedMetiers: 0,
    expectedZones: 3
  },
  {
    name: 'Métiers et zones',
    csvRow: {
      'MÉTIER': 'PLOMBERIE, ÉLECTRICITÉ',
      'ZONE': 'PARIS, LYON'
    },
    expectedMetiers: 2,
    expectedZones: 2
  },
  {
    name: 'Données vides',
    csvRow: {
      'MÉTIER': '',
      'ZONE': ''
    },
    expectedMetiers: 0,
    expectedZones: 0
  },
  {
    name: 'Champs inexistants',
    csvRow: {
      'Autre': 'Valeur'
    },
    expectedMetiers: 0,
    expectedZones: 0
  }
  ];

  // Tests de mapping des métiers
  console.log('🔧 Tests de mapping des métiers:');
  console.log('=' .repeat(60));

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      const metiers = await dataMapper.mapMetiersFromCSV(testCase.csvRow);
      const zones = await dataMapper.mapZonesFromCSV(testCase.csvRow);
      
      const metiersPassed = metiers.length === testCase.expectedMetiers;
      const zonesPassed = zones.length === testCase.expectedZones;
      const passed = metiersPassed && zonesPassed;
      
      console.log(`\n${i + 1}. ${testCase.name}`);
      console.log(`   CSV Row: ${JSON.stringify(testCase.csvRow)}`);
      console.log(`   Métiers attendus: ${testCase.expectedMetiers}, obtenus: ${metiers.length} ${metiersPassed ? '✅' : '❌'}`);
      console.log(`   Zones attendues: ${testCase.expectedZones}, obtenues: ${zones.length} ${zonesPassed ? '✅' : '❌'}`);
      
      if (metiers.length > 0) {
        console.log(`   Métiers mappés:`);
        metiers.forEach((metier, idx) => {
          console.log(`     ${idx + 1}. ID: ${metier.metier_id}, Principal: ${metier.is_primary}`);
        });
      }
      
      if (zones.length > 0) {
        console.log(`   Zones mappées:`);
        zones.forEach((zone, idx) => {
          console.log(`     ${idx + 1}. ID: ${zone.zone_id}`);
        });
      }
      
      console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
      if (passed) passedTests++;
      
    } catch (error) {
      console.log(`\n${i + 1}. ${testCase.name}`);
      console.log(`   ❌ ERREUR: ${error.message}`);
    }
  }

  // Tests d'extraction de nom depuis différents formats
  console.log('\n\n📝 Tests d\'extraction de nom depuis URL (corrigé):');
  console.log('=' .repeat(60));

  const urlTests = [
  {
    name: 'URL invalide (corrigé)',
    url: 'https://example.com/invalid',
    expected: null
  },
  {
    name: 'URL vide',
    url: '',
    expected: null
  }
  ];

  for (const urlTest of urlTests) {
    const result = dataMapper.extractDocumentNameFromUrl(urlTest.url);
    const passed = result === urlTest.expected;
    
    console.log(`\n${urlTest.name}`);
    console.log(`   URL: ${urlTest.url}`);
    console.log(`   Attendu: ${urlTest.expected}`);
    console.log(`   Obtenu: ${result}`);
    console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  }

  // Résumé des tests
  console.log('\n\n📊 Résumé des tests:');
  console.log('=' .repeat(60));
  console.log(`Tests de mapping: ${passedTests}/${totalTests + urlTests.length} passés`);

  if (passedTests === totalTests + urlTests.length) {
    console.log('\n🎉 Tous les tests sont passés !');
  } else {
    console.log(`\n⚠️  ${totalTests + urlTests.length - passedTests} test(s) ont échoué.`);
  }

  console.log('\n✨ Test terminé !');
}

// Exécuter les tests
runTests().catch(console.error);
