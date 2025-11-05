import { useEffect, useState } from "react"
import { referenceApi } from "@/lib/reference-api"

/**
 * Hook pour charger et cacher le mapping USERNAME → UUID des utilisateurs
 * Utilisé pour convertir les usernames en UUIDs pour les requêtes SQL
 */
export function useUserMap() {
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    referenceApi
      .getUsers()
      .then((users) => {
        if (!mounted) return
        const map: Record<string, string> = {}
        for (const user of users) {
          // Map à la fois username, firstname, lastname → id
          if (user.username) map[user.username.toLowerCase()] = user.id
          if (user.firstname) map[user.firstname.toLowerCase()] = user.id
          if (user.lastname) map[user.lastname.toLowerCase()] = user.id
          if (user.code_gestionnaire) map[user.code_gestionnaire.toLowerCase()] = user.id
          // Map aussi le nom complet
          const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim().toLowerCase()
          if (fullName) map[fullName] = user.id
        }
        setUserMap(map)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err)
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  /**
   * Convertit un username (ou array de usernames) en UUID(s)
   * @param name - Username(s) (ex: "andrea" ou ["andrea", "olivier"])
   * @returns UUID(s) correspondant(s)
   */
  const nameToId = (name: string | string[] | undefined): string | string[] | undefined => {
    if (!name) return undefined
    if (Array.isArray(name)) {
      return name.map((n) => userMap[n.toLowerCase()]).filter(Boolean)
    }
    return userMap[name.toLowerCase()]
  }

  return { userMap, loading, error, nameToId }
}



