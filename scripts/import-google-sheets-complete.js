#!/usr/bin/env node

/**
 * Script unifié d'import Google Sheets -> Supabase pour le CRM GMBS.
 *
 * Étapes principales :
 *  - Récupération des données Google Sheets (artisans + interventions)
 *  - Synchronisation des utilisateurs, artisans, interventions et liaisons
 *  - Gestion des doublons, mises à jour et rollback manuel en cas d'erreur
 *  - Support d'un mode dry-run pour tester sans écrire en base
 *  - Rapport détaillé en sortie avec métriques d'import
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

const dotenv = require('dotenv');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const ARTISAN_COLUMNS = [
  'nom_prenom',
  'numero_associe',
  'raison_sociale',
  'siret',
  'statut_juridique',
  'statut_artisan',
  'statut_dossier',
  'adresse_siege_social',
  'ville_siege_social',
  'code_postal_siege_social',
  'email',
  'telephone',
  'date_ajout',
  'gestionnaire_code',
  'metiers'
];

const INTERVENTION_COLUMNS = [
  'date',
  'agence',
  'adresse',
  'id_inter',
  'statut',
  'contexte_intervention',
  'metier',
  'gestionnaire_code',
  'artisan_reference',
  'cout_sst',
  'cout_materiel',
  'numero_sst',
  'cout_intervention',
  'pourcentage_sst',
  'proprietaire',
  'date_intervention',
  'telephone_client',
  'nom_prenom_client',
  'email_client',
  'commentaire',
  'trustpilot',
  'demande_intervention',
  'demande_devis',
  'demande_trustpilot'
];

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_INTERVENTION_ROLE = 'principal';

main().catch((error) => {
  console.error(`\n❌ Import interrompu: ${error.message}`);
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const logger = createLogger(options.verbose);

  loadEnvironment(logger);

  const requiredEnv = [
    'GOOGLE_SHEETS_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  ensureEnv(requiredEnv);

  const sheetsId = process.env.GOOGLE_SHEETS_ID;
  const artisansRange = process.env.GOOGLE_SHEETS_ARTISANS_RANGE || 'Artisans!A2:Z';
  const interventionsRange = process.env.GOOGLE_SHEETS_INTERVENTIONS_RANGE || 'Interventions!A2:Z';

  const privateKey = sanitizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
    logger.warn("La clé privée Google ne semble pas dans un format PEM valide. Vérifiez GOOGLE_PRIVATE_KEY.");
  }

  const googleAuth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth: googleAuth });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  logger.info('=== IMPORT GOOGLE SHEETS COMPLET ===');
  logger.info(`Spreadsheet: ${sheetsId}`);
  logger.info(options.dryRun ? 'Mode DRY-RUN activé (aucune écriture en base).' : 'Mode écriture actif.');

  const report = createEmptyReport();
  report.startedAt = new Date();

  const artisansRows = await fetchSheetRows(sheets, sheetsId, artisansRange, ARTISAN_COLUMNS, logger, 'Artisans');
  const interventionsRows = await fetchSheetRows(
    sheets,
    sheetsId,
    interventionsRange,
    INTERVENTION_COLUMNS,
    logger,
    'Interventions'
  );

  report.artisans.fetched = artisansRows.length;
  report.interventions.fetched = interventionsRows.length;

  const {
    usersIndex,
    metiersIndex,
    artisanIndex,
    artisanMetiersSet,
    interventionIndex,
    interventionArtisansSet
  } = await bootstrapSupabaseState({ supabase, logger });

  await ensureMetiersExist({
    logger,
    supabase,
    metiersIndex,
    rows: artisansRows,
    dryRun: options.dryRun,
    report
  });

  await importArtisans({
    rows: artisansRows,
    supabase,
    logger,
    options,
    usersIndex,
    metiersIndex,
    artisanIndex,
    artisanMetiersSet,
    report
  });

  await importInterventions({
    rows: interventionsRows,
    supabase,
    logger,
    options,
    usersIndex,
    artisanIndex,
    interventionIndex,
    interventionArtisansSet,
    report
  });

  report.finishedAt = new Date();
  emitReport(report, logger);
}
function parseArgs(args) {
  const options = {
    dryRun: false,
    batchSize: DEFAULT_BATCH_SIZE,
    verbose: false
  };

  for (const arg of args) {
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg.startsWith('--batch-size=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        options.batchSize = value;
      }
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

function createLogger(verbose = false) {
  const format = (level, message) => {
    const date = new Date().toISOString();
    return `[${date}] [${level}] ${message}`;
  };

  return {
    info: (message) => console.log(format('INFO', message)),
    warn: (message) => console.warn(format('WARN', message)),
    error: (message) => console.error(format('ERRO', message)),
    success: (message) => console.log(format('OK  ', message)),
    verbose: (message) => {
      if (verbose) {
        console.log(format('VERB', message));
      }
    }
  };
}

function loadEnvironment(logger) {
  const envPath = path.resolve(process.cwd(), '.env');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    logger.verbose(`Variables d'environnement chargées depuis ${envPath}`);
  }
  
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    logger.verbose(`Variables d'environnement chargées depuis ${envLocalPath}`);
  }
}

function ensureEnv(keys) {
  const missing = keys.filter((key) => !process.env[key] || process.env[key].trim().length === 0);
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
  }
}

function sanitizePrivateKey(value) {
  if (!value) return value;

  // Support format avec séquences "\n" ou retour chariot direct.
  let normalized = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');

  if (normalized.includes('BEGIN PRIVATE KEY')) {
    return normalized;
  }

  // Certaines configurations fournissent la clé en base64.
  try {
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    if (decoded.includes('BEGIN PRIVATE KEY')) {
      return decoded;
    }
  } catch (error) {
    // Ignore, on retombe sur la valeur initiale.
  }

  return normalized;
}

function createEmptyReport() {
  return {
    startedAt: null,
    finishedAt: null,
    artisans: { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
    interventions: { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
    relations: { artisanMetiers: 0, interventionArtisans: 0 },
    warnings: []
  };
}

function emitReport(report, logger) {
  const durationMs = report.finishedAt && report.startedAt ? report.finishedAt - report.startedAt : 0;
  const duration = durationMs ? `${(durationMs / 1000).toFixed(1)}s` : 'n/a';

  logger.info('\n=== RÉSUMÉ DE L\'IMPORT ===');
  logger.info(`⏱️  Durée: ${duration}`);
  logger.info(
    `👷 Artisans - importés: ${report.artisans.inserted}, mis à jour: ${report.artisans.updated}, ignorés: ${report.artisans.skipped}, erreurs: ${report.artisans.errors}`
  );
  logger.info(
    `🛠️  Interventions - importées: ${report.interventions.inserted}, mises à jour: ${report.interventions.updated}, ignorées: ${report.interventions.skipped}, erreurs: ${report.interventions.errors}`
  );
  logger.info(
    `📊 Relations créées - artisan_métiers: ${report.relations.artisanMetiers}, intervention_artisans: ${report.relations.interventionArtisans}`
  );

  if (report.warnings.length > 0) {
    logger.warn(`\n⚠️  ${report.warnings.length} avertissement(s) pendant l'import:`);
    for (const warning of report.warnings) {
      logger.warn(`  - ${warning}`);
    }
  }

  logger.success('\n✅ Import terminé');
}
function chunkArray(array, size) {
  if (size <= 0) return [array];
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function metierLabelKey(value) {
  return normalizeString(value).toLowerCase();
}

function parseMetiersCell(value) {
  return normalizeString(value)
    .split(/[,;\n]/)
    .map((item) => normalizeString(item))
    .filter((item) => item.length > 0);
}

function slugify(value) {
  return normalizeString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'metier';
}

function toIsoDate(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.match(/\d+/g);
  if (!digits || digits.length < 3) {
    return null;
  }

  let year; let month; let day;

  if (digits[0].length === 4) {
    [year, month, day] = digits;
  } else if (digits[2]?.length === 4) {
    [day, month, year] = digits;
  } else {
    return null;
  }

  year = year.padStart(4, '0');
  month = month.padStart(2, '0');
  day = day.padStart(2, '0');

  const candidate = `${year}-${month}-${day}`;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const parsedYear = parsed.getFullYear();
  if (parsedYear < 1900 || parsedYear > 2100) {
    return null;
  }

  return candidate;
}

function isValidIntervention(row) {
  const idInter = normalizeString(row.id_inter);
  if (!idInter) return false;

  const date = toIsoDate(row.date);
  if (!date) return false;

  return true;
}

function safeNumber(value) {
  const normalized = normalizeString(value).replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const numeric = Number.parseFloat(normalized);
  return Number.isNaN(numeric) ? null : numeric;
}

function buildUsersIndex(users) {
  const byCode = new Map();
  for (const user of users) {
    if (user.code_gestionnaire) {
      byCode.set(user.code_gestionnaire.trim().toLowerCase(), user);
    }
  }
  return { byCode };
}

function buildMetierIndex(metiers) {
  const byId = new Map();
  const byCode = new Map();
  const byLabel = new Map();

  for (const metier of metiers) {
    if (metier.id != null) byId.set(metier.id, metier);
    if (metier.code) byCode.set(metier.code.toLowerCase(), metier);
    if (metier.label) byLabel.set(metierLabelKey(metier.label), metier);
  }

  return { byId, byCode, byLabel };
}

function buildArtisanIndex(artisans) {
  const byId = new Map();
  const byEmail = new Map();
  const byNumero = new Map();

  for (const artisan of artisans) {
    if (artisan.id != null) {
      byId.set(artisan.id, artisan);
    }
    if (artisan.email) {
      byEmail.set(artisan.email.toLowerCase(), artisan);
    }
    if (artisan.numero_associe) {
      byNumero.set(artisan.numero_associe.toString(), artisan);
    }
  }

  return { byId, byEmail, byNumero };
}

function buildInterventionIndex(interventions) {
  const byId = new Map();
  const byInterCode = new Map();

  for (const intervention of interventions) {
    if (intervention.id != null) {
      byId.set(intervention.id, intervention);
    }
    if (intervention.id_inter) {
      byInterCode.set(intervention.id_inter.toString(), intervention);
    }
  }

  return { byId, byInterCode };
}

function createRelationSet(rows, leftKey, rightKey, extraKeyFn) {
  const set = new Set();
  for (const row of rows) {
    const left = row[leftKey];
    const right = row[rightKey];
    if (left == null || right == null) continue;
    const extra = extraKeyFn ? extraKeyFn(row) : '';
    set.add(`${left}:${right}:${extra}`);
  }
  return set;
}

async function fetchSheetRows(sheets, spreadsheetId, range, columns, logger, label) {
  logger.info(`Lecture de la feuille "${label}" (plage ${range})...`);
  try {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    const values = data.values || [];
    if (!values.length) {
      logger.warn(`Aucune donnée trouvée pour ${label}.`);
      return [];
    }
    return values.map((row) => mapSheetRow(columns, row));
  } catch (error) {
    throw new Error(`Impossible de récupérer la feuille ${label}: ${error.message}`);
  }
}

function mapSheetRow(columns, row) {
  const record = {};
  columns.forEach((column, index) => {
    record[column] = index < row.length ? normalizeString(String(row[index])) : '';
  });
  return record;
}

async function fetchAllRows(client, table, columns, logger, batchSize = 1000) {
  const results = [];
  let from = 0;
  let to = batchSize - 1;

  while (true) {
    const query = client
      .from(table)
      .select(columns, { count: 'exact', head: false })
      .range(from, to);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Erreur Supabase lors de la lecture de ${table}: ${error.message}`);
    }

    if (data && data.length > 0) {
      results.push(...data);
    }

    if (!data || data.length < batchSize) {
      break;
    }

    from += batchSize;
    to += batchSize;
  }

  logger.verbose(`Cache initial chargé (${table}): ${results.length} enregistrements`);
  return results;
}
async function bootstrapSupabaseState({ supabase, logger }) {
  const [users, metiers, artisans, artisanMetiers, interventions, interventionArtisans] = await Promise.all([
    fetchAllRows(supabase, 'users', 'id, username, email, code_gestionnaire, color', logger),
    fetchAllRows(supabase, 'metiers', 'id, code, label', logger),
    fetchAllRows(
      supabase,
      'artisans',
      'id, nom_prenom, email, numero_associe, siret, telephone, gestionnaire_id',
      logger
    ),
    fetchAllRows(supabase, 'artisan_metiers', 'artisan_id, metier_id', logger),
    fetchAllRows(
      supabase,
      'interventions',
      'id, id_inter, date, agence, adresse, ville, statut, attribue_a, artisan_id',
      logger
    ),
    fetchAllRows(supabase, 'intervention_artisans', 'intervention_id, artisan_id, role', logger)
  ]);

  return {
    usersIndex: buildUsersIndex(users),
    metiersIndex: buildMetierIndex(metiers),
    artisanIndex: buildArtisanIndex(artisans),
    artisanMetiersSet: createRelationSet(artisanMetiers, 'artisan_id', 'metier_id'),
    interventionIndex: buildInterventionIndex(interventions),
    interventionArtisansSet: createRelationSet(
      interventionArtisans,
      'intervention_id',
      'artisan_id',
      (row) => row.role || ''
    )
  };
}
async function ensureMetiersExist({ rows, metiersIndex, supabase, dryRun, logger, report }) {
  const uniqueLabels = new Map();

  for (const row of rows) {
    const metiersLabels = parseMetiersCell(row.metiers);
    for (const label of metiersLabels) {
      const key = metierLabelKey(label);
      if (!key) continue;
      if (!uniqueLabels.has(key)) {
        uniqueLabels.set(key, label);
      }
    }
  }

  const missing = [];
  for (const [key, label] of uniqueLabels.entries()) {
    if (!metiersIndex.byLabel.has(key)) {
      const code = generateUniqueMetierCode(metiersIndex, label);
      missing.push({ code, label });
    }
  }

  if (missing.length === 0) {
    logger.info('Aucun nouveau métier à créer.');
    return;
  }

  logger.info(`Création de ${missing.length} métier(s) absent(s).`);

  if (dryRun) {
    logger.info('[DRY-RUN] Insertion des métiers simulée.');
    missing.forEach((metier, index) => {
      const synthetic = { id: `dryrun-metier-${index}`, ...metier };
      registerMetierInIndex(metiersIndex, synthetic);
    });
    return;
  }

  const { data, error } = await supabase
    .from('metiers')
    .insert(missing)
    .select();

  if (error) {
    report.warnings.push(`Échec lors de la création des métiers: ${error.message}`);
    throw new Error(`Impossible de créer les métiers manquants: ${error.message}`);
  }

  (data || []).forEach((metier) => registerMetierInIndex(metiersIndex, metier));
}

function generateUniqueMetierCode(metiersIndex, label) {
  const base = slugify(label).replace(/-/g, '_').toUpperCase() || 'METIER';
  let candidate = base;
  let counter = 1;
  while (metiersIndex.byCode.has(candidate.toLowerCase())) {
    candidate = `${base}_${counter++}`;
  }
  return candidate;
}

function registerMetierInIndex(index, metier) {
  if (metier.id != null) index.byId.set(metier.id, metier);
  if (metier.code) index.byCode.set(metier.code.toLowerCase(), metier);
  if (metier.label) index.byLabel.set(metierLabelKey(metier.label), metier);
}
async function applyOperationsWithRollback({ label, operations, supabase, dryRun, logger }) {
  if (!operations || operations.length === 0) {
    return;
  }

  logger.info(`${label}: exécution de ${operations.length} opération(s).`);

  if (dryRun) {
    for (const operation of operations) {
      const simulatedRows = operation.simulatedRows
        ? operation.simulatedRows
        : Array.isArray(operation.payload)
          ? operation.payload.map((payload, index) => ({ ...payload, id: `dryrun-${operation.table}-${index}` }))
          : [{ id: `dryrun-${operation.table}-0`, ...(operation.payload || {}) }];

      if (operation.onSuccess) {
        await operation.onSuccess(simulatedRows, true);
      }
    }
    return;
  }

  const history = [];

  try {
    for (const operation of operations) {
      if (operation.type === 'insert') {
        const { data, error } = await supabase.from(operation.table).insert(operation.payload).select();
        if (error) {
          throw augmentSupabaseError(error, operation);
        }
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        history.push({ type: 'insert', table: operation.table, ids: rows.map((row) => row.id) });
        if (operation.onSuccess) {
          await operation.onSuccess(rows, false);
        }
      } else if (operation.type === 'update') {
        const { data, error } = await supabase
          .from(operation.table)
          .update(operation.payload)
          .eq('id', operation.id)
          .select();
        if (error) {
          throw augmentSupabaseError(error, operation);
        }
        history.push({
          type: 'update',
          table: operation.table,
          id: operation.id,
          before: operation.before,
          fields: Object.keys(operation.payload || {})
        });
        if (operation.onSuccess) {
          await operation.onSuccess(Array.isArray(data) ? data : data ? [data] : [], false);
        }
      } else if (operation.type === 'upsert') {
        const { data, error } = await supabase.from(operation.table).upsert(operation.payload).select();
        if (error) {
          throw augmentSupabaseError(error, operation);
        }
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        history.push({ type: 'upsert', table: operation.table, ids: rows.map((row) => row.id) });
        if (operation.onSuccess) {
          await operation.onSuccess(rows, false);
        }
      } else if (operation.type === 'delete') {
        const { error } = await supabase
          .from(operation.table)
          .delete()
          .eq('id', operation.id);
        if (error) {
          throw augmentSupabaseError(error, operation);
        }
        history.push({ type: 'delete', table: operation.table, payload: operation.payloadBackup });
        if (operation.onSuccess) {
          await operation.onSuccess([], false);
        }
      } else {
        throw new Error(`Type d'opération inconnu: ${operation.type}`);
      }
    }
  } catch (error) {
    logger.error(`${label}: erreur détectée, rollback en cours... (${error.message})`);
    await rollbackHistory(history, supabase, logger);
    throw error;
  }
}

function augmentSupabaseError(error, operation) {
  if (!error) return new Error('Erreur Supabase inconnue.');
  if (error.message) {
    return new Error(`${error.message} (table: ${operation.table})`);
  }
  return new Error(`Erreur Supabase (table ${operation.table})`);
}

async function rollbackHistory(history, supabase, logger) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    try {
      if (entry.type === 'insert') {
        if (!entry.ids || entry.ids.length === 0) continue;
        await supabase.from(entry.table).delete().in('id', entry.ids);
      } else if (entry.type === 'update') {
        if (!entry.before) continue;
        const payload = {};
        for (const field of entry.fields || []) {
          payload[field] = entry.before[field] ?? null;
        }
        await supabase
          .from(entry.table)
          .update(payload)
          .eq('id', entry.id);
      } else if (entry.type === 'delete') {
        if (!entry.payload) continue;
        await supabase.from(entry.table).insert(entry.payload);
      }
    } catch (rollbackError) {
      logger.error(`Rollback partiel impossible sur ${entry.table}: ${rollbackError.message}`);
    }
  }
}
async function importArtisans({
  rows,
  supabase,
  logger,
  options,
  usersIndex,
  metiersIndex,
  artisanIndex,
  artisanMetiersSet,
  report
}) {
  if (!rows.length) {
    logger.info('Aucun artisan à traiter.');
    return;
  }

  const updates = [];
  const inserts = [];
  const desiredMetierLinks = [];
  let skipped = 0;
  let errored = 0;

  rows.forEach((row, rowIndex) => {
    const prepared = prepareArtisanRow(row, { usersIndex, metiersIndex, report, rowIndex });
    if (!prepared) {
      skipped += 1;
      return;
    }

    const { payload, metierIds, identifiers } = prepared;
    const existing = findExistingArtisan(identifiers, artisanIndex);

    if (existing) {
      const diff = computeArtisanDiff(existing, payload);
      if (Object.keys(diff).length === 0) {
        skipped += 1;
      } else {
        updates.push({ existing, diff });
      }
      if (existing.id && metierIds.length > 0) {
        desiredMetierLinks.push({ artisanId: existing.id, metierIds });
      }
    } else {
      inserts.push({ payload, metierIds, identifiers });
    }
  });

  const operations = [];

  for (const update of updates) {
    operations.push({
      type: 'update',
      table: 'artisans',
      id: update.existing.id,
      payload: update.diff,
      before: pickFields(update.existing, Object.keys(update.diff)),
      simulatedRows: [mergeArtisanRecords(update.existing, update.diff)],
      onSuccess: async (rows) => {
        const updated = rows[0] ? mergeArtisanRecords(update.existing, rows[0]) : mergeArtisanRecords(update.existing, update.diff);
        registerArtisan(artisanIndex, updated);
        report.artisans.updated += 1;
      }
    });
  }

  const insertChunks = chunkArray(inserts, options.batchSize);
  insertChunks.forEach((chunk, chunkIndex) => {
    const payload = chunk.map((item) => item.payload);
    const simulatedRows = chunk.map((item, index) => ({
      id: `dryrun-artisan-${chunkIndex}-${index}`,
      ...item.payload
    }));
    operations.push({
      type: 'insert',
      table: 'artisans',
      payload,
      simulatedRows,
      onSuccess: async (rows, isDryRun) => {
        const producedRows = rows.length ? rows : simulatedRows;
        producedRows.forEach((rowResult, index) => {
          const meta = chunk[index];
          const merged = rowResult.id != null ? mergeArtisanRecords(meta.payload, rowResult) : { ...meta.payload };
          if (rowResult.id != null) merged.id = rowResult.id;
          registerArtisan(artisanIndex, merged);
          if (merged.id != null && meta.metierIds.length > 0) {
            desiredMetierLinks.push({ artisanId: merged.id, metierIds: meta.metierIds });
          }
          report.artisans.inserted += 1;
        });
      }
    });
  });

  try {
    await applyOperationsWithRollback({
      label: 'Synchronisation des artisans',
      operations,
      supabase,
      dryRun: options.dryRun,
      logger
    });
  } catch (error) {
    errored += 1;
    report.artisans.errors += 1;
    logger.error(`Import artisans interrompu: ${error.message}`);
    throw error;
  }

  if (desiredMetierLinks.length > 0) {
    await syncArtisanMetiers({
      links: desiredMetierLinks,
      artisanMetiersSet,
      supabase,
      dryRun: options.dryRun,
      batchSize: options.batchSize,
      logger,
      report
    });
  }

  report.artisans.skipped += skipped;
  report.artisans.errors += errored;
}

function prepareArtisanRow(row, { usersIndex, metiersIndex, report, rowIndex }) {
  const email = normalizeString(row.email).toLowerCase();
  const numero = normalizeString(row.numero_associe);
  const gestionnaireCode = normalizeString(row.gestionnaire_code).toLowerCase();

  if (!email && !numero) {
    report.warnings.push(`Artisan ligne ${rowIndex + 2}: email et numéro associé manquants, ligne ignorée.`);
    return null;
  }

  let gestionnaireId = null;
  if (gestionnaireCode) {
    const user = usersIndex.byCode.get(gestionnaireCode);
    if (user) {
      gestionnaireId = user.id;
    } else {
      report.warnings.push(
        `Artisan ${row.nom_prenom || email || numero}: gestionnaire introuvable pour le code "${row.gestionnaire_code}".`
      );
    }
  }

  const payload = {
    nom_prenom: row.nom_prenom || null,
    numero_associe: numero || null,
    siret: row.siret || null,
    email: email || null,
    telephone: row.telephone || null,
    gestionnaire_id: gestionnaireId
  };

  const metierIds = [];
  const metiersLabels = parseMetiersCell(row.metiers);
  metiersLabels.forEach((label) => {
    const meta = metiersIndex.byLabel.get(metierLabelKey(label));
    if (meta && meta.id != null) {
      metierIds.push(meta.id);
    } else {
      report.warnings.push(
        `Artisan ${row.nom_prenom || email || numero}: métier "${label}" introuvable après synchronisation.`
      );
    }
  });

  const identifiers = {
    email: email || null,
    numero: numero || null
  };

  return { payload, metierIds, identifiers };
}

function findExistingArtisan(identifiers, artisanIndex) {
  if (identifiers.email) {
    const match = artisanIndex.byEmail.get(identifiers.email);
    if (match) return match;
  }
  if (identifiers.numero) {
    const match = artisanIndex.byNumero.get(identifiers.numero);
    if (match) return match;
  }
  return null;
}

function computeArtisanDiff(existing, next) {
  const diff = {};
  for (const key of Object.keys(next)) {
    if (next[key] === undefined) continue;
    const existingValue = existing[key] ?? null;
    const nextValue = next[key] ?? null;
    if (existingValue !== nextValue) {
      diff[key] = nextValue;
    }
  }
  return diff;
}

function mergeArtisanRecords(base, patch) {
  return { ...base, ...patch };
}

function registerArtisan(index, artisan) {
  if (artisan.id == null) return;
  index.byId.set(artisan.id, artisan);
  if (artisan.email) index.byEmail.set(artisan.email.toLowerCase(), artisan);
  if (artisan.numero_associe) index.byNumero.set(artisan.numero_associe.toString(), artisan);
}

function pickFields(record, fields) {
  const subset = {};
  fields.forEach((field) => {
    subset[field] = record[field];
  });
  return subset;
}
async function syncArtisanMetiers({
  links,
  artisanMetiersSet,
  supabase,
  dryRun,
  batchSize,
  logger,
  report
}) {
  const payloads = [];
  const seen = new Set();

  links.forEach(({ artisanId, metierIds }) => {
    if (artisanId == null) return;
    metierIds.forEach((metierId) => {
      if (metierId == null) return;
      const key = `${artisanId}:${metierId}:`;
      if (artisanMetiersSet.has(key) || seen.has(key)) return;
      seen.add(key);
      payloads.push({ artisan_id: artisanId, metier_id: metierId });
    });
  });

  if (!payloads.length) {
    logger.info('Aucun lien artisan ↔ métier supplémentaire à créer.');
    return;
  }

  const operations = chunkArray(payloads, batchSize).map((chunk, index) => ({
    type: 'upsert',
    table: 'artisan_metiers',
    payload: chunk,
    simulatedRows: chunk.map((item, rowIndex) => ({
      id: `dryrun-artisan-metier-${index}-${rowIndex}`,
      ...item
    })),
    onSuccess: async (rows) => {
      chunk.forEach((item) => {
        const key = `${item.artisan_id}:${item.metier_id}:`;
        artisanMetiersSet.add(key);
        report.relations.artisanMetiers += 1;
      });
    }
  }));

  await applyOperationsWithRollback({
    label: 'Liaisons artisan ↔ métier',
    operations,
    supabase,
    dryRun,
    logger
  });
}
async function importInterventions({
  rows,
  supabase,
  logger,
  options,
  usersIndex,
  artisanIndex,
  interventionIndex,
  interventionArtisansSet,
  report
}) {
  if (!rows.length) {
    logger.info('Aucune intervention à traiter.');
    return;
  }

  const updates = [];
  const inserts = [];
  const desiredLinks = [];
  let skipped = 0;
  let errors = 0;

  rows.forEach((row, rowIndex) => {
    // Filtrer les interventions invalides (sans date ou id_inter)
    if (!isValidIntervention(row)) {
      report.warnings.push(`Intervention ligne ${rowIndex + 2}: id_inter ou date manquant, ligne ignorée.`);
      skipped += 1;
      return;
    }
    
    const prepared = prepareInterventionRow(row, {
      usersIndex,
      artisanIndex,
      report,
      rowIndex
    });

    if (!prepared) {
      skipped += 1;
      return;
    }

    const { payload, artisanIdForLink } = prepared;
    const existing = findExistingIntervention(payload.id_inter, interventionIndex);

    if (existing) {
      const diff = computeInterventionDiff(existing, payload);
      if (Object.keys(diff).length === 0) {
        skipped += 1;
      } else {
        updates.push({ existing, diff });
      }
      const interventionId = existing.id;
      if (interventionId != null && artisanIdForLink != null) {
        desiredLinks.push({ interventionId, artisanId: artisanIdForLink, role: DEFAULT_INTERVENTION_ROLE });
      }
    } else {
      inserts.push({ payload, artisanIdForLink });
    }
  });

  const operations = [];

  for (const update of updates) {
    operations.push({
      type: 'update',
      table: 'interventions',
      id: update.existing.id,
      payload: update.diff,
      before: pickFields(update.existing, Object.keys(update.diff)),
      simulatedRows: [mergeInterventionRecords(update.existing, update.diff)],
      onSuccess: async (rows) => {
        const updated = rows[0] ? mergeInterventionRecords(update.existing, rows[0]) : mergeInterventionRecords(update.existing, update.diff);
        registerIntervention(interventionIndex, updated);
        report.interventions.updated += 1;
      }
    });
  }

  const insertChunks = chunkArray(inserts, options.batchSize);
  insertChunks.forEach((chunk, chunkIndex) => {
    const payload = chunk.map((item) => item.payload);
    const simulatedRows = chunk.map((item, index) => ({
      id: `dryrun-intervention-${chunkIndex}-${index}`,
      ...item.payload
    }));

    operations.push({
      type: 'insert',
      table: 'interventions',
      payload,
      simulatedRows,
      onSuccess: async (rows) => {
        const producedRows = rows.length ? rows : simulatedRows;
        producedRows.forEach((rowResult, index) => {
          const meta = chunk[index];
          const merged = rowResult.id != null ? mergeInterventionRecords(meta.payload, rowResult) : { ...meta.payload };
          if (rowResult.id != null) merged.id = rowResult.id;
          registerIntervention(interventionIndex, merged);
          if (merged.id != null && meta.artisanIdForLink != null) {
            desiredLinks.push({
              interventionId: merged.id,
              artisanId: meta.artisanIdForLink,
              role: DEFAULT_INTERVENTION_ROLE
            });
          }
          report.interventions.inserted += 1;
        });
      }
    });
  });

  try {
    await applyOperationsWithRollback({
      label: 'Synchronisation des interventions',
      operations,
      supabase,
      dryRun: options.dryRun,
      logger
    });
  } catch (error) {
    errors += 1;
    report.interventions.errors += 1;
    logger.error(`Import interventions interrompu: ${error.message}`);
    throw error;
  }

  if (desiredLinks.length > 0) {
    await syncInterventionArtisans({
      links: desiredLinks,
      interventionArtisansSet,
      supabase,
      dryRun: options.dryRun,
      batchSize: options.batchSize,
      logger,
      report
    });
  }

  report.interventions.skipped += skipped;
  report.interventions.errors += errors;
}

function prepareInterventionRow(row, { usersIndex, artisanIndex, report, rowIndex }) {
  const idInter = normalizeString(row.id_inter);
  if (!idInter) {
    report.warnings.push(`Intervention ligne ${rowIndex + 2}: id_inter manquant, ligne ignorée.`);
    return null;
  }

  let attribueA = null;
  const gestionnaireCode = normalizeString(row.gestionnaire_code).toLowerCase();
  if (gestionnaireCode) {
    const user = usersIndex.byCode.get(gestionnaireCode);
    if (user) {
      attribueA = user.id;
    } else {
      report.warnings.push(`Intervention ${idInter}: gestionnaire inconnu pour le code "${row.gestionnaire_code}".`);
    }
  }

  let artisanId = null;
  const artisanNumero = normalizeString(row.numero_sst);
  const artisanReference = normalizeString(row.artisan_reference);
  let artisanLookupLabel = artisanNumero || artisanReference;

  if (artisanNumero) {
    const artisan = artisanIndex.byNumero.get(artisanNumero);
    if (artisan) {
      artisanId = artisan.id;
    }
  }

  if (!artisanId && artisanReference) {
    if (artisanReference.includes('@')) {
      const artisan = artisanIndex.byEmail.get(artisanReference);
      if (artisan) {
        artisanId = artisan.id;
      }
    }
  }

  if (!artisanId && artisanLookupLabel) {
    report.warnings.push(`Intervention ${idInter}: artisan introuvable (référence ${artisanLookupLabel}).`);
  }

  const payload = {
    id_inter: idInter,
    date: toIsoDate(row.date),
    agence: row.agence || null,
    adresse: row.adresse || null,
    statut: row.statut || null,
    contexte_intervention: row.contexte_intervention || null,
    type: row.metier || null,
    proprietaire: row.proprietaire || null,
    nom_prenom_client: row.nom_prenom_client || null,
    telephone_client: row.telephone_client || null,
    email_client: row.email_client || null,
    cout_sst: safeNumber(row.cout_sst),
    cout_materiel: safeNumber(row.cout_materiel),
    cout_intervention: safeNumber(row.cout_intervention),
    pourcentage_sst: safeNumber(row.pourcentage_sst),
    numero_sst: row.numero_sst || null,
    demande_intervention: toBoolean(row.demande_intervention),
    demande_devis: toBoolean(row.demande_devis),
    demande_trust_pilot: toBoolean(row.demande_trustpilot),
    truspilot: row.trustpilot || null,
    date_intervention: toIsoDate(row.date_intervention),
    commentaire_agent: row.commentaire || null,
    attribue_a: attribueA,
    artisan_id: artisanId
  };

  return { payload, artisanIdForLink: artisanId };
}

function findExistingIntervention(idInter, interventionIndex) {
  if (!idInter) return null;
  return interventionIndex.byInterCode.get(idInter);
}

function computeInterventionDiff(existing, next) {
  const diff = {};
  for (const key of Object.keys(next)) {
    if (next[key] === undefined) continue;
    const existingValue = existing[key] ?? null;
    const nextValue = next[key] ?? null;
    if (existingValue !== nextValue) {
      diff[key] = nextValue;
    }
  }
  return diff;
}

function mergeInterventionRecords(base, patch) {
  return { ...base, ...patch };
}

function registerIntervention(index, intervention) {
  if (intervention.id == null && !intervention.id_inter) return;
  if (intervention.id != null) index.byId.set(intervention.id, intervention);
  if (intervention.id_inter) index.byInterCode.set(intervention.id_inter.toString(), intervention);
}

function toBoolean(value) {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;
  if (['✅', '☑️', '✔', '✔️'].includes(normalized)) return true;
  if (['❌', '✖', '✖️'].includes(normalized)) return false;
  if (['oui', 'yes', 'true', '1', 'vrai', 'y'].includes(normalized)) return true;
  if (['non', 'no', 'false', '0', 'faux', 'n'].includes(normalized)) return false;
  return null;
}
async function syncInterventionArtisans({
  links,
  interventionArtisansSet,
  supabase,
  dryRun,
  batchSize,
  logger,
  report
}) {
  const payloads = [];
  const seen = new Set();

  links.forEach(({ interventionId, artisanId, role }) => {
    if (interventionId == null || artisanId == null) return;
    const key = `${interventionId}:${artisanId}:${role || ''}`;
    if (interventionArtisansSet.has(key) || seen.has(key)) return;
    seen.add(key);
    payloads.push({ intervention_id: interventionId, artisan_id: artisanId, role: role || null });
  });

  if (!payloads.length) {
    logger.info('Aucune nouvelle liaison intervention ↔ artisan à ajouter.');
    return;
  }

  const operations = chunkArray(payloads, batchSize).map((chunk, index) => ({
    type: 'insert',
    table: 'intervention_artisans',
    payload: chunk,
    simulatedRows: chunk.map((item, rowIndex) => ({
      id: `dryrun-intervention-artisan-${index}-${rowIndex}`,
      ...item
    })),
    onSuccess: async () => {
      chunk.forEach((item) => {
        const key = `${item.intervention_id}:${item.artisan_id}:${item.role || ''}`;
        interventionArtisansSet.add(key);
        report.relations.interventionArtisans += 1;
      });
    }
  }));

  await applyOperationsWithRollback({
    label: 'Liaisons intervention ↔ artisan',
    operations,
    supabase,
    dryRun,
    logger
  });
}
