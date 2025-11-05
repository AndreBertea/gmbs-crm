#!/usr/bin/env node
/**
 * Script d'import automatique de devis extraits dans le CRM
 * 
 * Ce script prend un JSON extrait par extract-from-devis.py et l'insère
 * automatiquement dans la base de données via l'API V2.
 * 
 * Usage:
 *   node import-extracted-devis.js --input extracted.json
 *   node import-extracted-devis.js --input extracted.json --dry-run
 */

const fs = require('fs').promises;
const path = require('path');

// Import de l'API V2
const { interventionsApi } = require('../../../src/lib/api/v2/interventionsApi');
const { tenantsApi } = require('../../../src/lib/api/v2/tenantsApi');
const { ownersApi } = require('../../../src/lib/api/v2/ownersApi');
const { enumsApi } = require('../../../src/lib/api/v2/enumsApi');

/**
 * Nettoie et normalise un numéro de téléphone
 */
function normalizeTelephone(tel) {
  if (!tel) return null;
  // Enlever tous les caractères non-numériques sauf le +
  return tel.replace(/[^\d+]/g, '');
}

/**
 * Normalise une adresse email
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Trouve ou crée un tenant (client/locataire)
 */
async function findOrCreateTenant(tenantData) {
  if (!tenantData) return null;

  console.log('🔍 Recherche du tenant...');

  // Chercher par email ou téléphone
  let existingTenant = null;

  if (tenantData.email) {
    existingTenant = await tenantsApi.findByEmail(normalizeEmail(tenantData.email));
  }

  if (!existingTenant && tenantData.telephone) {
    existingTenant = await tenantsApi.findByTelephone(normalizeTelephone(tenantData.telephone));
  }

  if (existingTenant) {
    console.log(`✅ Tenant existant trouvé: ${existingTenant.firstname} ${existingTenant.lastname}`);
    return existingTenant;
  }

  // Créer un nouveau tenant
  console.log('➕ Création d\'un nouveau tenant...');
  const newTenant = await tenantsApi.create({
    firstname: tenantData.firstname,
    lastname: tenantData.lastname,
    email: normalizeEmail(tenantData.email),
    telephone: normalizeTelephone(tenantData.telephone),
    adresse: tenantData.adresse,
    ville: tenantData.ville,
    code_postal: tenantData.code_postal,
  });

  console.log(`✅ Tenant créé: ${newTenant.firstname} ${newTenant.lastname} (ID: ${newTenant.id})`);
  return newTenant;
}

/**
 * Trouve ou crée un owner (propriétaire)
 */
async function findOrCreateOwner(ownerData) {
  if (!ownerData) return null;

  console.log('🔍 Recherche du propriétaire...');

  // Chercher par téléphone ou raison sociale
  let existingOwner = null;

  if (ownerData.telephone) {
    existingOwner = await ownersApi.findByTelephone(normalizeTelephone(ownerData.telephone));
  }

  if (!existingOwner && ownerData.raison_sociale) {
    existingOwner = await ownersApi.findByRaisonSociale(ownerData.raison_sociale);
  }

  if (existingOwner) {
    console.log(`✅ Propriétaire existant trouvé: ${existingOwner.owner_firstname || ''} ${existingOwner.owner_lastname || existingOwner.raison_sociale || ''}`);
    return existingOwner;
  }

  // Créer un nouveau propriétaire
  console.log('➕ Création d\'un nouveau propriétaire...');
  const newOwner = await ownersApi.create({
    owner_firstname: ownerData.firstname,
    owner_lastname: ownerData.lastname,
    telephone: normalizeTelephone(ownerData.telephone),
    raison_sociale: ownerData.raison_sociale,
  });

  console.log(`✅ Propriétaire créé (ID: ${newOwner.id})`);
  return newOwner;
}

/**
 * Importe une demande de devis extraite
 */
