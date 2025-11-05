import { NextResponse } from "next/server"
import { searchArtisansLocally } from "@/lib/api/artisans"
import { deepSearchArtisans } from "@/lib/api/deepSearch"
import { searchNearbyArtisans } from "@/lib/api/googleMaps"

type SearchPayload = {
  query?: string
  address?: string
}

export async function POST(request: Request) {
  try {
    const { query, address }: SearchPayload = await request.json()

    const [local, maps, ai] = await Promise.all([
      searchArtisansLocally({ query }),
      address ? searchNearbyArtisans(address) : Promise.resolve([]),
      query ? deepSearchArtisans(query) : Promise.resolve([]),
    ])

    return NextResponse.json({
      local,
      maps,
      ai,
    })
  } catch (error) {
    console.error("[api/interventions/artisans/search] POST failed", error)
    return NextResponse.json({ message: (error as Error).message }, { status: 400 })
  }
}
