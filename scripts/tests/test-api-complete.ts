#!/usr/bin/env node

// ===== SCRIPT DE TEST COMPLET POUR L'API CRM =====
// Test du workflow complet: créer → assigner → commenter → modifier → supprimer
//
// Ce script teste toutes les fonctionnalités de l'API:
// - Création d'interventions et d'artisans
// - Assignation d'artisans aux interventions
// - Ajout de commentaires
// - Upload de documents
// - Gestion des coûts et paiements
// - Modification des statuts
// - Suppression (soft delete)

import { env, logEnvironmentConfig } from "../../src/lib/env.js";
import {
    artisansApiV2,
    commentsApi,
    documentsApi,
    interventionsApiV2,
} from "../../src/lib/supabase-api-v2.js";
import { supabase } from "../../src/lib/supabase-client.js";

// Configuration centralisée
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Couleurs pour les logs
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: string) {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`🚀 ${step}`, "bright");
  log(`${"=".repeat(60)}`, "cyan");
}

function logSuccess(message: string) {
  log(`✅ ${message}`, "green");
}

function logError(message: string) {
  log(`❌ ${message}`, "red");
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, "blue");
}

// Fonction pour attendre
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fonction pour générer des données de test
function generateTestData() {
  const timestamp = Date.now();

  return {
    artisan: {
      prenom: "Jean",
      nom: "Dupont",
      telephone: "0123456789",
      email: `jean.dupont.${timestamp}@test.com`,
      raison_sociale: "SARL Dupont",
      siret: `1234567890${timestamp.toString().slice(-4)}`,
      statut_juridique: "SARL",
      adresse_siege_social: "123 Rue de la Paix",
      ville_siege_social: "Paris",
      code_postal_siege_social: "75001",
      adresse_intervention: "456 Avenue des Champs",
      ville_intervention: "Paris",
      code_postal_intervention: "75008",
      intervention_latitude: 48.8566,
      intervention_longitude: 2.3522,
      numero_associe: `ART${timestamp}`,
      suivi_relances_docs: "Artisan test créé par script",
    },
    intervention: {
      date: new Date().toISOString(),
      date_prevue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Dans 7 jours
      contexte_intervention:
        "Réparation urgente de plomberie suite à une fuite",
      consigne_intervention: "Intervention prioritaire - client VIP",
      adresse: "789 Boulevard Saint-Germain",
      code_postal: "75006",
      ville: "Paris",
      latitude: 48.85,
      longitude: 2.33,
      numero_sst: `SST${timestamp}`,
      pourcentage_sst: 15.5,
    },
    comment: {
      content: "Intervention créée via script de test - workflow complet",
      comment_type: "internal",
      is_internal: true,
    },
    cost: {
      cost_type: "intervention" as const,
      label: "Main d'œuvre",
      amount: 150.0,
      currency: "EUR",
    },
    payment: {
      payment_type: "acompte_sst",
      amount: 75.0,
      currency: "EUR",
      is_received: true,
      payment_date: new Date().toISOString(),
      reference: `PAY${timestamp}`,
    },
  };
}

// Fonction pour créer un fichier de test
async function createTestFile(): Promise<{
  filename: string;
  content: string;
  mimeType: string;
}> {
  const testContent = `# Document de test
Ceci est un document de test créé par le script de test de l'API CRM.

Timestamp: ${new Date().toISOString()}
Test ID: ${Date.now()}

Contenu du document:
- Type: Rapport d'intervention
- Statut: Test
- Créé par: Script automatisé

Ce document sert à tester l'upload et la gestion des documents dans le système CRM.
`;

  const filename = `test-document-${Date.now()}.md`;
  const mimeType = "text/markdown";

  return {
    filename,
    content: Buffer.from(testContent).toString("base64"),
    mimeType,
  };
}

// Fonction pour obtenir les IDs nécessaires
async function getRequiredIds() {
  logInfo("Récupération des IDs nécessaires...");

  // Récupérer un utilisateur gestionnaire
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, firstname, lastname, username")
    .limit(1);

  if (usersError || !users?.[0]) {
    throw new Error("Aucun utilisateur gestionnaire trouvé");
  }

  // Récupérer un statut d'intervention
  const { data: interventionStatuses, error: statusError } = await supabase
    .from("intervention_statuses")
    .select("id, code, label")
    .eq("is_active", true)
    .limit(1);

  if (statusError || !interventionStatuses?.[0]) {
    throw new Error("Aucun statut d'intervention trouvé");
  }

  // Récupérer un métier
  const { data: metiers, error: metiersError } = await supabase
    .from("metiers")
    .select("id, label, code")
    .eq("is_active", true)
    .limit(1);

  if (metiersError || !metiers?.[0]) {
    throw new Error("Aucun métier trouvé");
  }

  // Récupérer un statut d'artisan
  const { data: artisanStatuses, error: artisanStatusError } = await supabase
    .from("artisan_statuses")
    .select("id, code, label")
    .eq("is_active", true)
    .limit(1);

  if (artisanStatusError || !artisanStatuses?.[0]) {
    throw new Error("Aucun statut d'artisan trouvé");
  }

  logSuccess(
    `Utilisateur gestionnaire: ${users[0].firstname} ${users[0].lastname} (${users[0].username})`
  );
  logSuccess(
    `Statut intervention: ${interventionStatuses[0].label} (${interventionStatuses[0].code})`
  );
  logSuccess(`Métier: ${metiers[0].label} (${metiers[0].code})`);
  logSuccess(
    `Statut artisan: ${artisanStatuses[0].label} (${artisanStatuses[0].code})`
  );

  return {
    gestionnaireId: users[0].id,
    interventionStatusId: interventionStatuses[0].id,
    metierId: metiers[0].id,
    artisanStatusId: artisanStatuses[0].id,
  };
}

