#!/usr/bin/env node

/**
 * Script de test pour la normalisation des métiers
 * Teste la déduplication et la normalisation des noms de métiers
 */

// Import dynamique pour éviter les cycles de dépendances ESM/CJS
async function loadDataMapper() {
  const { DataMapper } = await import('../data-processing/data-mapper.js');
  return DataMapper;
}

async function runTests() {
  console.log('🧪 Test de normalisation des métiers\n');

  // Charger le DataMapper dynamiquement
  const DataMapper = await loadDataMapper();
  const dataMapper = new DataMapper();

  // Données de test basées sur vos exemples
  const testCases = [
  {
    name: 'Métiers avec majuscules/minuscules',
    csvRow: {
      'MÉTIER': 'PLOMBERIE, Plomberie, plomberie'
    },
    expectedCount: 1,
    expectedNormalized: 'plomberie'
  },
  {
    name: 'Métiers avec accents',
    csvRow: {
      'MÉTIER': 'ÉLECTRICITÉ, Electricite, ELECTRICITE'
    },
    expectedCount: 1,
    expectedNormalized: 'electricite'
  },
  {
    name: 'Métiers avec espaces multiples',
    csvRow: {
      'MÉTIER': 'Multi-Service, Multi Service, MULTI-SERVICE'
    },
    expectedCount: 1,
    expectedNormalized: 'multi service'
  },
  {
    name: 'Métiers avec dates (doivent être filtrés)',
    csvRow: {
      'MÉTIER': 'PLOMBERIE, 19/08/2024, ÉLECTRICITÉ, 30/09/2024'
    },
    expectedCount: 2,
    expectedNormalized: ['plomberie', 'electricite']
  },
  {
    name: 'Métiers avec caractères spéciaux',
    csvRow: {
      'MÉTIER': 'Volet/Store, Volet, Store'
    },
    expectedCount: 2,
    expectedNormalized: ['volet store', 'volet', 'store']
  },
  {
    name: 'Métiers complexes',
    csvRow: {
      'MÉTIER': 'RENOVATION, Renovation, rénovation, RÉNOVATION'
    },
    expectedCount: 1,
    expectedNormalized: 'renovation'
  },
  {
    name: 'Métiers avec tirets et espaces',
    csvRow: {
      'MÉTIER': 'Multi-Service, Multi Service, MULTI-SERVICE'
    },
    expectedCount: 1,
    expectedNormalized: 'multi service'
  }
  ];

  // Tests de normalisation
  console.log('🔧 Tests de normalisation:');
  console.log('=' .repeat(60));

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      const metiers = await dataMapper.mapMetiersFromCSV(testCase.csvRow);
      
      console.log(`\n${i + 1}. ${testCase.name}`);
      console.log(`   CSV Row: ${JSON.stringify(testCase.csvRow)}`);
      console.log(`   Métiers attendus: ${testCase.expectedCount}, obtenus: ${metiers.length}`);
      
      if (metiers.length > 0) {
        console.log(`   Métiers mappés:`);
        metiers.forEach((metier, idx) => {
          console.log(`     ${idx + 1}. ID: ${metier.metier_id}, Principal: ${metier.is_primary}`);
        });
      }
      
      const passed = metiers.length === testCase.expectedCount;
      console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
      if (passed) passedTests++;
      
    } catch (error) {
      console.log(`\n${i + 1}. ${testCase.name}`);
      console.log(`   ❌ ERREUR: ${error.message}`);
    }
  }

  // Tests de normalisation individuelle
  console.log('\n\n📝 Tests de normalisation individuelle:');
  console.log('=' .repeat(60));

  const normalizationTests = [
  { input: 'PLOMBERIE', expected: 'plomberie' },
  { input: 'ÉLECTRICITÉ', expected: 'electricite' },
  { input: 'Multi-Service', expected: 'multi service' },
  { input: 'Volet/Store', expected: 'volet store' },
  { input: 'RÉNOVATION', expected: 'renovation' },
  { input: '19/08/2024', expected: '19082024' }, // Date normalisée mais filtrée avant
  { input: '', expected: '' },
  { input: '   PLOMBERIE   ', expected: 'plomberie'   }
  ];

  for (const test of normalizationTests) {
    const result = dataMapper.normalizeMetierName(test.input);
    const passed = result === test.expected;
    
    console.log(`\nInput: "${test.input}"`);
    console.log(`Attendu: "${test.expected}"`);
    console.log(`Obtenu: "${result}"`);
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  }

  // Tests de détection de dates
  console.log('\n\n📅 Tests de détection de dates:');
  console.log('=' .repeat(60));

  const dateTests = [
  { input: '19/08/2024', expected: true },
  { input: '30/09/2024', expected: true },
  { input: '01-01-2024', expected: true },
  { input: '2024-01-01', expected: true },
  { input: 'PLOMBERIE', expected: false },
  { input: 'ÉLECTRICITÉ', expected: false },
  { input: '', expected: false   }
  ];

  for (const test of dateTests) {
    const result = dataMapper.isDateLike(test.input);
    const passed = result === test.expected;
    
    console.log(`\nInput: "${test.input}"`);
    console.log(`Attendu: ${test.expected}, Obtenu: ${result}`);
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  }

  // Résumé des tests
  console.log('\n\n📊 Résumé des tests:');
  console.log('=' .repeat(60));
  console.log(`Tests passés: ${passedTests}/${totalTests + normalizationTests.length + dateTests.length}`);

  if (passedTests === totalTests + normalizationTests.length + dateTests.length) {
    console.log('\n🎉 Tous les tests sont passés !');
    console.log('✅ La normalisation des métiers fonctionne correctement');
    console.log('✅ Les doublons sont éliminés');
    console.log('✅ Les dates sont filtrées');
  } else {
    console.log(`\n⚠️  ${totalTests + normalizationTests.length + dateTests.length - passedTests} test(s) ont échoué.`);
  }

  console.log('\n✨ Test terminé !');
}

// Exécuter les tests
runTests().catch(console.error);
