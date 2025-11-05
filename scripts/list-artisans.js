#!/usr/bin/env node
/**
 * list-artisans.js — List all artisans in the database
 * Usage: node scripts/list-artisans.js [limit]
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
const limit = parseInt(process.argv[2]) || 10;

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listArtisans() {
  console.log('\n📋 Liste des artisans dans la base de données...\n');
  
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('artisans')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erreur lors du comptage:', countError.message);
      return;
    }
    
    console.log(`📊 Total d'artisans dans la base de données: ${count || 0}\n`);
    
    if (count === 0) {
      console.log('❌ La base de données est vide. Aucun artisan trouvé.\n');
      return;
    }
    
    // Get limited list
    const { data, error } = await supabase
      .from('artisans')
      .select('id, prenom, nom, plain_nom, email, telephone, raison_sociale, ville_siege_social, is_active')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ Erreur lors de la récupération:', error.message);
      return;
    }
    
    console.log(`Affichage des ${Math.min(limit, data.length)} premiers artisans:\n`);
    
    data.forEach((artisan, index) => {
      console.log(`${index + 1}. ${artisan.prenom || 'N/A'} ${artisan.nom || 'N/A'}`);
      console.log(`   Plain nom: ${artisan.plain_nom || 'N/A'}`);
      console.log(`   Email: ${artisan.email || 'N/A'}`);
      console.log(`   Téléphone: ${artisan.telephone || 'N/A'}`);
      console.log(`   Raison sociale: ${artisan.raison_sociale || 'N/A'}`);
      console.log(`   Ville: ${artisan.ville_siege_social || 'N/A'}`);
      console.log(`   Actif: ${artisan.is_active ? 'Oui' : 'Non'}`);
      console.log('');
    });
    
    if (count > limit) {
      console.log(`\n💡 Il y a ${count - limit} artisans supplémentaires non affichés.`);
      console.log(`   Pour voir plus, utilisez: node scripts/list-artisans.js ${limit + 10}\n`);
    }
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
  }
}

// Run the list
listArtisans()
  .then(() => {
    console.log('✅ Liste terminée\n');
  })
  .catch((error) => {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  });




