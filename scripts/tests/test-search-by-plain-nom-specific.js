// Test de l'API searchByPlainNom avec cas spécifiques
// Ce script permet de tester la méthode avec des cas réels

const { artisansApi } = require("../../src/lib/api/v2");

async function testSearchByPlainNomSpecific() {
  console.log("🧪 Test spécifique de searchByPlainNom");
  
  // Cas de test spécifiques
  const testCases = [
    "ANDRE MEISTERTZHEIM 67",           // Cas original
    "ANDRE MEISTERTZHEIM 67\n",         // Avec retour à la ligne
    "ANDRE MEISTERTZHEIM 67\r\n",       // Avec CRLF
    "ANDRE MEISTERTZHEIM 67\t",         // Avec tabulation
    "  ANDRE MEISTERTZHEIM 67  ",       // Avec espaces
    "ANDRE MEISTERTZHEIM",              // Sans département
    "MEISTERTZHEIM ANDRE",             // Ordre inversé
    "andre meistertzheim 67",           // Minuscules
    "ANDRE MEISTERTZHEIM 67",           // Exact
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test avec: "${testCase}"`);
    console.log(`📋 Longueur: ${testCase.length}`);
    console.log(`📋 Caractères spéciaux: ${JSON.stringify(testCase)}`);
    
    try {
      // Test avec trim
      const trimmed = testCase.trim();
      console.log(`📋 Après trim: "${trimmed}"`);
      
      const result = await artisansApi.searchByPlainNom(trimmed, { limit: 5 });
      
      console.log(`📋 Résultat:`);
      console.log(`  - Total trouvé: ${result.pagination.total}`);
      console.log(`  - Données: ${result.data.length}`);
      
      if (result.data.length > 0) {
        result.data.forEach((artisan, index) => {
          console.log(`  ${index + 1}. ${artisan.prenom} ${artisan.nom} (plain_nom: "${artisan.plain_nom}")`);
        });
      } else {
        console.log(`  ❌ Aucun résultat`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur:`, error.message);
    }
  }
  
  // Test avec recherche partielle
  console.log(`\n📋 Test avec recherche partielle:`);
  try {
    const partialResult = await artisansApi.searchByPlainNom("MEISTERTZHEIM", { limit: 5 });
    console.log(`📋 Recherche "MEISTERTZHEIM": ${partialResult.pagination.total} résultats`);
    
    if (partialResult.data.length > 0) {
      partialResult.data.forEach((artisan, index) => {
        console.log(`  ${index + 1}. ${artisan.prenom} ${artisan.nom} (plain_nom: "${artisan.plain_nom}")`);
      });
    }
  } catch (error) {
    console.error(`❌ Erreur recherche partielle:`, error.message);
  }
}

// Exécuter le test
testSearchByPlainNomSpecific()
  .then(() => {
    console.log("\n✅ Test terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test échoué:", error);
    process.exit(1);
  });