async function importDevis(extractedData, dryRun = false) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 IMPORT D\'UNE DEMANDE DE DEVIS');
  console.log('='.repeat(80));
  
  if (dryRun) {
    console.log('🔍 MODE DRY-RUN : Aucune donnée ne sera insérée');
  }

  try {
    // 1. Résoudre le métier
    console.log('\n1️⃣ Résolution du métier...');
    let metierId = null;
    if (extractedData.metier) {
      metierId = await enumsApi.findOrCreateMetier(extractedData.metier);
      console.log(`✅ Métier: ${extractedData.metier} (ID: ${metierId})`);
    } else {
      console.log('⚠️  Aucun métier spécifié');
    }

    // 2. Créer/trouver le tenant
    console.log('\n2️⃣ Gestion du tenant...');
    const tenant = dryRun ? null : await findOrCreateTenant(extractedData.tenant);
    const tenantId = tenant?.id || null;

    // 3. Créer/trouver le propriétaire (si présent)
    console.log('\n3️⃣ Gestion du propriétaire...');
    const owner = dryRun ? null : await findOrCreateOwner(extractedData.owner);
    const ownerId = owner?.id || null;

    // 4. Résoudre l'agence (si présente)
    console.log('\n4️⃣ Résolution de l\'agence...');
    let agenceId = null;
    if (extractedData.agence) {
      agenceId = await enumsApi.findOrCreateAgence(extractedData.agence);
      console.log(`✅ Agence: ${extractedData.agence} (ID: ${agenceId})`);
    } else {
      console.log('ℹ️  Aucune agence spécifiée');
    }

    // 5. Déterminer le statut initial
    console.log('\n5️⃣ Détermination du statut...');
    let statutId = null;
    if (extractedData.intervention?.urgence) {
      // Chercher un statut "urgent" ou "à traiter en priorité"
      statutId = await enumsApi.findOrCreateInterventionStatus('Urgent');
      console.log('🚨 Statut: Urgent');
    } else {
      // Statut par défaut : "Nouveau" ou "À planifier"
      statutId = await enumsApi.findOrCreateInterventionStatus('Nouveau');
      console.log('📌 Statut: Nouveau');
    }

    // 6. Préparer les données de l'intervention
    console.log('\n6️⃣ Préparation de l\'intervention...');
    const interventionData = {
      tenant_id: tenantId,
      owner_id: ownerId,
      agence_id: agenceId,
      metier_id: metierId,
      statut_id: statutId,
      
      date: extractedData.intervention?.date_souhaitee 
        ? new Date(extractedData.intervention.date_souhaitee).toISOString()
        : new Date().toISOString(),
      
      adresse: extractedData.intervention?.adresse,
      ville: extractedData.intervention?.ville,
      code_postal: extractedData.intervention?.code_postal,
      
      contexte_intervention: extractedData.intervention?.contexte,
      
      // Métadonnées pour traçabilité
      commentaire_agent: `[AUTO-IMPORT] Demande de devis importée automatiquement depuis OCR le ${new Date().toLocaleString('fr-FR')}`,
    };

    console.log('📦 Données prêtes:');
    console.log(JSON.stringify(interventionData, null, 2));

    // 7. Créer l'intervention
    if (dryRun) {
      console.log('\n✅ DRY-RUN : L\'intervention ne sera PAS créée');
      return {
        success: true,
        dryRun: true,
        data: interventionData,
      };
    }

    console.log('\n7️⃣ Création de l\'intervention...');
    const intervention = await interventionsApi.create(interventionData);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ INTERVENTION CRÉÉE AVEC SUCCÈS');
    console.log('='.repeat(80));
    console.log(`ID: ${intervention.id}`);
    console.log(`Métier: ${extractedData.metier}`);
    console.log(`Adresse: ${intervention.adresse}, ${intervention.code_postal} ${intervention.ville}`);
    console.log(`Tenant: ${tenant?.firstname} ${tenant?.lastname}`);
    if (owner) {
      console.log(`Propriétaire: ${owner.owner_firstname || ''} ${owner.owner_lastname || owner.raison_sociale || ''}`);
    }
    console.log('='.repeat(80));

    return {
      success: true,
      intervention,
      tenant,
      owner,
    };

  } catch (error) {
    console.error('\n❌ ERREUR lors de l\'import:', error);
    throw error;
  }
}

/**
 * Point d'entrée principal
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parser les arguments
  let inputFile = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      inputFile = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run' || args[i] === '-d') {
      dryRun = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: node import-extracted-devis.js [OPTIONS]

Options:
  --input, -i <file>    Fichier JSON contenant les données extraites
  --dry-run, -d         Mode simulation (aucune insertion en base)
  --help, -h            Afficher cette aide

Exemple:
  node import-extracted-devis.js --input extracted.json
  node import-extracted-devis.js --input extracted.json --dry-run
      `);
      process.exit(0);
    }
  }

  if (!inputFile) {
    console.error('❌ Erreur: --input requis');
    console.log('Usage: node import-extracted-devis.js --input <file> [--dry-run]');
    process.exit(1);
  }

  // Lire le fichier
  console.log(`📂 Lecture du fichier: ${inputFile}`);
  const content = await fs.readFile(inputFile, 'utf-8');
  const data = JSON.parse(content);

  // Traiter selon le format
  let results = [];

  if (Array.isArray(data)) {
    // Format batch (plusieurs extractions)
    console.log(`📦 ${data.length} devis à importer`);
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (item.error) {
        console.log(`\n⏭️  [${i + 1}/${data.length}] Extraction échouée, ignoré`);
        results.push({ success: false, error: item.error });
        continue;
      }

      try {
        console.log(`\n📄 [${i + 1}/${data.length}] Import en cours...`);
        const result = await importDevis(item.extracted, dryRun);
        results.push(result);
      } catch (error) {
        console.error(`❌ Erreur pour le devis ${i + 1}:`, error.message);
        results.push({ success: false, error: error.message });
      }
    }
  } else if (data.extracted) {
    // Format simple (une extraction)
    const result = await importDevis(data.extracted, dryRun);
    results.push(result);
  } else {
    // Format direct (données extraites sans wrapper)
    const result = await importDevis(data, dryRun);
    results.push(result);
  }

  // Résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ DE L\'IMPORT');
  console.log('='.repeat(80));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Réussis: ${successful}`);
  console.log(`❌ Échoués: ${failed}`);
  console.log(`📋 Total: ${results.length}`);
  console.log('='.repeat(80));

  // Sauvegarder le résultat
  const outputFile = inputFile.replace('.json', '_imported.json');
  await fs.writeFile(outputFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾 Résultats sauvegardés: ${outputFile}`);

  process.exit(failed > 0 ? 1 : 0);
}

// Exécution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { importDevis };









