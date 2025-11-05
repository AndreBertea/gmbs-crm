"use client"

export async function persistInterventionStatusColor(code: string, color: string): Promise<void> {
  if (!code || !color) return
  try {
    const response = await fetch(`/api/intervention-statuses/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ color }),
    })
    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || "Erreur lors de la mise à jour du statut")
    }
  } catch (error) {
    console.error("[status] Impossible de mettre à jour la couleur du statut", error)
    throw error
  }
}
