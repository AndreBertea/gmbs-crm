#!/usr/bin/env tsx

/**
 * Script pour inspecter une intervention spécifique en BDD
 * 
 * Affiche tous les détails : coûts, artisans, tenant, owner, etc.
 * 
 * Usage:
 *   npx tsx scripts/tests/inspect-intervention.js INT-2025-001
 *   npx tsx scripts/tests/inspect-intervention.js --last  (dernière intervention)
 */

import { supabaseAdmin } from '../../src/lib/supabase-client.js';

const interventionId = process.argv[2];

if (!interventionId) {
  console.error('❌ Usage: npx tsx scripts/tests/inspect-intervention.js <id_inter|--last>');
  process.exit(1);
}

async function main() {
  console.log('\n🔍 INSPECTION INTERVENTION\n');
  
  try {
    let intervention;
    
    if (interventionId === '--last') {
      // Récupérer la dernière intervention
      const { data, error } = await supabaseAdmin
        .from('interventions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      intervention = data;
      console.log(`📌 Dernière intervention: ${intervention.id_inter || intervention.id}\n`);
    } else {
      // Récupérer par ID
      const { data, error } = await supabaseAdmin
        .from('interventions')
        .select('*')
        .eq('id_inter', interventionId)
        .single();
      
      if (error) {
        if (error.message.includes('multiple')) {
          console.error(`❌ Plusieurs interventions trouvées avec cet ID`);
        } else if (error.message.includes('no rows')) {
          console.error(`❌ Aucune intervention trouvée avec l'ID: ${interventionId}`);
        } else {
          throw error;
        }
        process.exit(1);
      }
      intervention = data;
    }
    
    console.log('='.repeat(80));
    console.log('📋 INFORMATIONS PRINCIPALES');
    console.log('='.repeat(80));
    console.log(`ID Interne: ${intervention.id}`);
    console.log(`ID Inter: ${intervention.id_inter || 'NULL'}`);
    console.log(`Date: ${intervention.date || 'NULL'}`);
    console.log(`Date prévue: ${intervention.date_prevue || 'NULL'}`);
    console.log(`Date terminée: ${intervention.date_termine || 'NULL'}`);
    console.log(`\nStatut ID: ${intervention.statut_id || 'NULL'}`);
    console.log(`Métier ID: ${intervention.metier_id || 'NULL'}`);
    console.log(`Agence ID: ${intervention.agence_id || 'NULL'}`);
    console.log(`Gestionnaire ID: ${intervention.assigned_user_id || 'NULL'}`);
    console.log(`\nAdresse: ${intervention.adresse || 'NULL'}`);
    console.log(`Ville: ${intervention.ville || 'NULL'}`);
    console.log(`Code postal: ${intervention.code_postal || 'NULL'}`);
    
    // Récupérer les coûts
    console.log('\n' + '='.repeat(80));
    console.log('💰 COÛTS ASSOCIÉS');
    console.log('='.repeat(80));
    
    const { data: costs, error: costsError } = await supabaseAdmin
      .from('intervention_costs')
      .select('*')
      .eq('intervention_id', intervention.id);
    
    if (costsError) {
      console.error(`❌ Erreur récupération coûts: ${costsError.message}`);
    } else if (!costs || costs.length === 0) {
      console.log('❌ Aucun coût trouvé');
    } else {
      console.log(`✅ ${costs.length} coût(s) trouvé(s):\n`);
      costs.forEach((cost, index) => {
        console.log(`  ${index + 1}. ${cost.cost_type.toUpperCase()} - ${cost.label}`);
        console.log(`     Montant: ${cost.amount} ${cost.currency}`);
        if (cost.metadata) {
          console.log(`     Metadata: ${cost.metadata}`);
        }
        console.log(`     Créé le: ${cost.created_at}`);
        console.log('');
      });
    }
    
    // Récupérer les artisans
    console.log('='.repeat(80));
    console.log('👷 ARTISANS ASSIGNÉS');
    console.log('='.repeat(80));
    
    const { data: artisanLinks, error: artisansError } = await supabaseAdmin
      .from('intervention_artisans')
      .select(`
        *,
        artisan:artisans(id, prenom, nom, email, telephone)
      `)
      .eq('intervention_id', intervention.id);
    
    if (artisansError) {
      console.error(`❌ Erreur récupération artisans: ${artisansError.message}`);
    } else if (!artisanLinks || artisanLinks.length === 0) {
      console.log('❌ Aucun artisan assigné');
    } else {
      console.log(`✅ ${artisanLinks.length} artisan(s) assigné(s):\n`);
      artisanLinks.forEach((link, index) => {
        const artisan = link.artisan;
        console.log(`  ${index + 1}. ${artisan.prenom} ${artisan.nom} ${link.is_primary ? '(PRIMAIRE)' : '(SECONDAIRE)'}`);
        console.log(`     Email: ${artisan.email || 'N/A'}`);
        console.log(`     Téléphone: ${artisan.telephone || 'N/A'}`);
        console.log(`     Role: ${link.role || 'N/A'}`);
        console.log(`     Assigné le: ${link.assigned_at}`);
        console.log('');
      });
    }
    
    // Récupérer tenant et owner
    console.log('='.repeat(80));
    console.log('👤 TENANT & OWNER');
    console.log('='.repeat(80));
    
    if (intervention.tenant_id) {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('id', intervention.tenant_id)
        .single();
      
      if (tenant) {
        console.log(`\n✅ Tenant (Locataire):`);
        console.log(`   Nom: ${tenant.firstname} ${tenant.lastname}`);
        console.log(`   Email: ${tenant.email || 'N/A'}`);
        console.log(`   Téléphone: ${tenant.telephone || 'N/A'}`);
      }
    } else {
      console.log('\n❌ Pas de tenant (locataire)');
    }
    
    if (intervention.owner_id) {
      const { data: owner } = await supabaseAdmin
        .from('owner')
        .select('*')
        .eq('id', intervention.owner_id)
        .single();
      
      if (owner) {
        console.log(`\n✅ Owner (Propriétaire):`);
        console.log(`   Nom: ${owner.owner_firstname} ${owner.owner_lastname}`);
        console.log(`   Téléphone: ${owner.telephone || 'N/A'}`);
      }
    } else {
      console.log('\n❌ Pas de owner (propriétaire)');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Inspection terminée\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

