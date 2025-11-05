# 🎯 MISSION : Finalisation de l'optimisation des interventions

## 📋 Contexte

Tu as déjà effectué un excellent travail d'optimisation en :
- ✅ Remplaçant `useProgressiveLoad` par `useInterventions` avec pagination serveur
- ✅ Créant un mapper serveur/client pour les filtres (`deriveServerQueryConfig`)
- ✅ Implémentant l'infinite scroll dans TableView
- ✅ Ajoutant `getDistinctInterventionValues` pour les filtres de colonnes
- ✅ Réduisant l'overscan de 10 à 5

**Résultat actuel** : Gain de performance estimé à 85%, mais le build TypeScript échoue.

---

## 🚨 PHASE 1 : ERREURS TYPESCRIPT (CRITIQUE - À FAIRE EN PRIORITÉ)

### Problème 1 : DropdownMenuSubContent - Propriété `align` invalide

**Fichiers concernés** :
- `app/interventions/page.tsx` (4 occurrences : lignes 1099, 1142, 1184, 1410)
- `src/components/interventions/views/ViewTabs.tsx` (1 occurrence : ligne 290)

**Erreur** :
```
Property 'align' does not exist on type 'IntrinsicAttributes & Omit<DropdownMenuSubContentProps...
```

**Solution** :
```typescript
// ❌ AVANT
<DropdownMenuSubContent align="end" className="w-64">
  {children}
</DropdownMenuSubContent>

// ✅ APRÈS
<DropdownMenuSubContent side="right" className="w-64">
  {children}
</DropdownMenuSubContent>
```

**Action** : Remplacer **toutes** les occurrences de `align="end"` par `side="right"` dans `DropdownMenuSubContent`.

---

### Problème 2 : Callbacks potentiellement undefined

**Fichiers concernés** :
- `src/components/interventions/views/ViewTabs.tsx` (lignes 272, 273, 275, 281, 320)

**Erreur** :
```
Cannot invoke an object which is possibly 'undefined'.
```

**Solution** :
```typescript
// ❌ AVANT
onRenameView(view.id)
onDuplicateView(view.id)
onDeleteView(view.id)
onResetDefault(view.id)
onConfigureColumns(view.id)

// ✅ APRÈS
onRenameView?.(view.id)
onDuplicateView?.(view.id)
onDeleteView?.(view.id)
onResetDefault?.(view.id)
onConfigureColumns?.(view.id)
```

**Action** : Ajouter l'optional chaining `?.` à tous les appels de callbacks dans ViewTabs.

---

### Problème 3 : Propriétés manquantes dans InterventionView

**Fichiers concernés** :
- `src/features/interventions/components/InterventionCard.tsx`
- `src/features/interventions/components/InterventionDetailCard.tsx`

**Erreurs** :
```
Property 'sousStatutText' does not exist on type 'InterventionView'
Property 'sousStatutTextColor' does not exist on type 'InterventionView'
Property 'demandeIntervention' does not exist on type 'InterventionView'
Property 'marge' does not exist on type 'Intervention'
Property 'coutIntervention' does not exist on type 'Intervention'
```

**Solution** : Étendre le type `InterventionView` dans `src/types/intervention-view.ts` :

```typescript
export type InterventionView = {
  // ... tous les champs existants ...
  
  // ✅ Ajouter ces propriétés manquantes
  sousStatutText?: string | null
  sousStatutTextColor?: string | null
  demandeIntervention?: string | null
  
  // Propriétés financières (si pas déjà présentes)
  marge?: number | null
  coutIntervention?: number | null
  coutSST?: number | null
  coutMateriel?: number | null
}
```

**Alternative** : Si ces propriétés ne devraient pas exister, corriger les composants pour utiliser les bonnes propriétés :

```typescript
// Dans InterventionCard.tsx
// ❌ AVANT
intervention.demandeIntervention

// ✅ APRÈS
intervention.dateIntervention
```

---

### Problème 4 : Type 'null' non assignable à 'string | undefined'

**Fichiers concernés** :
- `src/features/interventions/components/InterventionCard.tsx` (lignes 195, 196)

**Solution** :
```typescript
// ❌ AVANT
const value: string | undefined = intervention.someField  // someField est string | null | undefined

// ✅ APRÈS
const value: string | undefined = intervention.someField ?? undefined
```

