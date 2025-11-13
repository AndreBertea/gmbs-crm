#!/usr/bin/env tsx

/**
 * Geocode artisans based on their intervention or headquarters address.
 *
 * Usage:
 *   npx tsx scripts/geocode-artisans.ts
 *
 * Environment variables:
 *   SUPABASE_URL                - Supabase instance URL
 *   SUPABASE_SERVICE_ROLE_KEY   - Supabase service role key (required)
 *   OPENCAGE_API_KEY            - Optional, improves geocoding accuracy
 *   GEOCODE_BATCH_SIZE          - Optional, default 50 (artisans per batch)
 *   GEOCODE_CONCURRENCY         - Optional, default 3 (parallel requests)
 *   GEOCODE_REQUEST_DELAY_MS    - Optional, default 1000 (min delay between requests)
 *
 * Performance:
 *   - With 3 concurrent requests: ~3 artisans/sec
 *   - 1900 artisans ≈ 10-15 minutes
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, appendFileSync, existsSync } from "fs";

// Load environment variables based on NODE_ENV
// In production, load .env.production, otherwise .env.local
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.local';

if (process.env.NODE_ENV === 'production') {
  config({ path: envFile });
} else {
  config({ path: ".env.local" });
}
config(); // Fallback to .env

type ArtisanRow = {
  id: string;
  prenom: string | null;
  nom: string | null;
  raison_sociale: string | null;
  adresse_intervention: string | null;
  code_postal_intervention: string | null;
  ville_intervention: string | null;
  adresse_siege_social: string | null;
  code_postal_siege_social: string | null;
  ville_siege_social: string | null;
  intervention_latitude: number | null;
  intervention_longitude: number | null;
};

type GeocodeResult = {
  lat: number;
  lng: number;
  provider: "opencage" | "nominatim";
};

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "http://localhost:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
const BATCH_SIZE = Number(process.env.GEOCODE_BATCH_SIZE ?? "50");
const REQUEST_DELAY_MS = Number(
  process.env.GEOCODE_REQUEST_DELAY_MS ?? "1000",
);
const CONCURRENCY = Number(process.env.GEOCODE_CONCURRENCY ?? "3");

if (!SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing SUPABASE_SERVICE_ROLE_KEY. Please set it in your environment.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rate limiter to control concurrent requests
class RateLimiter {
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private lastRequestTime = 0;

  constructor(
    private maxConcurrent: number,
    private minDelayMs: number,
  ) {}

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = async () => {
        if (this.activeCount < this.maxConcurrent) {
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          const delayNeeded = Math.max(0, this.minDelayMs - timeSinceLastRequest);

          if (delayNeeded > 0) {
            await sleep(delayNeeded);
          }

          this.activeCount++;
          this.lastRequestTime = Date.now();
          resolve();
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  release(): void {
    this.activeCount--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

const rateLimiter = new RateLimiter(CONCURRENCY, REQUEST_DELAY_MS);

const FAILED_LOG_FILE = "scripts/geocode-failed-artisans.txt";

// Initialize log file
if (!existsSync(FAILED_LOG_FILE)) {
  writeFileSync(
    FAILED_LOG_FILE,
    `# Artisans qui n'ont pas pu être géocodés\n# Généré le ${new Date().toLocaleString("fr-FR")}\n\n`,
  );
}

function buildAddressCandidates(artisan: ArtisanRow): string[] {
  const candidates: string[] = [];

  const interventionParts = [
    artisan.adresse_intervention,
    artisan.code_postal_intervention,
    artisan.ville_intervention,
  ]
    .filter(Boolean)
    .map((value) => value?.trim());

  if (interventionParts.length >= 2) {
    candidates.push(interventionParts.join(", "));
  }

  const hqParts = [
    artisan.adresse_siege_social,
    artisan.code_postal_siege_social,
    artisan.ville_siege_social,
  ]
    .filter(Boolean)
    .map((value) => value?.trim());

  if (hqParts.length >= 2) {
    const formatted = hqParts.join(", ");
    if (!candidates.includes(formatted)) {
      candidates.push(formatted);
    }
  }

  return candidates;
}

async function geocodeWithOpenCage(
  address: string,
): Promise<GeocodeResult | null> {
  if (!OPENCAGE_API_KEY) {
    return null;
  }

  const endpoint = new URL("https://api.opencagedata.com/geocode/v1/json");
  endpoint.searchParams.set("q", address);
  endpoint.searchParams.set("key", OPENCAGE_API_KEY);
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("language", "fr");
  endpoint.searchParams.set("no_annotations", "1");

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn(
      `[geocode] OpenCage failed (${response.status}): ${body.slice(0, 200)}`,
    );
    return null;
  }

  const payload: {
    results?: Array<{ geometry?: { lat?: number; lng?: number } }>;
  } = await response.json();
  const match = payload.results?.[0]?.geometry;
  if (!match || match.lat == null || match.lng == null) {
    return null;
  }

  return { lat: match.lat, lng: match.lng, provider: "opencage" };
}

async function geocodeWithNominatim(
  address: string,
): Promise<GeocodeResult | null> {
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", address);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("addressdetails", "0");

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "gmbs-crm-geocode-script/1.0 (contact@webcraft.fr)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn(
      `[geocode] Nominatim failed (${response.status}): ${body.slice(0, 200)}`,
    );
    return null;
  }

  const payload: Array<{ lat?: string; lon?: string }> = await response.json();
  const match = payload[0];
  if (!match?.lat || !match?.lon) {
    return null;
  }

  return {
    lat: Number.parseFloat(match.lat),
    lng: Number.parseFloat(match.lon),
    provider: "nominatim",
  };
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) {
    return null;
  }

  const withOpenCage = await geocodeWithOpenCage(trimmed);
  if (withOpenCage) {
    return withOpenCage;
  }

  return geocodeWithNominatim(trimmed);
}

async function fetchNextBatch(): Promise<ArtisanRow[]> {
  const { data, error } = await supabase
    .from("artisans")
    .select(
      [
        "id",
        "prenom",
        "nom",
        "raison_sociale",
        "adresse_intervention",
        "code_postal_intervention",
        "ville_intervention",
        "adresse_siege_social",
        "code_postal_siege_social",
        "ville_siege_social",
        "intervention_latitude",
        "intervention_longitude",
      ].join(", "),
    )
    .or("intervention_latitude.is.null,intervention_longitude.is.null")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE * 2); // Récupérer plus pour compenser le filtrage

  if (error) {
    throw new Error(`Supabase fetch error: ${error.message}`);
  }

  // Filtrer côté client : uniquement ceux sans coordonnées valides
  // (null, null) ou (0, 0) qui indique un échec précédent
  return (data ?? []).filter(
    (artisan) =>
      !artisan.intervention_latitude ||
      !artisan.intervention_longitude ||
      (artisan.intervention_latitude === 0 && artisan.intervention_longitude === 0)
  ).slice(0, BATCH_SIZE);
}

async function updateArtisanLocation(
  artisanId: string,
  result: GeocodeResult,
): Promise<void> {
  const { error } = await supabase
    .from("artisans")
    .update({
      intervention_latitude: result.lat,
      intervention_longitude: result.lng,
    })
    .eq("id", artisanId);

  if (error) {
    throw new Error(
      `Failed to update artisan ${artisanId}: ${error.message}`,
    );
  }
}

async function markArtisanAsFailed(
  artisanId: string,
  reason: string,
): Promise<void> {
  // Mark with special coordinates (0, 0) to indicate "tried but failed"
  const { error } = await supabase
    .from("artisans")
    .update({
      intervention_latitude: 0,
      intervention_longitude: 0,
    })
    .eq("id", artisanId);

  if (error) {
    console.error(`Failed to mark artisan ${artisanId} as failed: ${error.message}`);
  }
}

function logFailedArtisan(artisan: ArtisanRow, reason: string): void {
  const label = formatArtisanLabel(artisan);
  const addressInfo = [
    artisan.adresse_intervention,
    artisan.code_postal_intervention,
    artisan.ville_intervention,
  ]
    .filter(Boolean)
    .join(", ") || "Aucune adresse";

  const logEntry = `[${new Date().toISOString()}] ${label} (ID: ${artisan.id})\n  Raison: ${reason}\n  Adresse: ${addressInfo}\n\n`;
  appendFileSync(FAILED_LOG_FILE, logEntry);
}

function formatArtisanLabel(artisan: ArtisanRow): string {
  if (artisan.raison_sociale) {
    return artisan.raison_sociale;
  }
  const parts = [artisan.prenom, artisan.nom].filter(Boolean);
  return parts.join(" ") || artisan.id;
}

async function processArtisan(artisan: ArtisanRow): Promise<boolean> {
  const label = formatArtisanLabel(artisan);
  
  // Vérification de sécurité : ignorer si déjà géocodé avec des coordonnées valides
  if (
    artisan.intervention_latitude &&
    artisan.intervention_longitude &&
    !(artisan.intervention_latitude === 0 && artisan.intervention_longitude === 0)
  ) {
    console.log(`⏭️  ${label}: déjà géocodé (${artisan.intervention_latitude}, ${artisan.intervention_longitude}), ignoré.`);
    return false;
  }

  const candidates = buildAddressCandidates(artisan);

  if (candidates.length === 0) {
    console.warn(`⚠️  ${label}: no address available, marking as failed.`);
    logFailedArtisan(artisan, "Aucune adresse disponible");
    await markArtisanAsFailed(artisan.id, "no address");
    return false;
  }

  let geocoded: GeocodeResult | null = null;
  let attempts = 0;
  const maxAttempts = 2;

  for (const candidate of candidates) {
    if (attempts >= maxAttempts) {
      break;
    }

    await rateLimiter.acquire();
    try {
      geocoded = await geocodeAddress(candidate);
      attempts++;
    } catch (error) {
      console.error(`❌ ${label}: geocode error: ${(error as Error).message}`);
      attempts++;
    } finally {
      rateLimiter.release();
    }

    if (geocoded) {
      break;
    }
  }

  if (!geocoded) {
    console.warn(`⚠️  ${label}: no match found after ${attempts} attempts, marking as failed.`);
    logFailedArtisan(artisan, `Aucun résultat trouvé après ${attempts} tentatives`);
    await markArtisanAsFailed(artisan.id, "no match");
    return false;
  }

  await updateArtisanLocation(artisan.id, geocoded);
  console.log(
    `✅ ${label}: ${geocoded.lat.toFixed(6)}, ${geocoded.lng.toFixed(6)} (${geocoded.provider})`,
  );
  return true;
}

async function processBatch(batch: ArtisanRow[]): Promise<number> {
  const results = await Promise.all(batch.map((artisan) => processArtisan(artisan)));
  return results.filter((success) => success).length;
}

async function run() {
  console.log("🚀 Starting artisan geocoding…");
  console.log(`   Supabase URL:        ${SUPABASE_URL}`);
  console.log(
    `   Using OpenCage:      ${OPENCAGE_API_KEY ? "yes" : "no (fallback Nominatim)"}`,
  );
  console.log(`   Batch size:          ${BATCH_SIZE}`);
  console.log(`   Concurrency:         ${CONCURRENCY} parallel requests`);
  console.log(`   Delay between calls: ${REQUEST_DELAY_MS} ms`);
  console.log(`   Log file:            ${FAILED_LOG_FILE}`);
  console.log("");

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  while (true) {
    const batch = await fetchNextBatch();
    if (batch.length === 0) {
      break;
    }

    console.log(
      `🔄 Processing batch of ${batch.length} artisan${batch.length > 1 ? "s" : ""}…`,
    );
    const successCount = await processBatch(batch);
    totalProcessed += batch.length;
    totalSuccess += successCount;
    totalFailed = totalProcessed - totalSuccess;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (totalProcessed / (Date.now() - startTime) * 1000).toFixed(1);
    console.log(
      `📊 Progress: ${totalSuccess} réussis, ${totalFailed} échecs | ${rate} artisans/sec | ${elapsed}s\n`,
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log(`✨ Terminé en ${totalTime}s !`);
  console.log(`   ✅ ${totalSuccess} artisans géocodés avec succès`);
  console.log(`   ❌ ${totalFailed} artisans en échec (voir ${FAILED_LOG_FILE})`);
}

run().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
