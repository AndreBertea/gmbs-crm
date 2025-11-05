#!/usr/bin/env node

/**
 * Script de test pour l'extraction d'adresses
 * 
 * Teste la nouvelle fonction extractInterventionAddress avec les exemples fournis
 */

const { DataMapper } = require('../data-processing/data-mapper');

class AddressExtractionTester {
  constructor() {
    this.dataMapper = new DataMapper();
  }

  testAddressExtraction() {
    console.log('🧪 TEST D\'EXTRACTION D\'ADRESSES');
    console.log('=================================\n');

    const testAddresses = [
      '3 A RUE DE LA DIVISION LECLERC 67120 DORLISHEIM',
      '5 rue Saint-Nicaise Arras / LON NRP / COTE VELUX',
      '169 RUE DES BORDIERS 37100 TOURS // ATT RETOUR AFEDIM',
      '2 RUE DU GENERAL LECLERC 14550 BLAINVILLE SUR ORNE / tjr d\'actu',
      'APT C17 SQUARE 13 rue du dévouement 59170 CROIX / 1er étage // clefs ???',
      'BAT 1 - APPT 127 - 2EME ETAGE OPALINES 23 RUE JEAN MARIN 35000 RENNES',
      'BOTANIK - APPT 01 - O.18 147 RUE LUCIE AUBRAC 62217 BEAURAINS',
      'Bâtiment A - 2nd - N°A21 LA PROMENADE DU PASTEUR 12 Rue Emile Duclaux 86000 POITIERS',
      'LE FLAUBERT 35 rue du Gros Caillou 77240 CESSON // att retour loc pas dispo',
      '": BATIMENT TERRASSES DU MONT 8 RUE DE PULLY 67210 OBERNAI',
      'BATIMENT A EDEN ROC 1553 AVENUE DE LA BOUVERIE 83520 ROQUEBRUNE SUR ARGENS',
      'BAT B - RDC - APT 102 CARRE EUROPA - VILLA EUROPA 4 RUE DAHLENHEIM 67200 STRASBOURG',
      'APT 114 COTE VERCORS - APT 114 25 rue Chevandier 26000 VALENCE',
      'BATIMENT B - 3EME - APPT B325 RESIDENCE ALLEE MOZART 12 RUE DES MARQUIS 76100 ROUEN',
      'BATIMENT 321 SAINT QUENTIN 321 BOULEVARD DE SAINT QUENTIN 80000 AMIENS',
      'BATIMENT B DOMAINE 20 AVENUE DE LEMPDES 63800 COURNON D AUVERGNE',
      '577 Avenue Du Professeur Louis Ravas Montpellier - Et. 3',
      '5 Avenue Charles de Gaulle, Bordeaux',
      '12 Clos Saint François, 56370, SARZEAU'
    ];

    console.log('Adresse originale | Adresse extraite | Ville | Code postal');
    console.log('------------------|------------------|-------|-------------');

    testAddresses.forEach((originalAddress, index) => {
      const result = this.dataMapper.extractInterventionAddress(originalAddress);
      
      console.log(`${originalAddress.padEnd(18)} | ${(result.adresse || '').padEnd(16)} | ${(result.ville || '').padEnd(5)} | ${result.codePostal || ''}`);
    });

    console.log('\n📊 STATISTIQUES:');
    let withAddress = 0;
    let withCity = 0;
    let withPostalCode = 0;
    let complete = 0;

    testAddresses.forEach(address => {
      const result = this.dataMapper.extractInterventionAddress(address);
      if (result.adresse) withAddress++;
      if (result.ville) withCity++;
      if (result.codePostal) withPostalCode++;
      if (result.adresse && result.ville && result.codePostal) complete++;
    });

    console.log(`  📍 Avec adresse: ${withAddress}/${testAddresses.length} (${((withAddress/testAddresses.length)*100).toFixed(1)}%)`);
    console.log(`  🏙️  Avec ville: ${withCity}/${testAddresses.length} (${((withCity/testAddresses.length)*100).toFixed(1)}%)`);
    console.log(`  📮 Avec code postal: ${withPostalCode}/${testAddresses.length} (${((withPostalCode/testAddresses.length)*100).toFixed(1)}%)`);
    console.log(`  ✅ Complètes: ${complete}/${testAddresses.length} (${((complete/testAddresses.length)*100).toFixed(1)}%)`);
  }
}

async function main() {
  const tester = new AddressExtractionTester();
  tester.testAddressExtraction();
}

if (require.main === module) {
  main();
}

module.exports = { AddressExtractionTester };