---

### Problème 5 : Erreurs geocode (pré-existantes, non bloquantes pour cette feature)

**Fichier** : `app/api/geocode/route.ts`

**Options** :
1. **Ignorer temporairement** (ajouter `// @ts-ignore` si non critique)
2. **Fixer** en rendant `label` et `precision` non-optionnels

```typescript
// Solution rapide
const results: InternalGeocodeResult[] = data.map(item => ({
  lat: item.lat,
  lng: item.lon,
  precision: item.type ?? 'unknown',
  label: item.display_name ?? '',
  provider: 'nominatim' as const
}))
```

---

### Problème 6 : RefObject null

**Fichier** : `src/components/ui/intervention-modal/NewInterventionModalContent.tsx` (ligne 94)

**Solution** :
```typescript
// ❌ AVANT
const formRef = useRef<HTMLFormElement | null>(null)

// ✅ APRÈS
const formRef = useRef<HTMLFormElement>(null!)
// OU
const formRef = useRef<HTMLFormElement | null>(null)
// et gérer le null dans l'utilisation
```

---

## 🔧 PHASE 2 : VÉRIFICATION ET VALIDATION

### Étape 1 : Vérifier le typecheck
```bash
npm run typecheck
```

**Attendu** : ✅ Aucune erreur TypeScript

### Étape 2 : Tester l'application manuellement

1. **Test de base** :
   - Charger la page `/interventions`
   - Vérifier que les 50 premières interventions se chargent rapidement (< 1s)
   - Vérifier l'indicateur de progression

2. **Test infinite scroll** :
   - Scroller jusqu'en bas du tableau
   - Vérifier que les 50 interventions suivantes se chargent automatiquement
   - Répéter 3-4 fois pour atteindre ~200 interventions

3. **Test filtres** :
   - Ouvrir un filtre de colonne (ex: Statut)
   - Vérifier que le loading "Loading..." apparaît brièvement
   - Vérifier que les options se chargent via `getDistinctInterventionValues`
   - Sélectionner un filtre et vérifier que les résultats sont corrects

4. **Test tri** :
   - Changer le tri (date croissante/décroissante)
   - Vérifier que les données sont retriées côté serveur
   - Vérifier que les interventions déjà chargées sont effacées et rechargées

5. **Test recherche** :
   - Taper dans la barre de recherche
   - Vérifier le debounce de 300ms (pas de requête immédiate)
   - Vérifier que la recherche filtre correctement

---

## 🚀 PHASE 3 : OPTIMISATIONS SUPPLÉMENTAIRES (OPTIONNEL MAIS RECOMMANDÉ)

### A. Memoization des cellules du tableau

**Fichier** : `src/components/interventions/views/TableView.tsx`

**Problème** : Chaque cellule se re-render même si sa valeur n'a pas changé.

**Solution** :
```typescript
// Créer un composant memoized pour les cellules
const MemoizedTableCell = React.memo<{
  intervention: InterventionEntity
  property: string
  schema: PropertySchema
  columnStyle?: TableColumnStyle
  alignment?: TableColumnAlignment
  onInterventionClick?: (id: string) => void
}>(({ intervention, property, schema, columnStyle, alignment, onInterventionClick }) => {
  const cell = renderCellContent(
    intervention,
    property,
    schema,
    themeMode,
    columnStyle,
    alignment,
  )
  
  return (
    <TableCell
      className={cn(densityCellClass, cell.cellClassName)}
      style={{
        backgroundColor: cell.backgroundColor,
        color: cell.defaultTextColor,
      }}
      onClick={() => onInterventionClick?.(intervention.id)}
    >
      {cell.content}
    </TableCell>
  )
}, (prev, next) => {
  // Ne re-render que si l'intervention ou la propriété a changé
  if (prev.intervention.id !== next.intervention.id) return false
  
  const prevValue = getPropertyValue(prev.intervention, prev.property)
  const nextValue = getPropertyValue(next.intervention, next.property)
  
  return prevValue === nextValue && 
         prev.property === next.property &&
         prev.columnStyle === next.columnStyle &&
         prev.alignment === next.alignment
})

// Utiliser dans le rendu
{visibleProperties.map((property) => (
  <MemoizedTableCell
    key={property}
    intervention={intervention}
    property={property}
    schema={getPropertySchema(property)}
    columnStyle={columnStyles[property]}
    alignment={columnAlignment[property]}
    onInterventionClick={onInterventionClick}
  />
))}
```

