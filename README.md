## Qu’est-ce que c’est ?
CRM_template est une base Next.js + TypeScript connectée à une base Postgres/Supabase. Cette branche GMBS_DEV_to_PROD fournit un setup local minimal, reproductible, “production‑ready for local test”. Aucun script superflu, uniquement l’essentiel pour lancer l’app avec des données de démonstration.

## Prérequis
- Node 20 (nvm: `nvm use v20`)
- npm
- Supabase CLI ou Postgres local (recommandé: Supabase CLI)

## Installation rapide (5 minutes)

```bash
git clone <repo>
cd CRM_template
cp .env.example .env.local
npm ci # or npm install 
npm run setup
npm run import:all
npm run dev
```

- URL: http://localhost:3000
- Attendu: la page d’accueil s’affiche avec des données seed (ex: utilisateurs/artisans/interventions).

## Base de données
- Option A — Supabase local (recommandé)
  - Les scripts `db:*` encapsulent `supabase start` et appliquent les migrations SQL.
  - Ports par défaut: API 54321 (HTTP), Postgres 54322.
- Option B — Postgres (si supportée)
  - Définir `DATABASE_URL` dans `.env.local` (ex: `postgresql://user:pass@localhost:5432/postgres`).
- Reset
  - `npm run db:reset` — destructif, demande confirmation, réapplique les migrations ensuite.

## Scripts utiles

| Script            | But |
|-------------------|-----|
| `setup`           | Installe les deps, vérifie l’environnement |
| `db:init`         | Démarre Supabase local (si dispo) et applique migrations |
| `db:seed`         | Insère un jeu de données déterministe |
| `db:reset`        | Réinitialise la DB localement puis réapplique migrations |
| `lint`            | ESLint sur le repo |
| `typecheck`       | Vérification TypeScript (sans emit) |
| `test`            | Vitest en mode run |

## Cartographie & géocodage

- L’interface utilise MapLibre GL + MapTiler pour l’affichage des cartes (3D activée par défaut).
- Configurez les variables d’environnement suivantes dans `.env.local` :
  - `MAPTILER_API_KEY`
  - `NEXT_PUBLIC_MAPTILER_API_KEY` (clé publique injectée côté client)
  - `OPENCAGE_API_KEY` (optionnel, améliore la précision du géocodage)
- L’API `GET /api/geocode?q=<adresse>` interroge OpenCage si disponible, sinon Nominatim (OpenStreetMap) avec rate-limiting intégré.
- Les formulaires d’intervention utilisent cette route pour localiser une adresse et positionner le marqueur sur la carte.

## Dépannage
- Ports occupés: arrêtez les conteneurs (`supabase stop`) ou Docker Desktop puis relancez.
- Supabase CLI manquant: installez-le (https://supabase.com/docs/guides/cli) ou utilisez un Postgres local avec `DATABASE_URL`.
- Variables manquantes: copiez `.env.example` vers `.env.local` et utilisez les valeurs locales par défaut fournies.
- Erreurs réseau npm: relancez `npm ci`.

## Sécurité
- Ne commitez jamais de secrets (API keys, service_role, tokens). Utilisez `.env.local` pour vos valeurs privées.
- Les valeurs Supabase locales par défaut ne sont pas des secrets réels (limitées au dev local).
- En cas de fuite: révoquez/rotatez les clés et tokens concernés.

## Auth (Supabase)

- Uses Supabase Auth (JWT) with RLS on `public.users`.
- Required env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)

### Migrations

- `db/migrations/20250901180000_supabase_auth_link.sql`:
  - Adds `auth_user_id uuid unique` to `public.users`.
  - Enables RLS + policies: users can select/update only their own row.
  - Trigger on `auth.users` insert to auto-create a profile in `public.users`.

### App changes

- Login at `/login` uses `supabase.auth.signInWithPassword`.
- `/api/auth/me` and `/api/auth/status` expect a Bearer token (the Supabase access token) and operate via RLS.
- Topbar avatar fetches `/api/auth/me` and updates status via `/api/auth/status`.

### Import existing users

- `scripts/import-users.mjs`:
  - `node scripts/import-users.mjs ./users.json`
  - JSON items: `{ email, password?, username?, name?, prenom? }`
  - Creates users in `auth.users` and links `public.users.auth_user_id` by email/username.

### Manual test checklist

- Unauthenticated → `/login`.
- Login with email/password → `/interventions`.
- `/api/auth/me` returns current profile via RLS when called with `Authorization: Bearer <token>`.
- `/api/auth/status` updates status and `last_seen_at` when `connected`.
- Topbar avatar shows initials, status dot, and user colors from `public.users`.
