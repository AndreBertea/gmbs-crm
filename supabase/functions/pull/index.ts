import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// === Configuration ===
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const googleCredentials = JSON.parse(process.env.GOOGLE_CREDENTIALS!)

// === IDs et plages ===
const ARTISANS_ID = '1B8iXJKI2oOiTC8XWd3lg66iD7dvCUauFvBlCjpiwCkA'
const ARTISANS_RANGE = 'BASE de DONNÉE SST ARTISANS!A2:Z'

const INTERVENTIONS_ID = '1B8iXJKI2oOiTC8XWd3lg66iD7dvCUauFvBlCjpiwCkA'
const INTERVENTIONS_RANGE = 'SUIVI INTER GMBS 2025!A2:Z'

// === Clients ===
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const auth = new google.auth.GoogleAuth({
  credentials: googleCredentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

const sheets = google.sheets({ version: 'v4', auth })

// === Logging ===
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '')
}

// === Fonctions utilitaires ===
async function getMetierId(metierName: string): Promise<string | null> {
  if (!metierName) return null
  
  const { data, error } = await supabase
    .from('metiers')
    .select('id')
    .ilike('label', `%${metierName.trim()}%`)
    .limit(1)
  
  if (error) {
    log(`❌ Erreur recherche métier ${metierName}:`, error)
    return null
  }
  
  return data?.[0]?.id || null
}

function parseDriveDocument(driveText: string): any {
  if (!driveText) return null
  
  // Format attendu: "NOM ARTISAN= @URL_DRIVE"
  const match = driveText.match(/^(.+?)\s*=\s*@(.+)$/)
  if (match) {
    return {
      nom_artisan: match[1].trim(),
      url_drive: match[2].trim()
    }
  }
  
  // Fallback: juste l'URL
  return {
    nom_artisan: null,
    url_drive: driveText.trim()
  }
}

export default async function handler(req: Request) {
  try {
    log('🚀 Début de la synchronisation PULL')

    // === 1. Synchroniser les Artisans ===
    log('📋 Synchronisation des artisans...')
    const artisansResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: ARTISANS_ID,
      range: ARTISANS_RANGE,
    })

    const artisansRows = artisansResponse.data.values || []
    log(`📊 ${artisansRows.length} lignes d'artisans trouvées`)

    for (const [index, row] of artisansRows.entries()) {
      try {
        // Récupérer l'ID du métier
        const metierId = await getMetierId(row[2] || '') // "MÉTIER"
        
        // Parser le document Drive
        const driveDocument = parseDriveDocument(row[11] || '') // "Document Drive"
        
        // Mapping selon notre schéma (basé sur les en-têtes réelles)
        const artisanData = {
          nom_prenom: row[0] || null,                    // "Nom Prénom"
          raison_sociale: row[1] || null,                // "Raison Social"
          metier_id: metierId,                           // "MÉTIER" → ID depuis table metiers
          departement: row[3] || null,                   // "DPT"
          statut_artisan: row[4] || null,                // "STATUT"
          adresse_siege_social: row[5] || null,          // "Adresse Postale"
          email: row[6] || null,                         // "Adresse Mail"
          telephone: row[7] || null,                     // "Numéro Téléphone"
          statut_juridique: row[8] || null,              // "STATUT JURIDIQUE"
          siret: row[9] || null,                         // "Siret"
          statut_dossier: row[10] || null,               // "DOSSIER ARTISAN"
          document_drive: driveDocument,                 // "Document Drive" → JSON
          commentaire: row[12] || null,                  // "Commentaire"
          gestionnaire_id: null,                         // "Gestionnaire" → À mapper avec users
          date_ajout: row[14] || null,                   // "DATE D'AJOUT"
          suivi_relances_docs: row[15] || null,          // "SUIVI DES RELANCES DOCS"
          nombre_interventions: parseInt(row[16]) || 0,  // "NOMBRE D'INTERVENTION(S)"
          cout_sst: parseFloat(row[17]) || null,         // "COUT SST"
          cout_inter: parseFloat(row[18]) || null,       // "COUT INTER"
          cout_materiel: parseFloat(row[19]) || null,    // "COUT MATÉRIEL"
          gain_brut: parseFloat(row[20]) || null,        // "GAIN BRUT €"
          pourcentage_sst: parseFloat(row[21]) || null,  // "% SST"
          updated_at: new Date().toISOString(),
        }

        // Upsert avec conflit sur email
        const { error } = await supabase
          .from('artisans')
          .upsert(artisanData, { onConflict: 'email' })

        if (error) {
          log(`❌ Erreur artisan ligne ${index + 2}:`, error)
        } else {
          log(`✅ Artisan ${index + 2} synchronisé: ${artisanData.nom_prenom} (Métier ID: ${metierId})`)
        }
      } catch (error) {
        log(`❌ Erreur traitement artisan ligne ${index + 2}:`, error)
      }
    }

    // === 2. Synchroniser les Interventions ===
    log('🔧 Synchronisation des interventions...')
    const interventionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: INTERVENTIONS_ID,
      range: INTERVENTIONS_RANGE,
    })

    const interventionsRows = interventionsResponse.data.values || []
    log(`📊 ${interventionsRows.length} lignes d'interventions trouvées`)

    for (const [index, row] of interventionsRows.entries()) {
      try {
        // Mapping selon notre schéma (basé sur les en-têtes réelles)
        const interventionData = {
          date: row[0] ? new Date(row[0].split('/').reverse().join('-')).toISOString() : null, // "Date"
          agence: row[1] || null,                        // "Agence"
          adresse: row[2] || null,                       // "Adresse d'intervention"
          id_inter: row[3] || null,                      // "ID"
          statut: row[4] || null,                        // "Statut"
          contexte_intervention: row[5] || null,         // "Contexte d'intervention"
          type: row[6] || null,                          // "Métier"
          attribue_a: null,                              // "Gest." → À mapper avec users
          cout_sst: parseFloat(row[9]) || null,          // "COUT SST"
          cout_materiel: parseFloat(row[10]) || null,    // "COÛT MATERIEL"
          cout_intervention: parseFloat(row[12]) || null, // "COUT INTER"
          proprietaire: row[14] || null,                 // "PROPRIO"
          telephone_client: row[16] || null,             // "TEL LOC"
          nom_prenom_client: row[17] || null,            // "Locataire"
          email_client: row[18] || null,                 // "Em@il Locataire"
          commentaire_agent: row[19] || null,            // "COMMENTAIRE"
          demande_intervention: row[21] ? { texte: row[21] } : null, // "Demande d'intervention ✅"
          demande_devis: row[22] ? { texte: row[22] } : null,       // "Demande Devis ✅"
          date_demande_intervention: row[21] ? row[21].split(' ')[0] : null, // Date extraite
          date_demande_devis: row[22] ? row[22].split(' ')[0] : null,        // Date extraite
          updated_at: new Date().toISOString(),
        }

        // Upsert avec conflit sur id_inter
        const { error } = await supabase
          .from('interventions')
          .upsert(interventionData, { onConflict: 'id_inter' })

        if (error) {
          log(`❌ Erreur intervention ligne ${index + 2}:`, error)
        } else {
          log(`✅ Intervention ${index + 2} synchronisée: ${interventionData.id_inter}`)
        }
      } catch (error) {
        log(`❌ Erreur traitement intervention ligne ${index + 2}:`, error)
      }
    }

    log('🎉 Synchronisation PULL terminée avec succès')
    return new Response(JSON.stringify({ 
      success: true, 
      artisans: artisansRows.length,
      interventions: interventionsRows.length 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    log('💥 Erreur fatale dans la synchronisation PULL:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