// Fonction pour tester la création d'un artisan
async function testCreateArtisan(testData: any, ids: any) {
  logStep("TEST 1: Création d'un artisan");

  const artisanData = {
    ...testData.artisan,
    statut_id: ids.artisanStatusId,
    gestionnaire_id: ids.gestionnaireId,
    metiers: [ids.metierId],
    zones: [], // Pas de zones pour le test
  };

  const artisan = await artisansApiV2.create(artisanData);

  logSuccess(`Artisan créé avec l'ID: ${artisan.id}`);
  logInfo(`Nom: ${artisan.prenom} ${artisan.nom}`);
  logInfo(`Email: ${artisan.email}`);
  logInfo(`Téléphone: ${artisan.telephone}`);

  return artisan;
}

// Fonction pour tester la création d'une intervention
async function testCreateIntervention(testData: any, ids: any) {
  logStep("TEST 2: Création d'une intervention");

  const interventionData = {
    ...testData.intervention,
    assigned_user_id: ids.gestionnaireId,
    statut_id: ids.interventionStatusId,
    metier_id: ids.metierId,
  };

  const intervention = await interventionsApiV2.create(interventionData);

  logSuccess(`Intervention créée avec l'ID: ${intervention.id}`);
  logInfo(`Date: ${intervention.date}`);
  logInfo(`Contexte: ${intervention.contexte_intervention}`);
  logInfo(`Adresse: ${intervention.adresse}, ${intervention.ville}`);

  return intervention;
}

// Fonction pour tester l'assignation d'un artisan
async function testAssignArtisan(interventionId: string, artisanId: string) {
  logStep("TEST 3: Assignation d'un artisan à l'intervention");

  const assignment = await interventionsApiV2.assignArtisan(
    interventionId,
    artisanId,
    "primary"
  );

  logSuccess(`Artisan assigné avec l'ID: ${assignment.id}`);
  logInfo(`Rôle: ${assignment.role}`);
  logInfo(`Primaire: ${assignment.is_primary}`);

  return assignment;
}

// Fonction pour tester l'ajout d'un commentaire
async function testAddComment(interventionId: string, testData: any, ids: any) {
  logStep("TEST 4: Ajout d'un commentaire à l'intervention");

  const commentData = {
    ...testData.comment,
    entity_id: interventionId,
    entity_type: "intervention",
    author_id: ids.gestionnaireId,
  };

  const comment = await commentsApi.create(commentData);

  logSuccess(`Commentaire créé avec l'ID: ${comment.id}`);
  logInfo(`Type: ${comment.comment_type}`);
  logInfo(`Interne: ${comment.is_internal}`);
  logInfo(`Auteur: ${comment.author_id}`);
  logInfo(`Contenu: ${comment.content}`);

  return comment;
}

// Fonction pour tester l'upload d'un document
async function testUploadDocument(interventionId: string) {
  logStep("TEST 5: Upload d'un document");

  const testFile = await createTestFile();

  const documentData = {
    entity_id: interventionId,
    entity_type: "intervention",
    kind: "devis",
    filename: testFile.filename,
    mime_type: testFile.mimeType,
    file_size: Buffer.from(testFile.content, "base64").length,
    content: testFile.content,
  };

  const attachment = await documentsApi.upload(documentData);

  logSuccess(`Document uploadé avec l'ID: ${attachment.id}`);
  logInfo(`Type: ${attachment.kind}`);
  logInfo(`Fichier: ${attachment.filename}`);
  logInfo(`Taille: ${attachment.file_size} bytes`);
  logInfo(`MIME: ${attachment.mime_type}`);

  return attachment;
}

