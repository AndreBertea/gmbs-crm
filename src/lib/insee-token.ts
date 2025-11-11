/**
 * Gestion de l'authentification pour l'API INSEE Sirene
 * Supporte deux méthodes :
 * 1. Clé API simple (INSEE_API_KEY) - utilisée directement
 * 2. OAuth2 (INSEE_CLIENT_ID + INSEE_CLIENT_SECRET) - avec cache du token
 */

type TokenCache = {
  access_token: string
  expires_at: number // timestamp en millisecondes
}

let tokenCache: TokenCache | null = null

const INSEE_TOKEN_URL = "https://api.insee.fr/token"
const SAFETY_MARGIN_MS = 60_000 // 60 secondes de marge avant expiration réelle
const DEFAULT_EXPIRES_IN = 3600 // 1 heure par défaut si non spécifié

/**
 * Obtient un token/clé d'authentification pour l'API INSEE
 * Utilise une clé API simple si disponible, sinon OAuth2 avec cache
 * @returns Promise<string> Le token/clé d'accès
 * @throws Error si les identifiants ne sont pas configurés ou si l'API échoue
 */
export async function getInseeToken(): Promise<string> {
  // Méthode 1 : Clé API simple (prioritaire)
  const apiKey = process.env.INSEE_API_KEY
  if (apiKey) {
    return apiKey
  }

  // Méthode 2 : OAuth2 avec Client ID et Secret
  const now = Date.now()

  // Vérifier si le cache existe et est encore valide (avec marge de sécurité)
  if (tokenCache && tokenCache.expires_at > now + SAFETY_MARGIN_MS) {
    return tokenCache.access_token
  }

  // Obtenir les identifiants depuis les variables d'environnement
  const clientId = process.env.INSEE_CLIENT_ID
  const clientSecret = process.env.INSEE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("[insee-token] Variables d'environnement manquantes:", {
      hasApiKey: !!apiKey,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    })
    throw new Error(
      "Les identifiants INSEE ne sont pas configurés. Veuillez définir INSEE_API_KEY (clé API simple) OU INSEE_CLIENT_ID et INSEE_CLIENT_SECRET (OAuth2) dans les variables d'environnement."
    )
  }

  // Préparer la requête OAuth2
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  })

  try {
    const response = await fetch(INSEE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erreur inconnue")
      console.error("[insee-token] Échec de l'obtention du token:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(
        `Échec de l'obtention du token INSEE (${response.status}): ${errorText}`
      )
    }

    const data = (await response.json()) as {
      access_token?: string
      expires_in?: number
      token_type?: string
    }

    if (!data.access_token) {
      throw new Error("Le token d'accès n'a pas été retourné par l'API INSEE")
    }

    // Calculer la date d'expiration
    const expiresIn = data.expires_in ?? DEFAULT_EXPIRES_IN
    const expiresAt = now + expiresIn * 1000

    // Mettre à jour le cache
    tokenCache = {
      access_token: data.access_token,
      expires_at: expiresAt,
    }

    return tokenCache.access_token
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Erreur lors de l'obtention du token INSEE")
  }
}

