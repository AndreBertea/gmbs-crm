#!/usr/bin/env node

/**
 * Script de test pour l'import des tenants
 * Teste l'extraction et la création des tenants depuis les interventions
 */

console.log('🚀 Démarrage du test d\'import des tenants...\n');

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

// Cas de test avec différentes interventions
const testInterventions = [
  {
    'Locataire': 'Monsieur Thilai SALIGNAT PLUMASSEAU',
    'Em@ail Locataire': 'thilai.salignat@example.com',
    'TEL LOC': '06 24 18 06 89'
  },
  {
    'Locataire': '',
    'Em@ail Locataire': '',
    'TEL LOC': 'M THOMAS GERMANAUD 0632148492 / 06 42 50 79 88 conjointe'
  },
  {
    'Locataire': 'Madame Sophie MARTIN',
    'Em@ail Locataire': 'sophie.martin@gmail.com',
    'TEL LOC': '06 12 34 56 78'
  },
  {
    'Locataire': 'DUPONT Jean',
    'Em@ail Locataire': '',
    'TEL LOC': '0612345678'
  },
  {
    'Locataire': '',
    'Em@ail Locataire': 'contact@example.com',
    'TEL LOC': ''
  }
];

console.log('📋 Test de l\'extraction des tenants depuis les interventions:\n');
console.log('='.repeat(80));

const extractedTenants = [];
const tenantsMap = new Map();

testInterventions.forEach((intervention, index) => {
  console.log(`\n🔍 Test ${index + 1}:`);
  console.log(`   Locataire: "${intervention['Locataire']}"`);
  console.log(`   Email: "${intervention['Em@ail Locataire']}"`);
  console.log(`   Téléphone: "${intervention['TEL LOC']}"`);
  
  try {
    // Parser les informations du tenant
    const tenantInfo = dataMapper.parseTenantInfo(intervention, true);
    
    console.log('\n   📊 Résultat du parsing:');
    console.log(`   - Prénom: ${tenantInfo.firstname || '(vide)'}`);
    console.log(`   - Nom: ${tenantInfo.lastname || '(vide)'}`);
    console.log(`   - Email: ${tenantInfo.email || '(vide)'}`);
    console.log(`   - Téléphone 1: ${tenantInfo.telephone || '(vide)'}`);
    console.log(`   - Téléphone 2: ${tenantInfo.telephone2 || '(vide)'}`);
    console.log(`   - A des données: ${tenantInfo.hasData ? '✅' : '❌'}`);
    
    if (tenantInfo.hasData) {
      // Mapper le tenant pour l'insertion
      const mappedTenant = dataMapper.mapTenantFromIntervention(intervention);
      
      if (mappedTenant) {
        // Créer une clé unique
        const tenantKey = tenantInfo.email || tenantInfo.telephone || `${tenantInfo.firstname}_${tenantInfo.lastname}`;
        
        if (!tenantsMap.has(tenantKey)) {
          tenantsMap.set(tenantKey, mappedTenant);
          extractedTenants.push(mappedTenant);
          console.log(`   ✅ Tenant unique ajouté avec la clé: ${tenantKey}`);
        } else {
          console.log(`   ⚠️ Tenant déjà existant (clé: ${tenantKey})`);
        }
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Erreur lors du parsing:`, error.message);
  }
  
  console.log('-'.repeat(80));
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Résumé:`);
console.log(`   - Interventions testées: ${testInterventions.length}`);
console.log(`   - Tenants uniques extraits: ${extractedTenants.length}`);

if (extractedTenants.length > 0) {
  console.log('\n📋 Liste des tenants extraits:');
  extractedTenants.forEach((tenant, index) => {
    console.log(`\n   ${index + 1}. ${tenant.firstname || '?'} ${tenant.lastname || '?'}`);
    console.log(`      Email: ${tenant.email || '(vide)'}`);
    console.log(`      Tél 1: ${tenant.telephone || '(vide)'}`);
    console.log(`      Tél 2: ${tenant.telephone2 || '(vide)'}`);
  });
}

console.log('\n✅ Test terminé!\n');