**Impact attendu** : Réduction de 30-40% des re-renders lors du scroll.

---

### B. useDeferredValue pour la recherche

**Fichier** : `app/interventions/page.tsx`

**Problème** : La recherche bloque le thread principal pendant la filtration.

**Solution** :
```typescript
import { useDeferredValue } from 'react'

// Dans le composant
const [search, setSearch] = useState("")
const deferredSearch = useDeferredValue(search)  // ✅ Ajouter

// Modifier searchedInterventions pour utiliser deferredSearch
const searchedInterventions = useMemo(() => {
  const term = deferredSearch.trim().toLowerCase()  // ✅ Utiliser deferredSearch au lieu de search
  if (!term) return serverAppliedInterventions
  return serverAppliedInterventions.filter((intervention) => {
    const haystack = [
      intervention.contexteIntervention,
      intervention.nomClient,
      intervention.prenomClient,
      intervention.commentaireAgent,
    ]
      .map((value) => (value || "").toLowerCase())
      .join(" ")
    return haystack.includes(term)
  })
}, [deferredSearch, serverAppliedInterventions])  // ✅ deferredSearch dans les deps
```

**Impact attendu** : UI reste responsive pendant la recherche, pas de freeze.

---

### C. Prefetch intelligent

**Fichier** : `app/interventions/page.tsx`

**Problème** : L'utilisateur doit attendre d'atteindre la fin pour charger plus.

**Solution** :
```typescript
// Ajouter un useEffect pour prefetch à 70%
useEffect(() => {
  if (!hasMore || searchedInterventions.length === 0) return
  
  // Calculer si on est proche de la fin (70% du dataset visible)
  const threshold = Math.floor(searchedInterventions.length * 0.7)
  const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? 0
  
  if (lastVisibleIndex >= threshold) {
    // Prefetch silencieux
    loadMore().catch(err => {
      console.warn('Prefetch failed:', err)
    })
  }
}, [virtualItems, searchedInterventions.length, hasMore, loadMore])
```

**Impact attendu** : Scroll infini "sans fin", aucune attente visible.

---

## 📊 PHASE 4 : MONITORING (IMPORTANT POUR VALIDER LE GAIN)

### A. Ajouter des mesures de performance

**Fichier** : `src/lib/performance-monitor.ts` (nouveau fichier)

```typescript
export class QueryPerformanceMonitor {
  private startTime: number
  private queryName: string
  
  constructor(queryName: string) {
    this.queryName = queryName
    this.startTime = performance.now()
  }
  
  end(): number {
    const duration = performance.now() - this.startTime
    
    // Logger si > 1s
    if (duration > 1000) {
      console.warn(`⚠️ Slow query [${this.queryName}]: ${duration.toFixed(2)}ms`)
    } else if (duration > 500) {
      console.info(`ℹ️ Moderate query [${this.queryName}]: ${duration.toFixed(2)}ms`)
    } else {
      console.log(`✅ Fast query [${this.queryName}]: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
}

export function measureQuery(name: string) {
  return new QueryPerformanceMonitor(name)
}
```

**Utilisation dans `page.tsx`** :
```typescript
import { measureQuery } from '@/lib/performance-monitor'

// Dans l'effect qui appelle setRemoteQuery
useEffect(() => {
  // ...
  if (nextQueryKey !== previousQueryKey) {
    const perf = measureQuery('Remote query update')
    setRemoteQuery({
      filters: nextServerFilters,
      sortBy: nextServerSort?.property,
      sortDir: nextServerSort?.direction,
    })
    // Le perf.end() sera appelé quand les données arrivent
  }
}, [activeView, isReady, ...])
```

---

### B. Ajouter un indicateur de performance dans l'UI

**Fichier** : `app/interventions/page.tsx`

```typescript
// Ajouter après le renderActiveView()
{process.env.NODE_ENV === 'development' && (
  <div className="fixed bottom-4 right-4 bg-background/90 border rounded-lg p-3 text-xs space-y-1 shadow-lg">
    <div className="font-semibold text-muted-foreground">Performance</div>
    <div>Loaded: {searchedInterventions.length} / {totalCount ?? '?'}</div>
    <div>Loading: {remoteLoading ? 'Yes' : 'No'}</div>
    <div>Has more: {hasMore ? 'Yes' : 'No'}</div>
    <div>Progress: {loadingProgress.progress.toFixed(1)}%</div>
    {remoteLoading && (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Fetching...</span>
      </div>
    )}
  </div>
)}
```

---

## ✅ PHASE 5 : TESTS UNITAIRES (POUR GARANTIR LA QUALITÉ)

### Test 1 : deriveServerQueryConfig

**Fichier** : `tests/unit/interventions-query-mapper.test.ts` (nouveau)

```typescript
import { describe, it, expect } from 'vitest'

