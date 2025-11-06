# Prompt de simplification - Scroll Infini Interventions

**Date** : 5 novembre 2025  
**Type** : Refactoring architectural majeur  
**Objectif** : Simplifier radicalement le scroll infini en s'inspirant de l'approche Angular

---

## 📋 Contexte

### Ce qui a été fait jusqu'ici

Suite à l'implémentation d'un système de cursor-based pagination par Codex, plusieurs problèmes critiques ont été identifiés et corrigés :

1. **Erreurs HTTP 500** : Colonnes inexistantes dans la table `interventions`
   - Fichier : `src/lib/supabase-api-v2.ts`
   - Correction : Nettoyage du `PROPERTY_COLUMN_MAP` (98 → 24 mappings valides)
   - Correction : Création de `DERIVED_VIEW_FIELDS` (94 champs dérivés)
   - Correction : Whitelist stricte `VALID_INTERVENTION_COLUMNS`

2. **Artisans et coûts vides** : Pas de jointures SQL
   - Fichier : `supabase/functions/interventions-v2/index.ts`
   - Correction : Ajout relations `artisans`, `costs`, `owner` dans `AVAILABLE_RELATIONS`
   - Correction : Inclusion automatique dans `buildSelectClause`

3. **Scroll bloqué à 150 interventions** : Backward scroll intempestif
   - Fichier : `src/components/interventions/views/TableView.tsx`
   - Correction : Désactivation de `onStartReached` (ligne 459)

4. **Scroll bloqué à 50 au retour depuis Market** : Cache incomplet
   - Fichier : `src/hooks/useInterventions.ts`
   - Correction : `skipCache: true` au chargement initial (ligne 520)
   - Correction : Ajout `viewId` dans `paramsKey` pour forcer reload

5. **Double filtrage** : Filtres appliqués 2 fois
   - Fichier : `src/components/interventions/views/TableView.tsx`
   - Correction : Suppression du `runQuery()` dans le dataset (ligne 334)

### État actuel

**Architecture actuelle** (complexe) :
- Edge function avec cursor-pagination keyset `(date, id)`
- Hook avec gestion cursors, cache sessionStorage, sliding window
- Batch de 100 interventions par requête
- Cache TTL 2 minutes
- ~1500 lignes de code pour la pagination

**Problème fondamental** :
- Pour 6 200 interventions (~18 MB), cette complexité est **inutile**
- Le réseau (100-200ms) est **20-40× plus lent** que la mémoire (< 5ms)
- L'approche Angular était plus simple et plus performante

---

## 🎯 Objectif de la simplification

### Vision cible : Approche "Load All + Filter in Memory"

**Principe** :
1. Charger **TOUTES** les interventions en mémoire (6K = 18-20 MB, négligeable en 2025)
2. Appliquer **filtres et tris côté client** en JavaScript (< 5ms, instantané)
3. Utiliser **react-virtual** uniquement pour la virtualisation DOM
4. **Supprimer** : cursors, cache sessionStorage, sliding window, backward scroll

**Inspiré de** : Architecture Angular qui fonctionnait parfaitement
- Batch de 500 interventions
- Tout en mémoire après le premier chargement
- Filtres/tris instantanés
- Code simple et fiable

---

## 📝 Tâches attendues

### 1️⃣ Simplifier le hook `useInterventions`

**Fichier** : `src/hooks/useInterventions.ts`  
**Lignes actuelles** : ~550 lignes  
**Cible** : ~80 lignes

**Supprimer** :
- ❌ Gestion des cursors (`cursorRef`, `prevCursorRef`, `currentCursor`)
- ❌ Cache sessionStorage (tout le système de clés, TTL, cleanup)
- ❌ Sliding window (`maxCachedItems`, `slidingWindow`, logique de troncature)
- ❌ Direction forward/backward (`direction`, `loadMore(direction)`)
- ❌ Fonctions `setFilters`, `setSort`, `setSearch`, `setFields`, `setQuery` (gérées côté client)
- ❌ Logique `mergeAndTrim`, déduplication complexe
- ❌ `skipCache`, `usedCache`, double chargement

