/**
 * Script de test pour le parsing des informations de tenants
 * Teste les différents cas de figure rencontrés dans les données
 */

console.log('🚀 Démarrage du script de test...\n');

const { DataMapper } = require('../data-processing/data-mapper');

console.log('✅ DataMapper importé\n');

let dataMapper;
try {
  console.log('📝 Création de l\'instance DataMapper...');
  dataMapper = new DataMapper();
  console.log('✅ DataMapper initialisé\n');
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation du DataMapper:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Cas de test
const testCases = [
  {
    name: 'Cas 1: Nom dans TEL LOC avec téléphones',
    data: {
      'Locataire': '',
      'Em@ail Locataire': '',
      'TEL LOC': 'M THOMAS GERMANAUD 0632148492 / 06 42 50 79 88 conjointe'
    }
  },
  {
    name: 'Cas 2: Nom et téléphone dans Locataire',
    data: {
      'Locataire': 'Monsieur Thilai SALIGNAT PLUMASSEAU, Tél : 06 24 18 06 89',
      'Em@ail Locataire': '',
      'TEL LOC': ''
    }
  },
  {
    name: 'Cas 3: Informations complètes réparties',
    data: {
      'Locataire': 'Madame Marie DUPONT',
      'Em@ail Locataire': 'marie.dupont@example.com',
      'TEL LOC': '06 12 34 56 78'
    }
  },
  {
    name: 'Cas 4: Seulement un téléphone',
    data: {
      'Locataire': '',
      'Em@ail Locataire': '',
      'TEL LOC': '0612345678'
    }
  },
  {
    name: 'Cas 5: Format DUPONT Jean',
    data: {
      'Locataire': 'DUPONT Jean',
      'Em@ail Locataire': 'jean.dupont@gmail.com',
      'TEL LOC': '06.12.34.56.78'
    }
  },
  {
    name: 'Cas 6: Données vides',
    data: {
      'Locataire': '',
      'Em@ail Locataire': '',
      'TEL LOC': ''
    }
  }
];

console.log('🧪 Test de parsing des informations de tenants\n');
console.log('='.repeat(80));

testCases.forEach((testCase, index) => {
  console.log(`\n📋 ${testCase.name}`);
  console.log('-'.repeat(80));
  
  const result = dataMapper.parseTenantInfo(testCase.data, true);
  
  console.log('\n📊 Résumé:');
  if (result.firstname || result.lastname) {
    console.log(`  ✅ Nom complet: ${result.firstname || ''} ${result.lastname || ''}`.trim());
  } else {
    console.log('  ⚠️  Pas de nom extrait');
  }
  
  if (result.email) {
    console.log(`  ✅ Email: ${result.email}`);
  } else {
    console.log('  ⚠️  Pas d\'email');
  }
  
  if (result.telephone) {
    console.log(`  ✅ Téléphone: ${result.telephone}`);
    if (result.telephone2) {
      console.log(`  ✅ Téléphone 2: ${result.telephone2}`);
    }
  } else {
    console.log('  ⚠️  Pas de téléphone');
  }
  
  console.log('='.repeat(80));
});

console.log('\n✅ Tests terminés!\n');