// Copier la fonction deriveServerQueryConfig ou l'exporter depuis page.tsx
import { deriveServerQueryConfig } from '@/app/interventions/page'

describe('deriveServerQueryConfig', () => {
  it('should map single status filter to server', () => {
    const view = {
      filters: [{ property: 'statusValue', operator: 'eq', value: 'DEMANDE' }],
      sorts: []
    }
    const { serverFilters, residualFilters } = deriveServerQueryConfig(view)
    
    expect(serverFilters.statut).toBe('DEMANDE')
    expect(residualFilters).toHaveLength(0)
  })
  
  it('should map array status filter to server', () => {
    const view = {
      filters: [{ 
        property: 'statusValue', 
        operator: 'in', 
        value: ['DEMANDE', 'ACCEPTE', 'EN_COURS'] 
      }],
      sorts: []
    }
    const { serverFilters } = deriveServerQueryConfig(view)
    
    expect(serverFilters.statut).toEqual(['DEMANDE', 'ACCEPTE', 'EN_COURS'])
  })
  
  it('should map user filter to server', () => {
    const view = {
      filters: [{ property: 'attribueA', operator: 'eq', value: 'user-123' }],
      sorts: []
    }
    const { serverFilters } = deriveServerQueryConfig(view)
    
    expect(serverFilters.user).toBe('user-123')
  })
  
  it('should map date range filter to server', () => {
    const view = {
      filters: [{
        property: 'dateIntervention',
        operator: 'between',
        value: { from: '2024-01-01', to: '2024-12-31' }
      }],
      sorts: []
    }
    const { serverFilters } = deriveServerQueryConfig(view)
    
    expect(serverFilters.startDate).toBe('2024-01-01T00:00:00.000Z')
    expect(serverFilters.endDate).toBe('2024-12-31T00:00:00.000Z')
  })
  
  it('should keep unsupported filters in residual', () => {
    const view = {
      filters: [
        { property: 'statusValue', operator: 'eq', value: 'DEMANDE' },
        { property: 'marge', operator: 'gt', value: 100 }  // Non supporté
      ],
      sorts: []
    }
    const { serverFilters, residualFilters } = deriveServerQueryConfig(view)
    
    expect(serverFilters.statut).toBe('DEMANDE')
    expect(residualFilters).toHaveLength(1)
    expect(residualFilters[0].property).toBe('marge')
  })
  
  it('should map supported sort to server', () => {
    const view = {
      filters: [],
      sorts: [{ property: 'dateIntervention', direction: 'desc' }]
    }
    const { serverSort, residualSorts } = deriveServerQueryConfig(view)
    
    expect(serverSort).toEqual({ property: 'dateIntervention', direction: 'desc' })
    expect(residualSorts).toHaveLength(0)
  })
  
  it('should keep unsupported sort in residual', () => {
    const view = {
      filters: [],
      sorts: [{ property: 'unknownField', direction: 'asc' }]
    }
    const { serverSort, residualSorts } = deriveServerQueryConfig(view)
    
    expect(serverSort).toBeUndefined()
    expect(residualSorts).toHaveLength(1)
  })
})
```

---

### Test 2 : getDistinctInterventionValues

**Fichier** : `tests/unit/interventions-api-distinct.test.ts` (nouveau)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDistinctInterventionValues } from '@/lib/supabase-api-v2'
import { supabase } from '@/lib/supabase-client'

vi.mock('@/lib/supabase-client')

describe('getDistinctInterventionValues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('should fetch distinct values for a property', async () => {
    const mockData = [
      { statut_id: 'status-1' },
      { statut_id: 'status-2' },
      { statut_id: 'status-1' },  // Doublon
    ]
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)
    
    const result = await getDistinctInterventionValues('statusValue')
    
    expect(result).toEqual(['status-1', 'status-2'])
    expect(supabase.from).toHaveBeenCalledWith('interventions')
  })
  
  it('should apply filters when fetching distinct values', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)
    
    await getDistinctInterventionValues('attribueA', {
      statut: 'DEMANDE'
    })
    
    expect(mockQuery.eq).toHaveBeenCalledWith('statut_id', 'DEMANDE')
  })
})
```