// Fonction pour tester l'ajout d'un coût
async function testAddCost(interventionId: string, testData: any) {
  logStep("TEST 6: Ajout d'un coût à l'intervention");

  const cost = await interventionsApiV2.addCost(interventionId, testData.cost);

  logSuccess(`Coût créé avec l'ID: ${cost.id}`);
  logInfo(`Type: ${cost.cost_type}`);
  logInfo(`Label: ${cost.label}`);
  logInfo(`Montant: ${cost.amount} ${cost.currency}`);

  return cost;
}

// Fonction pour tester l'ajout d'un paiement
async function testAddPayment(interventionId: string, testData: any) {
  logStep("TEST 7: Ajout d'un paiement à l'intervention");

  const payment = await interventionsApiV2.addPayment(
    interventionId,
    testData.payment
  );

  logSuccess(`Paiement créé avec l'ID: ${payment.id}`);
  logInfo(`Type: ${payment.payment_type}`);
  logInfo(`Montant: ${payment.amount} ${payment.currency}`);
  logInfo(`Reçu: ${payment.is_received}`);
  logInfo(`Référence: ${payment.reference}`);

  return payment;
}

// Fonction pour tester la modification de l'intervention
async function testUpdateIntervention(interventionId: string, ids: any) {
  logStep("TEST 8: Modification de l'intervention");

  // Récupérer un nouveau statut
  const { data: newStatus, error: statusError } = await supabase
    .from("intervention_statuses")
    .select("id, code, label")
    .eq("is_active", true)
    .neq("id", ids.interventionStatusId)
    .limit(1);

  if (statusError || !newStatus?.[0]) {
    logInfo("Aucun autre statut disponible, utilisation du statut actuel");
  }

  const updateData = {
    commentaire_agent: "Intervention mise à jour via script de test",
    date_termine: new Date().toISOString(),
    statut_id: newStatus?.[0]?.id || ids.interventionStatusId,
  };

  const updatedIntervention = await interventionsApiV2.update(
    interventionId,
    updateData
  );

  logSuccess(`Intervention modifiée avec succès`);
  logInfo(`Nouveau statut: ${newStatus?.[0]?.label || "Statut inchangé"}`);
  logInfo(`Date terminé: ${updatedIntervention.date_termine}`);
  logInfo(`Commentaire agent: ${updatedIntervention.commentaire_agent}`);

  return updatedIntervention;
}

// Fonction pour tester la suppression (soft delete)
async function testDeleteIntervention(interventionId: string) {
  logStep("TEST 9: Suppression de l'intervention (soft delete)");

  const deletedIntervention = await interventionsApiV2.delete(interventionId);

  logSuccess(`Intervention supprimée (soft delete) avec succès`);
  logInfo(`Statut actif: ${deletedIntervention.is_active}`);
  logInfo(`Date mise à jour: ${deletedIntervention.updated_at}`);

  return deletedIntervention;
}

// Fonction pour tester la récupération des données
async function testRetrieveData(interventionId: string, artisanId: string) {
  logStep("TEST 10: Récupération des données créées");

  // Récupérer l'intervention avec toutes ses relations
  const intervention = await interventionsApiV2.getById(interventionId, [
    "agencies",
    "clients",
    "users",
    "statuses",
    "metiers",
    "artisans",
    "costs",
    "payments",
    "attachments",
    "comments",
  ]);

  logSuccess(`Intervention récupérée avec succès`);
  logInfo(`Artisans assignés: ${intervention.artisans?.length || 0}`);
  logInfo(`Coûts: ${intervention.costs?.length || 0}`);
  logInfo(`Paiements: ${intervention.payments?.length || 0}`);
  logInfo(`Documents: ${intervention.attachments?.length || 0}`);
  logInfo(`Commentaires: ${intervention.comments?.length || 0}`);

  // Récupérer l'artisan avec ses relations
  const artisan = await artisansApiV2.getById(artisanId, [
    "metiers",
    "zones",
    "attachments",
  ]);

  logSuccess(`Artisan récupéré avec succès`);
  logInfo(`Métiers: ${artisan.metiers?.length || 0}`);
  logInfo(`Zones: ${artisan.zones?.length || 0}`);
  logInfo(`Documents: ${artisan.attachments?.length || 0}`);

  return { intervention, artisan };
}

