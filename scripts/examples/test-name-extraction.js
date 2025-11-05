/**
 * Script de test pour l'extraction des noms et prénoms
 * Teste les nouvelles fonctionnalités de nettoyage et d'inversion
 */

const { DataMapper } = require('../data-processing/data-mapper');

class NameExtractionTester {
  constructor() {
    this.dataMapper = new DataMapper();
  }

  testExtraction() {
    console.log('🧪 Test d\'extraction des noms et prénoms\n');

    const testCases = [
      // Cas avec chiffres à supprimer
      { input: 'Bedjih Kamel 34', expected: { prenom: 'Bedjih', nom: 'Kamel' } },
      { input: 'Jean Dupont 123', expected: { prenom: 'Jean', nom: 'Dupont' } },
      { input: 'Marie 45 Martin', expected: { prenom: 'Marie', nom: 'Martin' } },
      
      // Cas d'inversion potentielle
      { input: 'Martin Jean', expected: { prenom: 'Jean', nom: 'Martin' } },
      { input: 'Dubois Pierre', expected: { prenom: 'Pierre', nom: 'Dubois' } },
      { input: 'Durand Michel', expected: { prenom: 'Michel', nom: 'Durand' } },
      
      // Cas avec préfixes de noms de famille
      { input: 'Le Maire Jean', expected: { prenom: 'Jean', nom: 'Le Maire' } },
      { input: 'De La Roche Pierre', expected: { prenom: 'Pierre', nom: 'De La Roche' } },
      { input: 'Du Pont Michel', expected: { prenom: 'Michel', nom: 'Du Pont' } },
      { input: 'La Fontaine Jean', expected: { prenom: 'Jean', nom: 'La Fontaine' } },
      { input: 'Les Deux Pierre', expected: { prenom: 'Pierre', nom: 'Les Deux' } },
      { input: 'Des Champs Marie', expected: { prenom: 'Marie', nom: 'Des Champs' } },
      
      // Cas avec noms à particule composés (4+ mots)
      { input: 'De La Fontaine Jean', expected: { prenom: 'Jean', nom: 'De La Fontaine' } },
      { input: 'Du Bois De La Roche Pierre', expected: { prenom: 'Pierre', nom: 'Du Bois De La Roche' } },
      { input: 'Le Comte De La Roche Pierre', expected: { prenom: 'Pierre', nom: 'Le Comte De La Roche' } },
      
      // Cas normaux (pas d'inversion)
      { input: 'Jean Martin', expected: { prenom: 'Jean', nom: 'Martin' } },
      { input: 'Pierre Dubois', expected: { prenom: 'Pierre', nom: 'Dubois' } },
      { input: 'Michel Durand', expected: { prenom: 'Michel', nom: 'Durand' } },
      
      // Cas avec un seul nom
      { input: 'Kamel', expected: { prenom: 'Kamel', nom: null } },
      { input: 'Jean', expected: { prenom: 'Jean', nom: null } },
      
      // Cas vides
      { input: '', expected: { prenom: null, nom: null } },
      { input: '   ', expected: { prenom: null, nom: null } },
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach((testCase, index) => {
      const prenom = this.dataMapper.extractPrenom(testCase.input);
      const nom = this.dataMapper.extractNom(testCase.input);
      
      // Appliquer la logique d'inversion
      let finalPrenom = prenom;
      let finalNom = nom;
      
      if (prenom && nom && this.dataMapper.shouldInvertNames(prenom, nom)) {
        finalPrenom = nom;
        finalNom = prenom;
      }

      const result = { prenom: finalPrenom, nom: finalNom };
      const isCorrect = this.compareResults(result, testCase.expected);

      console.log(`Test ${index + 1}: "${testCase.input}"`);
      console.log(`  Attendu: ${JSON.stringify(testCase.expected)}`);
      console.log(`  Obtenu:  ${JSON.stringify(result)}`);
      console.log(`  ${isCorrect ? '✅ PASS' : '❌ FAIL'}\n`);

      if (isCorrect) {
        passed++;
      } else {
        failed++;
      }
    });

    console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués`);
    console.log(`🎯 Taux de réussite: ${Math.round((passed / testCases.length) * 100)}%`);
  }

  compareResults(actual, expected) {
    return actual.prenom === expected.prenom && actual.nom === expected.nom;
  }

  testSpecificCase() {
    console.log('\n🔍 Test du cas spécifique mentionné:\n');
    
    const input = 'Bedjih Kamel 34';
    const prenom = this.dataMapper.extractPrenom(input);
    const nom = this.dataMapper.extractNom(input);
    
    console.log(`Input: "${input}"`);
    console.log(`Prenom extrait: "${prenom}"`);
    console.log(`Nom extrait: "${nom}"`);
    
    // Appliquer la logique d'inversion
    let finalPrenom = prenom;
    let finalNom = nom;
    
    if (prenom && nom && this.dataMapper.shouldInvertNames(prenom, nom)) {
      finalPrenom = nom;
      finalNom = prenom;
      console.log(`🔄 Inversion appliquée`);
    }
    
    console.log(`Résultat final: prenom="${finalPrenom}", nom="${finalNom}"`);
  }
}

// Exécuter les tests
const tester = new NameExtractionTester();
tester.testExtraction();
tester.testSpecificCase();
