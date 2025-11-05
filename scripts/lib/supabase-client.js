/**
 * Client Supabase pour les scripts Node.js
 * 
 * Ce fichier charge la configuration depuis .env.local
 * et exporte les clients Supabase pour utilisation dans les scripts
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL non défini dans .env.local');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY non défini dans .env.local');
}

if (!supabaseServiceRoleKey) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY non défini, utilisation de la clé anonyme');
}

// Client Supabase standard (avec clé anonyme)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client Supabase admin (avec service role key pour les permissions complètes)
const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceRoleKey || supabaseAnonKey
);

module.exports = {
  supabase,
  supabaseAdmin
};