// Fonction principale de test
async function runCompleteTest() {
  try {
    log("🚀 DÉMARRAGE DU TEST COMPLET DE L'API CRM", "bright");
    log(
      "Ce test va créer une intervention, lui assigner un artisan, ajouter des commentaires, documents, coûts et paiements, puis la modifier et la supprimer.",
      "blue"
    );

    await sleep(1000);

    // Générer les données de test
    const testData = generateTestData();
    logInfo("Données de test générées");

    // Récupérer les IDs nécessaires
    const ids = await getRequiredIds();

    // Test 1: Créer un artisan
    const artisan = await testCreateArtisan(testData, ids);
    await sleep(500);

    // Test 2: Créer une intervention
    const intervention = await testCreateIntervention(testData, ids);
    await sleep(500);

    // Test 3: Assigner l'artisan à l'intervention
    const assignment = await testAssignArtisan(intervention.id, artisan.id);
    await sleep(500);

    // Test 4: Ajouter un commentaire
    const comment = await testAddComment(intervention.id, testData, ids);
    await sleep(500);

    // Test 5: Uploader un document
    const document = await testUploadDocument(intervention.id);
    await sleep(500);

    // Test 6: Ajouter un coût
    const cost = await testAddCost(intervention.id, testData);
    await sleep(500);

    // Test 7: Ajouter un paiement
    const payment = await testAddPayment(intervention.id, testData);
    await sleep(500);

    // Test 8: Modifier l'intervention
    const updatedIntervention = await testUpdateIntervention(
      intervention.id,
      ids
    );
    await sleep(500);

    // Test 9: Supprimer l'intervention (soft delete)
    const deletedIntervention = await testDeleteIntervention(intervention.id);
    await sleep(500);

    // Test 10: Récupérer les données
    const retrievedData = await testRetrieveData(intervention.id, artisan.id);

    // Résumé final
    logStep("RÉSUMÉ DU TEST");
    logSuccess("✅ Tous les tests ont été exécutés avec succès !");
    logInfo(`Artisan créé: ${artisan.id}`);
    logInfo(`Intervention créée: ${intervention.id}`);
    logInfo(`Assignation: ${assignment.id}`);
    logInfo(`Commentaire: ${comment.id}`);
    logInfo(`Document: ${document.id}`);
    logInfo(`Coût: ${cost.id}`);
    logInfo(`Paiement: ${payment.id}`);
    logInfo(`Intervention modifiée et supprimée: ${intervention.id}`);

    log("\n🎉 WORKFLOW COMPLET TESTÉ AVEC SUCCÈS !", "green");
    log("L'API CRM est fonctionnelle et prête pour la production.", "green");
  } catch (error) {
    logError(`Erreur lors du test: ${error.message}`);
    logError("Stack trace:", "red");
    console.error(error);
    process.exit(1);
  }
}

// Fonction pour vérifier la connexion à Supabase
async function checkSupabaseConnection() {
  logStep("VÉRIFICATION DE LA CONNEXION SUPABASE");
  
  // Afficher la configuration chargée
  logEnvironmentConfig();

  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      throw new Error(`Erreur de connexion: ${error.message}`);
    }

    logSuccess("Connexion à Supabase réussie");
    logInfo(`URL: ${SUPABASE_URL}`);
    logInfo(`Clé anonyme configurée: ${SUPABASE_ANON_KEY ? "Oui" : "Non"}`);
    logInfo(
      `Clé service role configurée: ${
        SUPABASE_SERVICE_ROLE_KEY ? "Oui" : "Non"
      }`
    );
  } catch (error) {
    logError(`Impossible de se connecter à Supabase: ${error.message}`);
    logError(
      "Vérifiez que Supabase est démarré et que les variables d'environnement sont correctes."
    );
    process.exit(1);
  }
}

// Fonction pour afficher l'aide
function showHelp() {
  log("📖 AIDE - SCRIPT DE TEST API CRM", "bright");
  log("");
  log("Ce script teste toutes les fonctionnalités de l'API CRM:", "blue");
  log("• Création d'artisans et d'interventions", "blue");
  log("• Assignation d'artisans aux interventions", "blue");
  log("• Ajout de commentaires, documents, coûts et paiements", "blue");
  log("• Modification des statuts", "blue");
  log("• Suppression (soft delete)", "blue");
  log("");
  log("Variables d'environnement requises:", "yellow");
  log("• NEXT_PUBLIC_SUPABASE_URL", "yellow");
  log("• NEXT_PUBLIC_SUPABASE_ANON_KEY", "yellow");
  log("• SUPABASE_SERVICE_ROLE_KEY", "yellow");
  log("");
  log("Utilisation:", "green");
  log("  npm run test:api", "green");
  log("  node scripts/test-api-complete.js", "green");
  log("");
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  log("🔧 SCRIPT DE TEST COMPLET - API CRM GMBS", "bright");
  log("Version: 1.0.0", "blue");
  log("Date: " + new Date().toISOString(), "blue");
  log("");

  // Vérifier la connexion
  await checkSupabaseConnection();

  // Lancer le test complet
  await runCompleteTest();
}

// Gestion des erreurs non capturées
process.on("unhandledRejection", (reason, promise) => {
  logError("Erreur non gérée détectée:");
  console.error(reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logError("Exception non capturée:");
  console.error(error);
  process.exit(1);
});

// Lancer le script
main().catch((error) => {
  logError(`Erreur fatale: ${error.message}`);
  process.exit(1);
});

export { checkSupabaseConnection, runCompleteTest };