**Garder** :
- ✅ `interventions[]` : Liste en mémoire
- ✅ `loading` : État de chargement
- ✅ `error` : Gestion d'erreurs
- ✅ `totalCount` : Nombre total (égal à `interventions.length`)
- ✅ `refresh()` : Recharger depuis l'API

**Nouvelle interface** :
```
Entrée :
- serverFilters (optionnel) : Filtres à appliquer côté serveur (si vraiment nécessaire)
- viewId (optionnel) : Pour forcer rechargement au changement de vue

Sortie :
- interventions: InterventionView[] (TOUTES les interventions en mémoire)
- loading: boolean
- error: string | null
- totalCount: number
- refresh: () => Promise<void>
```

**Logique** :
1. Au mount : Charger TOUT via `interventionsApiV2.getAll({ limit: 10000 })`
2. Stocker en mémoire dans `interventions[]`
3. Au changement de `serverFilters` ou `viewId` : Recharger tout
4. `refresh()` : Vider et recharger

**Optimisation possible** :
- Si vraiment 6K interventions en 1 requête est trop lent, faire 2-3 requêtes en parallèle :
  - Batch 1 : interventions 1-2000
  - Batch 2 : interventions 2001-4000  
  - Batch 3 : interventions 4001-6200
  - Total : ~500-600ms au lieu de 1.5s

---

### 2️⃣ Supprimer la logique de pagination dans la page

**Fichier** : `app/interventions/page.tsx`  
**Lignes concernées** : 560-627

**Supprimer** :
- ❌ `hasMore`, `loadMore`, `direction`, `currentCursor` (retournés par le hook)
- ❌ `cursorRegistryRef`, `previousScopeKeyRef` (gestion historique cursors)
- ❌ Logs de performance `console.debug('[interventions] load')`
- ❌ Variables `fetchStartRef`, `previousLoadingRef`

**Garder** :
- ✅ `fetchedInterventions` du hook (toutes les interventions)
- ✅ `loading`, `error`, `refresh`
- ✅ `updateInterventionOptimistic` (mise à jour locale)

**Nouvelle logique de filtrage** :

Au lieu de `splitServerAndResidualFilters()` qui sépare serveur/client, **tout passer côté client** :

1. Hook charge TOUT : `useInterventions({ viewId: activeViewId })`
2. Page applique `view.filters` côté client via `runQuery()`
3. Page applique `view.sorts` côté client via `runQuery()`
4. Page applique search texte côté client
5. Passer le résultat final à `TableView`

**Fonction utilitaire à utiliser** :
```
runQuery(interventions, filters, sorts) → interventions filtrées/triées
```

Cette fonction existe déjà dans le code, il suffit de l'utiliser pour TOUT filtrer en mémoire.

---

### 3️⃣ Simplifier TableView

**Fichier** : `src/components/interventions/views/TableView.tsx`  
**Lignes concernées** : 414-478

**Supprimer** :
- ❌ Props : `hasMore`, `onEndReached`, `onStartReached` (plus de pagination)
- ❌ `useEffect` pour prefetch forward (lignes 414-448)
- ❌ `useEffect` pour prefetch backward (lignes 450-478)
- ❌ Refs : `loadMoreTriggerRef`, `loadPreviousTriggerRef`, `loadingRef`
- ❌ Calculs : `prefetchThreshold`, `criticalThreshold`, `shouldPrefetch`

**Garder** :
- ✅ `react-virtual` pour virtualisation DOM (lignes 401-409)
- ✅ Dataset passé en props (déjà filtré/trié par page.tsx)
- ✅ Rendu des lignes virtualisées

**Nouvelle logique** :
- TableView reçoit le dataset **complet et déjà filtré** depuis page.tsx
- react-virtual gère uniquement le rendu DOM optimisé (affiche 20-30 lignes sur 6K)
- Aucune logique de chargement, tout est déjà en mémoire

---

### 4️⃣ Simplifier l'API client

**Fichier** : `src/lib/supabase-api-v2.ts`  
**Fonction** : `interventionsApiV2.getAll()`  
**Lignes concernées** : 717-814