---

## 📝 CHECKLIST FINALE

### Phase 1 : TypeScript (CRITIQUE)
- [ ] Remplacer `align="end"` par `side="right"` dans tous les `DropdownMenuSubContent`
- [ ] Ajouter `?.` aux callbacks dans `ViewTabs.tsx`
- [ ] Étendre `InterventionView` avec propriétés manquantes OU corriger les composants
- [ ] Fixer les types `null` non assignables
- [ ] `npm run typecheck` passe sans erreur ✅

### Phase 2 : Tests manuels
- [ ] Page `/interventions` charge rapidement (< 1s)
- [ ] Infinite scroll fonctionne (scroll → charge 50 items)
- [ ] Filtres de colonnes chargent via `getDistinctInterventionValues`
- [ ] Tri fonctionne côté serveur (reset + reload)
- [ ] Recherche avec debounce de 300ms

### Phase 3 : Optimisations (OPTIONNEL)
- [ ] Memoization des cellules implémentée
- [ ] `useDeferredValue` pour la recherche
- [ ] Prefetch à 70% du scroll
- [ ] Monitoring de performance ajouté
- [ ] Indicateur de perf en dev mode

### Phase 4 : Tests unitaires (RECOMMANDÉ)
- [ ] Tests pour `deriveServerQueryConfig`
- [ ] Tests pour `getDistinctInterventionValues`
- [ ] `npm run test` passe ✅

### Phase 5 : Migration DB (DÉJÀ CRÉÉE)
- [ ] Vérifier que `20251024_add_intervention_indexes.sql` existe
- [ ] Appliquer la migration si pas encore fait
- [ ] Vérifier les index avec `EXPLAIN ANALYZE`

---

## 🎯 OBJECTIFS DE SUCCÈS

### Performance
- ✅ Chargement initial < 1s (vs 5-10s avant)
- ✅ Scroll fluide à 60 FPS
- ✅ Pas de freeze lors de la recherche
- ✅ Filtres de colonnes chargent en < 500ms
- ✅ Support de 10k+ interventions sans ralentissement

### Qualité
- ✅ Aucune erreur TypeScript
- ✅ Tous les tests passent
- ✅ Pas de régression fonctionnelle
- ✅ Code propre et maintenable

### UX
- ✅ Infinite scroll transparent
- ✅ Indicateurs de chargement clairs
- ✅ Filtres réactifs
- ✅ Recherche instantanée (perçue)

---

## 📚 RÉFÉRENCES

- Architecture actuelle : `docs/API_CRM_COMPLETE.md`
- Guide agents : `AGENTS.md`
- Types interventions : `src/types/intervention-view.ts`
- Hook principal : `src/hooks/useInterventions.ts`
- API V2 : `src/lib/supabase-api-v2.ts`
- Migration indexes : `supabase/migrations/20251024_add_intervention_indexes.sql`

---

## 💬 NOTES IMPORTANTES

1. **Ne pas toucher à l'API V2 existante** - Elle fonctionne déjà très bien
2. **Privilégier les fix TypeScript** - C'est bloquant pour le build
3. **Les optimisations React sont optionnelles** - À faire si tu as le temps
4. **La migration DB existe déjà** - Vérifie juste qu'elle est appliquée
5. **Tester sur de vraies données** - Utiliser une DB de dev avec 1000+ interventions

---

## ✨ BONNE CHANCE !

Tu as fait un excellent travail jusqu'ici. Cette phase finale va stabiliser et peaufiner l'implémentation. Fais-moi signe si tu as besoin de clarifications !




