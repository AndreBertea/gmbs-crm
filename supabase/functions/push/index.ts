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
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

// === Logging ===
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '')
}

export default async function handler(req: Request) {
  try {
    log('🚀 Début de la synchronisation PUSH')

    // === 1. Pousser les Artisans ===
    log('📋 Récupération des artisans depuis Supabase...')
    const { data: artisans, error: artisansError } = await supabase
      .from('artisans')
      .select('*')
      .order('created_at', { ascending: true })

    if (artisansError) {
      log('❌ Erreur récupération artisans:', artisansError)
      throw artisansError
    }

    log(`📊 ${artisans?.length || 0} artisans récupérés`)

    if (artisans && artisans.length > 0) {
      // Préparer les données pour Google Sheets
      const artisansValues = artisans.map(artisan => [
        artisan.nom_prenom || '',                    // A: "Nom Prénom"
        artisan.raison_sociale || '',                // B: "Raison Social"
        '',                                          // C: "MÉTIER" (sera rempli par le label)
        artisan.departement || '',                   // D: "DPT"
        artisan.statut_artisan || '',                // E: "STATUT"
        artisan.adresse_siege_social || '',          // F: "Adresse Postale"
        artisan.email || '',                         // G: "Adresse Mail"
        artisan.telephone || '',                     // H: "Numéro Téléphone"
        artisan.statut_juridique || '',              // I: "STATUT JURIDIQUE"
        artisan.siret || '',                         // J: "Siret"
        artisan.statut_dossier || '',                // K: "DOSSIER ARTISAN"
        artisan.document_drive ? `${artisan.document_drive.nom_artisan || ''}= @${artisan.document_drive.url_drive || ''}` : '', // L: "Document Drive"
        artisan.commentaire || '',                   // M: "Commentaire"
        '',                                          // N: "Gestionnaire" (sera rempli par le nom)
        artisan.date_ajout || '',                    // O: "DATE D'AJOUT"
        artisan.suivi_relances_docs || '',           // P: "SUIVI DES RELANCES DOCS"
        artisan.nombre_interventions || 0,           // Q: "NOMBRE D'INTERVENTION(S)"
        artisan.cout_sst || '',                      // R: "COUT SST"
        artisan.cout_inter || '',                    // S: "COUT INTER"
        artisan.cout_materiel || '',                 // T: "COUT MATÉRIEL"
        artisan.gain_brut || '',                     // U: "GAIN BRUT €"
        artisan.pourcentage_sst || '',               // V: "% SST"
      ])

      // Mettre à jour Google Sheets
      await sheets.spreadsheets.values.update({
        spreadsheetId: ARTISANS_ID,
        range: ARTISANS_RANGE,
        valueInputOption: 'RAW',
        requestBody: { values: artisansValues },
      })

      log(`✅ ${artisansValues.length} artisans poussés vers Google Sheets`)
    }

    // === 2. Pousser les Interventions ===
    log('🔧 Récupération des interventions depuis Supabase...')
    const { data: interventions, error: interventionsError } = await supabase
      .from('interventions')
      .select('*')
      .order('created_at', { ascending: true })

    if (interventionsError) {
      log('❌ Erreur récupération interventions:', interventionsError)
      throw interventionsError
    }

    log(`📊 ${interventions?.length || 0} interventions récupérées`)

    if (interventions && interventions.length > 0) {
      // Préparer les données pour Google Sheets
      const interventionsValues = interventions.map(intervention => [
        intervention.date ? new Date(intervention.date).toLocaleDateString('fr-FR') : '', // A: "Date"
        intervention.agence || '',                   // B: "Agence"
        intervention.adresse || '',                  // C: "Adresse d'intervention"
        intervention.id_inter || '',                 // D: "ID"
        intervention.statut || '',                   // E: "Statut"
        intervention.contexte_intervention || '',    // F: "Contexte d'intervention"
        intervention.type || '',                     // G: "Métier"
        '',                                          // H: "Gest." (gestionnaire)
        '',                                          // I: "SST" (artisan)
        intervention.cout_sst || '',                 // J: "COUT SST"
        intervention.cout_materiel || '',            // K: "COÛT MATERIEL"
        '',                                          // L: "Numéro SST"
        intervention.cout_intervention || '',        // M: "COUT INTER"
        '',                                          // N: "% SST"
        intervention.proprietaire || '',             // O: "PROPRIO"
        '',                                          // P: "Date d'intervention" (vide pour l'instant)
        intervention.telephone_client || '',         // Q: "TEL LOC"
        intervention.nom_prenom_client || '',        // R: "Locataire"
        intervention.email_client || '',             // S: "Em@il Locataire"
        intervention.commentaire_agent || '',        // T: "COMMENTAIRE"
        '',                                          // U: "Truspilot"
        intervention.demande_intervention?.texte || '', // V: "Demande d'intervention ✅"
        intervention.demande_devis?.texte || '',     // W: "Demande Devis ✅"
        '',                                          // X: "Demande TrustPilot ✅"
      ])

      // Mettre à jour Google Sheets
      await sheets.spreadsheets.values.update({
        spreadsheetId: INTERVENTIONS_ID,
        range: INTERVENTIONS_RANGE,
        valueInputOption: 'RAW',
        requestBody: { values: interventionsValues },
      })

      log(`✅ ${interventionsValues.length} interventions poussées vers Google Sheets`)
    }

    log('🎉 Synchronisation PUSH terminée avec succès')
    return new Response(JSON.stringify({ 
      success: true, 
      artisans: artisans?.length || 0,
      interventions: interventions?.length || 0 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    log('💥 Erreur fatale dans la synchronisation PUSH:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
