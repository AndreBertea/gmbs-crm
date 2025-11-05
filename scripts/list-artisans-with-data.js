#!/usr/bin/env node
/**
 * list-artisans-with-data.js — List artisans with actual data
 * Usage: node scripts/list-artisans-with-data.js [limit]
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Get limit from command line
const limit = parseInt(process.argv[2]) || 20;

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listArtisansWithData() {
  console.log('\n📋 Liste des artisans avec données non vides...\n');
  
  try {
    // Get artisans with at least some data
    const { data, error } = await supabase
      .from('artisans')
      .select('id, prenom, nom, plain_nom, email, telephone, raison_sociale, siret, ville_siege_social, is_active, created_at')
      .or('prenom.not.is.null,nom.not.is.null,email.not.is.null,plain_nom.not.is.null,raison_sociale.not.is.null')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ Erreur lors de la récupération:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ Aucun artisan avec des données trouvé.\n');
      return;
    }
    
    console.log(`📊 Affichage des ${data.length} artisans avec données:\n`);
    
    data.forEach((artisan, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${index + 1}. ${artisan.prenom || ''} ${artisan.nom || ''}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   ID: ${artisan.id}`);
      console.log(`   Plain nom: ${artisan.plain_nom || 'N/A'}`);
      console.log(`   Email: ${artisan.email || 'N/A'}`);
      console.log(`   Téléphone: ${artisan.telephone || 'N/A'}`);
      console.log(`   Raison sociale: ${artisan.raison_sociale || 'N/A'}`);
      console.log(`   SIRET: ${artisan.siret || 'N/A'}`);
      console.log(`   Ville: ${artisan.ville_siege_social || 'N/A'}`);
      console.log(`   Actif: ${artisan.is_active ? 'Oui' : 'Non'}`);
      console.log(`   Créé le: ${artisan.created_at || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
  }
}

// Run the list
listArtisansWithData()
  .then(() => {
    console.log('✅ Liste terminée\n');
  })
  .catch((error) => {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  });