**Supprimer** :
- ❌ Paramètre `cursor` (InterventionCursor)
- ❌ Paramètre `direction` (CursorDirection)
- ❌ Logique de construction du cursor dans searchParams
- ❌ Retour de `cursorNext`, `cursorPrev`, `hasPrev` dans pagination
- ❌ Type `PaginatedResponse` avec cursors

**Garder** :
- ✅ Paramètre `limit` (pour charger tout d'un coup avec limit = 10000)
- ✅ Paramètres de filtres serveur (statut, agence, user, metier, dates, search)
- ✅ Paramètre `fields` (sélection colonnes)
- ✅ `mapInterventionRecord()` pour enrichir les données

**Nouvelle signature** :
```
Entrée :
- limit?: number (par défaut 10000)
- Filtres serveur (optionnels, si vraiment nécessaire)
- fields?: string[]

Sortie :
- data: InterventionView[] (toutes les interventions)
- total: number (égal à data.length)
```

**Logique simplifiée** :
1. Construire searchParams avec filtres + limit
2. Appeler edge function
3. Mapper chaque record via `mapInterventionRecord()`
4. Retourner { data, total }

Pas de pagination, pas de cursors, pas de `hasMore`.

---

### 5️⃣ Adapter l'edge function (optionnel)

**Fichier** : `supabase/functions/interventions-v2/index.ts`  
**Lignes concernées** : 120-800

**Option A : Garder le cursor** (au cas où, pour le futur)
- Laisser la logique cursor en place
- Le client appelle simplement avec `limit: 10000`
- L'edge function retourne tout en 1 seul bloc

**Option B : Simplifier aussi l'edge function**
- Supprimer toute la logique cursor (parseCursorParam, buildCursorCondition, createCursor)
- Supprimer le cache count avec TTL
- Garder uniquement : SELECT + filtres + ORDER BY + LIMIT

**Recommandation** : **Option A** (garder cursor au cas où)
- Si un jour vous avez 100K interventions, vous pourrez réactiver
- Pour l'instant, le client appelle juste avec limit élevé
- Pas de régression, juste simplification côté client

---

### 6️⃣ Gestion des filtres et tris

**Principe** : **Tout côté client en mémoire**

**Fichiers concernés** :
- `app/interventions/page.tsx` (lignes 220-392 : `splitServerAndResidualFilters`)
- Fonction utilitaire déjà existante : `runQuery(interventions, filters, sorts)`

**Nouvelle architecture** :

```
Hook charge TOUT
    ↓
interventions[] (6 200 items en mémoire)
    ↓
Page applique view.filters via runQuery() → filtré (ex: 53 items si filtre Market)
    ↓
Page applique view.sorts via runQuery() → trié
    ↓
Page applique search texte → searchedInterventions
    ↓
Passe à TableView → dataset complet et final
    ↓
react-virtual affiche 20-30 lignes DOM
```

**Suppression de `splitServerAndResidualFilters`** :
- Plus besoin de séparer serveur/client
- Tout est fait côté client en mémoire (< 5ms)
- Sauf si vous voulez garder certains filtres serveur pour réduire le dataset initial (optionnel)

**Avantages** :
- ✅ Filtres **instantanés** (pas de requête réseau)
- ✅ Tris **instantanés** (pas de requête réseau)
- ✅ Recherche **instantanée**
- ✅ Changement de vue **instantané**

---

## 🎯 Architecture cible finale

### Flux de données simplifié

```
┌─────────────────────────────────────────────────────────┐
│ 1. Edge Function (supabase/functions/interventions-v2) │
│                                                         │
│    GET /interventions?limit=10000                      │
│    - Jointures : artisans, costs, owner                │
│    - Retourne : { data: [6200 interventions] }         │
│    - Temps : ~1.5-2 secondes (acceptable)              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. API Client (src/lib/supabase-api-v2.ts)            │
│                                                         │
│    interventionsApiV2.getAll({ limit: 10000 })        │
│    - Filtre colonnes invalides (déjà fait)             │
│    - mapInterventionRecord() pour chaque item          │
│    - Retourne : { data: InterventionView[] }           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Hook useInterventions (src/hooks/)                  │
│                                                         │
│    SIMPLIFIÉ : ~80 lignes au lieu de 550               │
│    - useState interventions[] (6200 items)             │
│    - useEffect : charge tout au mount                  │
│    - Recharge au changement de viewId                  │
│    - Pas de cursors, pas de cache, pas de sliding     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Page (app/interventions/page.tsx)                  │
│                                                         │
│    FILTRAGE CLIENT :                                    │
│    - fetchedInterventions (6200 items du hook)         │
│    - Applique view.filters via runQuery()              │
│    - Applique view.sorts via runQuery()                │
│    - Applique search texte                             │
│    - Temps : < 5ms (instantané)                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. TableView (src/components/interventions/views/)    │
│                                                         │
│    - Reçoit dataset final (ex: 53 items filtrés)      │
│    - react-virtual pour virtualisation DOM             │
│    - Affiche 20-30 lignes sur les 53                  │
│    - Pas de onEndReached, pas de prefetch             │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Spécifications détaillées

### Hook useInterventions - Nouvelle interface

**Fichier** : `src/hooks/useInterventions.ts`

**Options d'entrée** :
```
{
  viewId?: string                    // ID de la vue active (force reload si change)
  autoLoad?: boolean                 // Par défaut true
  serverFilters?: {                  // Filtres optionnels côté serveur (pour réduire dataset initial)
    statut?: string | string[]
    agence?: string | string[]
    metier?: string | string[]
    user?: string | string[]
    startDate?: string
    endDate?: string
  }
}
```

**Retour** :
```
{
  interventions: InterventionView[]        // TOUTES les interventions en mémoire
  loading: boolean                         // État de chargement
  error: string | null                     // Erreur éventuelle
  totalCount: number                       // interventions.length
  refresh: () => Promise<void>             // Recharger depuis l'API
  updateInterventionOptimistic: (id, updates) => void  // Mise à jour locale
}
```

**Logique interne** :

1. **État minimal** :
   - `interventions[]` : Toutes les interventions
   - `loading` : Boolean
   - `error` : String ou null

2. **useEffect principal** :
   ```
   Dépendances : [viewId, JSON.stringify(serverFilters)]
   
   Actions :
   - setLoading(true)
   - Appeler interventionsApiV2.getAll({ limit: 10000, ...serverFilters })
   - setInterventions(result.data)
   - setLoading(false)
   ```

3. **fonction refresh()** :
   ```
   - Vider interventions[]
   - Appeler interventionsApiV2.getAll()
   - Recharger tout
   ```

4. **fonction updateInterventionOptimistic()** :
   ```
   - Trouver l'intervention par ID dans le tableau
   - Appliquer les modifications
   - Déclencher re-render
   ```

**Ce qui est supprimé** :
- Plus de cursors
- Plus de cache sessionStorage
- Plus de loadMore()
- Plus de fenêtre glissante
- Plus de direction forward/backward

---

### API Client - Simplification de getAll()

**Fichier** : `src/lib/supabase-api-v2.ts`  
**Fonction** : `interventionsApiV2.getAll()`  
**Lignes** : ~717-814

**Nouvelle signature** :
```
Entrée :
{
  limit?: number              // Par défaut 10000 (assez pour charger tout)
  statut?: FilterValue        // Filtres optionnels côté serveur
  agence?: FilterValue
  metier?: FilterValue
  user?: FilterValue
  startDate?: string
  endDate?: string
  search?: string
  fields?: string[]           // Colonnes à sélectionner
}

Sortie :
{
  data: InterventionView[]    // Interventions enrichies
  total: number               // Nombre retourné (= data.length)
}
```

**Logique simplifiée** :

1. Construire searchParams avec filtres + limit
2. Appeler `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions?${queryString}`
3. Recevoir la réponse brute
4. Pour chaque item : appeler `mapInterventionRecord(item, refs)`
5. Retourner `{ data: transformedData, total: transformedData.length }`

**Ce qui est supprimé** :
- Plus de gestion cursor dans searchParams
- Plus de direction dans searchParams
- Plus de retour pagination complexe avec hasMore/cursorNext/cursorPrev
- Type `PaginatedResponse` remplacé par type simple

**Ce qui est gardé** :
- `resolveSelectColumns(fields)` pour filtrer colonnes invalides
- `mapInterventionRecord()` pour enrichir les données
- Tous les mappings de colonnes déjà corrigés

---

### Page Interventions - Filtrage client

**Fichier** : `app/interventions/page.tsx`

**Suppression de la séparation serveur/client** :

Au lieu de `splitServerAndResidualFilters()` qui sépare les filtres, **tout appliquer côté client** :

1. **Hook simple** :
   ```
   useInterventions({ viewId: activeViewId })
   → Charge TOUT sans filtres serveur
   ```

2. **Filtrage client** :
   ```
   const filteredInterventions = useMemo(() => {
     return runQuery(fetchedInterventions, activeView.filters, activeView.sorts);
   }, [fetchedInterventions, activeView.filters, activeView.sorts]);
   ```

3. **Recherche texte** :
   ```
   const searchedInterventions = useMemo(() => {
     if (!search) return filteredInterventions;
     
     return filteredInterventions.filter(intervention => {
       const haystack = [
         intervention.contexteIntervention,
         intervention.nomClient,
         intervention.prenomClient,
         intervention.commentaireAgent
       ].join(' ').toLowerCase();
       
       return haystack.includes(search.toLowerCase());
     });
   }, [filteredInterventions, search]);
   ```

4. **Passer à TableView** :
   ```
   <TableView
     interventions={searchedInterventions}  // Dataset final
     loading={loading}
     error={error}
     // Plus de hasMore, onEndReached, etc.
   />
   ```

**Avantages** :
- ✅ Filtres **instantanés** (< 5ms)
- ✅ Code **simple et lisible**
- ✅ Facile à débuguer
- ✅ Pas de désynchronisation serveur/client

**Option si vraiment nécessaire** :
Si certains filtres lourds (ex: recherche texte complexe) ralentissent le client, les garder côté serveur :
```
useInterventions({ 
  viewId: activeViewId,
  serverFilters: { search }  // Seulement la recherche côté serveur
})
```

---

### TableView - Suppression pagination

**Fichier** : `src/components/interventions/views/TableView.tsx`

**Modifications** :

1. **Props interface** (lignes 93-113) :
   ```
   Supprimer :
   - hasMore?: boolean
   - onEndReached?: () => void
   - onStartReached?: () => void
   - loadingProgress?: { ... }
   
   Garder :
   - interventions: InterventionEntity[]  (dataset complet filtré)
   - loading: boolean
   - error: string | null
   - totalCount?: number
   - Tout le reste (onInterventionClick, etc.)
   ```

2. **Logique interne** (lignes 330-478) :
   ```
   Supprimer :
   - dataset = interventions (déjà fait, ligne 334) ✅
   - Tous les useEffect de prefetch (lignes 414-478)
   - Refs : loadMoreTriggerRef, loadPreviousTriggerRef, loadingRef
   
   Garder :
   - react-virtual pour virtualisation
   - Rendu des lignes
   - Expansion de lignes, reminders, etc.
   ```

3. **Indicateur de position** (optionnel) :
   ```
   Garder l'indicateur "Lignes 1-30 sur 53" en bas
   Mais supprimer la barre de progression (plus de chargement)
   ```

---

### Configuration - Simplification

**Fichier** : `src/config/interventions.ts`  
**Lignes** : 222-235

**Supprimer de SCROLL_CONFIG** :
- ❌ `SLIDING_WINDOW_ENABLED`
- ❌ `MAX_CACHED_ITEMS`
- ❌ `BATCH_SIZE`
- ❌ `INITIAL_BATCH_SIZE`
- ❌ `PREFETCH_THRESHOLD`
- ❌ `CRITICAL_THRESHOLD`
- ❌ `CACHE_TTL_MS`
- ❌ `MAX_CACHE_ENTRIES`

**Garder** :
- ✅ `OVERSCAN` (pour react-virtual)
- ✅ `SHOW_POSITION_THRESHOLD` (indicateur de position)
- ✅ `CLIENT_FILTER_WARNING_THRESHOLD` (si dataset trop grand)
- ✅ `LARGE_DATASET_THRESHOLD` (pour warnings)

**Nouveau SCROLL_CONFIG** :
```
{
  OVERSCAN: 15,                              // Lignes hors écran à pré-rendre
  SHOW_POSITION_THRESHOLD: 200,              // Afficher "ligne X sur Y" si > 200
  CLIENT_FILTER_WARNING_THRESHOLD: 50000,    // Warn si filtrage client > 50K
  LARGE_DATASET_THRESHOLD: 10000,            // Considéré "large" si > 10K
}
```

---

## 🚀 Avantages de la simplification

### Performance

| Opération | Avant (cursor) | Après (load all) | Gain |
|-----------|----------------|------------------|------|
| **Premier chargement** | 150ms (50 items) | 1.5s (6200 items) | -1.35s |
| **Scroll complet** | 9.3s (62 requêtes) | 0ms (déjà en mémoire) | **+9.3s** 🏆 |
| **Filtre statut** | 150ms (réseau) | < 5ms (mémoire) | **+145ms** 🏆 |
| **Tri par date** | 150ms (réseau) | < 5ms (mémoire) | **+145ms** 🏆 |
| **Recherche texte** | 200ms (réseau) | < 10ms (mémoire) | **+190ms** 🏆 |
| **Changement de vue** | 150ms (cache/réseau) | 0ms (mémoire) | **+150ms** 🏆 |

**Bilan** :
- ⚠️ Premier load : **-1.35s** (un peu plus lent)
- ✅ Toutes les actions suivantes : **instantanées** (+9s cumulé)

### Complexité du code

| Fichier | Avant | Après | Réduction |
|---------|-------|-------|-----------|
| `useInterventions.ts` | 550 lignes | ~80 lignes | **-85%** 🏆 |
| `page.tsx` (pagination) | 150 lignes | ~30 lignes | **-80%** 🏆 |
| `TableView.tsx` (prefetch) | 80 lignes | 0 lignes | **-100%** 🏆 |
| **Total** | ~780 lignes | ~110 lignes | **-86%** 🏆 |

### Bugs

| Type | Avant | Après |
|------|-------|-------|
| Bugs corrigés | 5 bugs majeurs | 0 (code simple) |
| Risque de régression | Élevé | Très faible |
| Temps de debug | 3 heures | 0 heure |

---

## ⚠️ Considérations

### Quand cette approche N'est PAS recommandée

- ❌ Dataset > **50 000** interventions (trop lourd pour la mémoire)
- ❌ Données temps réel avec WebSocket (cache obsolète rapidement)
- ❌ Application mobile avec contraintes RAM strictes
- ❌ Filtres très complexes côté serveur (ex: full-text search PostgreSQL)

### Quand cette approche EST recommandée (votre cas)

- ✅ Dataset < **10 000** interventions (**6 200 dans votre cas**)
- ✅ Données relativement stables (pas de temps réel)
- ✅ Application web desktop (RAM abondante)
- ✅ Priorité : **simplicité et fiabilité**

---

## 📦 Livrables attendus

### Code modifié

1. **`src/hooks/useInterventions.ts`**
   - Suppression : cursors, cache, sliding window, loadMore, direction
   - Conservation : interventions[], loading, error, refresh
   - Réduction : 550 → ~80 lignes

2. **`src/lib/supabase-api-v2.ts`**
   - Suppression : cursor params, PaginatedResponse avec cursors
   - Conservation : filtres, mapInterventionRecord, enrichissement
   - Simplification : getAll() retourne { data, total } au lieu de pagination complexe

3. **`app/interventions/page.tsx`**
   - Suppression : cursorRegistry, fetchStart tracking, hasMore, loadMore
   - Modification : Filtrage 100% client via runQuery()
   - Simplification : Flux linéaire interventions → filtrées → triées → searchées → vue

4. **`src/components/interventions/views/TableView.tsx`**
   - Suppression : Props hasMore, onEndReached, onStartReached, loadingProgress
   - Suppression : useEffect prefetch forward/backward
   - Conservation : react-virtual, rendu des lignes
   - Réduction : Props simplifiées, pas de logique de pagination

5. **`src/config/interventions.ts`**
   - Suppression : Toutes les configs de pagination/cache
   - Conservation : OVERSCAN, thresholds d'affichage

### Documentation

1. **`docs/livrable-2025-11-04/SIMPLIFICATION_LOAD_ALL.md`**
   - Justification de la simplification
   - Comparatif performances Angular vs cursor vs load-all
   - Guide de migration

2. **Mise à jour `RESOLUTION_FINALE_SCROLL_INFINI.md`**
   - Ajouter section "Simplification post-correction"
   - Expliquer le choix architectural final

### Tests

1. **Chargement initial** :
   - Vérifier : 6200 interventions chargées en ~1.5-2s
   - Vérifier : Artisans et coûts présents

2. **Filtres** :
   - Appliquer filtre statut → Instantané (< 5ms)
   - Appliquer filtre user → Instantané
   - Vérifier : Aucune requête réseau

3. **Tri** :
   - Changer tri → Instantané (< 5ms)
   - Vérifier : Aucune requête réseau

4. **Recherche** :
   - Taper dans la barre de recherche → Instantané
   - Vérifier : Aucune requête réseau

5. **Changement de vue** :
   - Market → Liste générale → Market → Instantané
   - Vérifier : Aucune requête sauf au premier load

6. **Scroll** :
   - Scroller de haut en bas → Fluide
   - Vérifier : react-virtual affiche 20-30 lignes DOM sur 6200

---

## 🎯 Résultat attendu

**Architecture finale** :
- ✅ **Simple** : ~110 lignes au lieu de 780
- ✅ **Rapide** : Toutes les actions instantanées après le premier load
- ✅ **Fiable** : Pas de bugs de pagination
- ✅ **Maintenable** : Facile à comprendre et débuguer

**UX cible** :
- Premier chargement : 1.5-2s (acceptable, 1 fois)
- Filtres : **< 5ms** (instantané) 🏆
- Tris : **< 5ms** (instantané) 🏆
- Recherche : **< 10ms** (instantané) 🏆
- Changement de vue : **0ms** (déjà en mémoire) 🏆
- Scroll : **Fluide** (react-virtual)

**Exactement comme Angular**, mais en Next.js/React.

---

## ⚡ Quick Wins (si vous gardez cursor)

Si vous ne voulez PAS simplifier tout de suite, voici des optimisations rapides :

### 1. Augmenter BATCH_SIZE
```bash
# .env.local
NEXT_PUBLIC_BATCH_SIZE=500  # Au lieu de 100
```
**Impact** : 62 requêtes → 13 requêtes (comme Angular)

### 2. Désactiver sliding window
```bash
NEXT_PUBLIC_SLIDING_WINDOW_ENABLED=false
```
**Impact** : Garde tout en mémoire, pas de truncation

### 3. Pré-charger 3-4 batchs au démarrage
Dans `useInterventions.ts` :
```
Au mount :
- Batch 1 : 500 interventions
- Batch 2-3 : en arrière-plan
- Total : 1500 interventions disponibles immédiatement
```

**Impact** : 80% des cas couverts sans requête supplémentaire

---

## 🤔 Ma recommandation finale

**SIMPLIFIER RADICALEMENT** (approche load-all)

**Pourquoi ?**
1. Votre dataset (6K) ne justifie PAS la complexité actuelle
2. Les utilisateurs préfèrent **1.5s de load** puis **tout instantané**
3. Moins de code = moins de bugs = moins de maintenance
4. Performance égale ou meilleure qu'Angular

**Si un jour** vous avez 100K interventions, vous pourrez **toujours** :
- Revenir à cursor-pagination
- Ajouter un vrai système de cache
- Implémenter la sliding window

Mais pour l'instant, **KISS** : Keep It Simple.

---

**Voulez-vous que je procède à la simplification complète ?** 🚀

