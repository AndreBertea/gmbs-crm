"use server"

import { NextRequest, NextResponse } from "next/server"

type GeocodeResponse = {
  lat: number
  lng: number
  precision?: string
}

type GeocodeSuggestion = GeocodeResponse & {
  label: string
}

type GeocodeError = {
  error: string
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

type CacheEntry = {
  data: GeocodeResponse
  expiresAt: number
}

type InternalGeocodeResult = GeocodeResponse & {
  label: string
  provider: "opencage" | "nominatim"
}

const requestCounts = new Map<string, RateLimitEntry>()
const geocodeCache = new Map<string, CacheEntry>()

const RATE_LIMIT = 60
const RATE_WINDOW = 60_000
const CACHE_TTL = 60_000
const MAX_SUGGESTIONS = 5

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get("q")?.trim()
    const limit = parseLimit(searchParams.get("limit"))
    const suggestMode = searchParams.get("suggest") === "1"

    if (!rawQuery) {
      return NextResponse.json({ error: "Query parameter 'q' is required" } satisfies GeocodeError, { status: 400 })
    }

    enforceRateLimit(getClientIdentifier(request))

    if (!suggestMode) {
      const cached = geocodeCache.get(rawQuery.toLowerCase())
      if (cached && cached.expiresAt > Date.now()) {
        const response = NextResponse.json(cached.data)
        response.headers.set("Cache-Control", "public, max-age=60")
        return response
      }
    }

    const signal = new AbortController().signal

    const results = await geocodeAcrossProviders(rawQuery, limit, signal)

    if (suggestMode) {
      const payload = results.map(({ label, lat, lng, precision }) => ({
        label,
        lat,
        lng,
        precision,
      })) satisfies GeocodeSuggestion[]

      const response = NextResponse.json(payload)
      response.headers.set("Cache-Control", "public, max-age=60")
      return response
    }

    const bestMatch = results[0]
    if (!bestMatch) {
      return NextResponse.json({ error: "Address not found" } satisfies GeocodeError, { status: 404 })
    }

    geocodeCache.set(rawQuery.toLowerCase(), {
      data: { lat: bestMatch.lat, lng: bestMatch.lng, precision: bestMatch.precision },
      expiresAt: Date.now() + CACHE_TTL,
    })

    const response = NextResponse.json({
      lat: bestMatch.lat,
      lng: bestMatch.lng,
      precision: bestMatch.precision,
    } satisfies GeocodeResponse)
    response.headers.set("Cache-Control", "public, max-age=60")
    return response
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many requests" } satisfies GeocodeError, {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((error.resetAt - Date.now()) / 1000).toString(),
        },
      })
    }

    console.error("[geocode] Error:", error)
    return NextResponse.json({ error: "Geocoding failed" } satisfies GeocodeError, { status: 500 })
  }
}

function parseLimit(param: string | null) {
  if (!param) return 1
  const parsed = Number.parseInt(param, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1
  }
  return Math.min(parsed, MAX_SUGGESTIONS)
}

function enforceRateLimit(identifier: string) {
  const now = Date.now()
  const entry = requestCounts.get(identifier)

  if (!entry || entry.resetAt <= now) {
    requestCounts.set(identifier, { count: 1, resetAt: now + RATE_WINDOW })
    return
  }

  if (entry.count >= RATE_LIMIT) {
    throw new RateLimitExceededError(entry.resetAt)
  }

  entry.count += 1
}

function getClientIdentifier(request: NextRequest) {
  const requestWithIp = request as NextRequest & { ip?: string | null }
  const forwardedFor = request.headers.get("x-forwarded-for")
  const primaryForwarded = forwardedFor?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()

  return requestWithIp.ip ?? primaryForwarded ?? realIp ?? "global"
}

