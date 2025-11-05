import { describe, expect, it } from "vitest"

import { runQuery } from "../src/lib/query-engine"
import { placeInLanes } from "../src/components/interventions/views/TimelineView"
import type { InterventionView } from "../src/types/intervention-view"
import type { ViewFilter, ViewSort } from "../src/types/intervention-views"
import type { InterventionStatusValue } from "../src/types/interventions"

type InterventionOverrides = Partial<InterventionView> & { id: string; statusValue?: InterventionStatusValue }

const createIntervention = ({ id, statusValue = "DEMANDE", ...overrides }: InterventionOverrides): InterventionView => {
  return {
    id,
    idFacture: undefined,
    date: overrides.date ?? "2024-01-01",
    dateTermine: overrides.dateTermine,
    agence: overrides.agence ?? "Paris",
    contexteIntervention: overrides.contexteIntervention ?? "Installation",
    pieceJointeIntervention: [],
    pieceJointeCout: [],
    pieceJointeDevis: [],
    pieceJointePhotos: [],
    pieceJointeFactureGMBS: [],
    pieceJointeFactureArtisan: [],
    pieceJointeFactureMateriel: [],
    consigneIntervention: overrides.consigneIntervention,
    consigneDeuxiemeArtisanIntervention: overrides.consigneDeuxiemeArtisanIntervention,
    commentaireAgent: overrides.commentaireAgent,
    adresse: overrides.adresse ?? "1 rue de Paris",
    codePostal: overrides.codePostal ?? "75000",
    ville: overrides.ville ?? "Paris",
    latitudeAdresse: overrides.latitudeAdresse,
    longitudeAdresse: overrides.longitudeAdresse,
    type: overrides.type ?? "TYPE",
    typeDeuxiemeArtisan: overrides.typeDeuxiemeArtisan,
    datePrevue: overrides.datePrevue,
    datePrevueDeuxiemeArtisan: overrides.datePrevueDeuxiemeArtisan,
    statut: overrides.statut ?? statusValue,
    sousStatutText: overrides.sousStatutText,
    sousStatutTextColor: overrides.sousStatutTextColor,
    prenomProprietaire: overrides.prenomProprietaire,
    nomProprietaire: overrides.nomProprietaire,
    telephoneProprietaire: overrides.telephoneProprietaire,
    emailProprietaire: overrides.emailProprietaire,
    prenomClient: overrides.prenomClient ?? "Jean",
    nomClient: overrides.nomClient ?? "Dupont",
    telephoneClient: overrides.telephoneClient,
    telephone2Client: overrides.telephone2Client,
    emailClient: overrides.emailClient,
    coutSST: overrides.coutSST,
    marge: overrides.marge ?? 0,
    coutMateriel: overrides.coutMateriel,
    coutIntervention: overrides.coutIntervention,
    coutSSTDeuxiemeArtisan: overrides.coutSSTDeuxiemeArtisan,
    margeDeuxiemeArtisan: overrides.margeDeuxiemeArtisan,
    coutMaterielDeuxiemeArtisan: overrides.coutMaterielDeuxiemeArtisan,
    acompteSST: overrides.acompteSST,
    acompteClient: overrides.acompteClient,
    acompteSSTRecu: overrides.acompteSSTRecu ?? false,
    acompteClientRecu: overrides.acompteClientRecu ?? false,
    dateAcompteSST: overrides.dateAcompteSST,
    dateAcompteClient: overrides.dateAcompteClient,
    deleteInterventionComptabilite: overrides.deleteInterventionComptabilite,
    attribueA: overrides.attribueA,
    artisan: overrides.artisan,
    statusValue,
  } as InterventionView
}

describe("runQuery", () => {
  const dataset = [
    createIntervention({ id: "1", statusValue: "DEMANDE", date: "2024-01-01", contexteIntervention: "Installation pompe" }),
    createIntervention({ id: "2", statusValue: "ACCEPTEE", date: "2024-01-05", contexteIntervention: "Réparation toiture" }),
    createIntervention({ id: "3", statusValue: "DEMANDE", date: "2024-02-01", contexteIntervention: "Maintenance annuelle", marge: 250 }),
  ]

  it("filters by status correctly", () => {
    const filters: ViewFilter[] = [{ property: "statusValue", operator: "eq", value: "DEMANDE" }]
    const result = runQuery(dataset, filters, [])
    expect(result).toHaveLength(2)
    expect(result.every((item) => item.statusValue === "DEMANDE")).toBe(true)
  })

  it("applies sorting order", () => {
    const sorts: ViewSort[] = [{ property: "date", direction: "desc" }]
    const result = runQuery(dataset, [], sorts)
    expect(result[0].id).toBe("3")
    expect(result[1].id).toBe("2")
    expect(result[2].id).toBe("1")
  })

  it("supports number comparisons", () => {
    const filters: ViewFilter[] = [{ property: "marge", operator: "gt", value: 100 }]
    const result = runQuery(dataset, filters, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("3")
  })
})

describe("placeInLanes", () => {
  const base = createIntervention({ id: "e1" })
  const events = [
    { intervention: base, start: new Date("2024-01-01"), end: new Date("2024-01-03"), groupKey: "A" },
    { intervention: base, start: new Date("2024-01-02"), end: new Date("2024-01-04"), groupKey: "A" },
    { intervention: base, start: new Date("2024-01-05"), end: new Date("2024-01-06"), groupKey: "A" },
  ]

  it("distributes overlapping events in different lanes", () => {
    const placed = placeInLanes(events)
    expect(placed[0].laneIndex).toBe(0)
    expect(placed[1].laneIndex).toBe(1)
    expect(placed[2].laneIndex).toBe(0)
  })

  it("avoids overlaps within the same lane", () => {
    const placed = placeInLanes(events)
    const hasOverlap = placed.some((event, index) =>
      placed.slice(index + 1).some((other) => {
        if (event.laneIndex !== other.laneIndex) return false
        return event.start < other.end && other.start < event.end
      }),
    )
    expect(hasOverlap).toBe(false)
  })
})
