#!/usr/bin/env node

/**
 * Exemple des nouveaux logs de batch avec statistiques consolidées
 * 
 * Ce script montre à quoi ressembleront les logs après les modifications :
 * - Statistiques de batch regroupées dans un objet cohérent
 * - Logs plus lisibles et informatifs
 * - Pourcentages calculés automatiquement
 */

console.log('📊 EXEMPLE DES NOUVEAUX LOGS DE BATCH');
console.log('='.repeat(80));

// Simulation des logs de batch
const exampleBatches = [
  {
    batchNumber: 1,
    stats: {
      interventions: 50,
      errors: 0,
      withCosts: 45,
      withoutCosts: 5,
      artisansLinked: 42,
      statusesMapped: 48
    }
  },
  {
    batchNumber: 2,
    stats: {
      interventions: 50,
      errors: 2,
      withCosts: 47,
      withoutCosts: 1,
      artisansLinked: 38,
      statusesMapped: 49
    }
  },
  {
    batchNumber: 3,
    stats: {
      interventions: 25,
      errors: 1,
      withCosts: 23,
      withoutCosts: 1,
      artisansLinked: 20,
      statusesMapped: 24
    }
  }
];

// Afficher les logs de batch
exampleBatches.forEach(batch => {
  const { batchNumber, stats } = batch;
  console.log(`📊 Lot ${batchNumber}: ${stats.interventions} interventions, 💰 ${stats.withCosts} avec coûts, 👷 ${stats.artisansLinked} artisans liés, 📋 ${stats.statusesMapped} statuts mappés`);
});

console.log('\n' + '='.repeat(80));

// Calculer les statistiques globales
const globalStats = {
  interventions: exampleBatches.reduce((sum, batch) => sum + batch.stats.interventions, 0),
  errors: exampleBatches.reduce((sum, batch) => sum + batch.stats.errors, 0),
  withCosts: exampleBatches.reduce((sum, batch) => sum + batch.stats.withCosts, 0),
  withoutCosts: exampleBatches.reduce((sum, batch) => sum + batch.stats.withoutCosts, 0),
  artisansLinked: exampleBatches.reduce((sum, batch) => sum + batch.stats.artisansLinked, 0),
  statusesMapped: exampleBatches.reduce((sum, batch) => sum + batch.stats.statusesMapped, 0)
};

// Calculer les pourcentages
const totalInterventions = globalStats.withCosts + globalStats.withoutCosts;
const percentageWithCosts = totalInterventions > 0 ? (globalStats.withCosts / totalInterventions * 100).toFixed(1) : 0;
const percentageArtisansLinked = globalStats.interventions > 0 ? (globalStats.artisansLinked / globalStats.interventions * 100).toFixed(1) : 0;
const percentageStatusesMapped = globalStats.interventions > 0 ? (globalStats.statusesMapped / globalStats.interventions * 100).toFixed(1) : 0;

console.log('📈 RÉSUMÉ GLOBAL:');
console.log(`✅ Insertion terminée: ${globalStats.interventions} interventions, 💰 ${globalStats.withCosts} avec coûts (${percentageWithCosts}%), 👷 ${globalStats.artisansLinked} artisans liés (${percentageArtisansLinked}%), 📋 ${globalStats.statusesMapped} statuts mappés (${percentageStatusesMapped}%)`);

console.log('\n' + '='.repeat(80));
console.log('✨ AVANTAGES DES NOUVELLES STATISTIQUES:');
console.log('• 📊 Toutes les métriques importantes en un coup d\'œil');
console.log('• 👷 Visibilité sur le taux de liaison des artisans SST');
console.log('• 📋 Visibilité sur le taux de mapping des statuts');
console.log('• 💰 Conservation des statistiques de coûts existantes');
console.log('• 🎯 Code plus lisible avec objets consolidés');
console.log('• 📈 Pourcentages automatiques pour analyse rapide');
console.log('='.repeat(80));