async function geocodeAcrossProviders(query: string, limit: number, signal: AbortSignal): Promise<InternalGeocodeResult[]> {
  const results: InternalGeocodeResult[] = []
  const seen = new Set<string>()

  const pushUnique = (entries: InternalGeocodeResult[]) => {
    for (const entry of entries) {
      const key = `${entry.label.toLowerCase()}|${entry.lat.toFixed(6)}|${entry.lng.toFixed(6)}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push(entry)
      if (results.length >= limit) break
    }
  }

  const openCageResults = await geocodeWithOpenCage(query, limit, signal)
  pushUnique(openCageResults)

  if (results.length < limit) {
    const nominatimResults = await geocodeWithNominatim(query, limit, signal)
    pushUnique(nominatimResults)
  }

  return results.slice(0, limit)
}

async function geocodeWithOpenCage(query: string, limit: number, signal: AbortSignal): Promise<InternalGeocodeResult[]> {
  const apiKey = process.env.OPENCAGE_API_KEY
  if (!apiKey) {
    return []
  }

  const endpoint = new URL("https://api.opencagedata.com/geocode/v1/json")
  endpoint.searchParams.set("q", query)
  endpoint.searchParams.set("key", apiKey)
  endpoint.searchParams.set("limit", String(Math.min(limit, MAX_SUGGESTIONS)))
  endpoint.searchParams.set("language", "fr")
  endpoint.searchParams.set("no_annotations", "1")

  const response = await fetch(endpoint, { signal, headers: { Accept: "application/json" } })
  if (!response.ok) {
    console.warn("[geocode] OpenCage request failed", response.status, await safeReadText(response))
    return []
  }

  const payload = (await response.json()) as OpenCageResponse | null
  const rawResults = payload?.results ?? []

  return rawResults
    .filter((result) => result?.geometry?.lat != null && result?.geometry?.lng != null && result.formatted)
    .slice(0, limit)
    .map(
      (result) =>
        ({
          lat: result.geometry.lat,
          lng: result.geometry.lng,
          precision: result.confidence ? String(result.confidence) : undefined,
          label: result.formatted,
          provider: "opencage",
        }) satisfies InternalGeocodeResult,
    )
}

async function geocodeWithNominatim(query: string, limit: number, signal: AbortSignal): Promise<InternalGeocodeResult[]> {
  const endpoint = new URL(NOMINATIM_BASE_URL)
  endpoint.searchParams.set("q", query)
  endpoint.searchParams.set("format", "json")
  endpoint.searchParams.set("limit", String(Math.min(limit, MAX_SUGGESTIONS)))
  endpoint.searchParams.set("addressdetails", "0")

  const response = await fetch(endpoint, {
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": buildNominatimUserAgent(),
    },
  })

  if (!response.ok) {
    console.warn("[geocode] Nominatim request failed", response.status, await safeReadText(response))
    return []
  }

  const payload = (await response.json()) as NominatimResponse | null
  const rawResults = payload ?? []

  return rawResults
    .filter((result) => result?.lat && result?.lon && result?.display_name)
    .slice(0, limit)
    .map(
      (result) =>
        ({
          lat: Number.parseFloat(result.lat),
          lng: Number.parseFloat(result.lon),
          precision: result.importance ? result.importance.toFixed(2) : undefined,
          label: result.display_name,
          provider: "nominatim",
        }) satisfies InternalGeocodeResult,
    )
}

function buildNominatimUserAgent() {
  const projectUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost"
  return `GMBS-CRM/1.0 (${projectUrl})`
}

async function safeReadText(response: Response) {
  try {
    return await response.text()
  } catch {
    return null
  }
}

type OpenCageResponse = {
  results?: Array<{
    geometry: { lat: number; lng: number }
    confidence?: number
    formatted: string
  }>
} | null

type NominatimResponse = Array<{
  lat: string
  lon: string
  importance?: number
  display_name?: string
}>

class RateLimitExceededError extends Error {
  resetAt: number

  constructor(resetAt: number) {
    super("Rate limit exceeded")
    this.name = "RateLimitExceededError"
    this.resetAt = resetAt
  }
}
