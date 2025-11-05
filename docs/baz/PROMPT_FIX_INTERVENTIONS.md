# 🔧 PROMPT : Fix interventions qui ne s'affichent pas

**Copier-coller ce prompt pour corriger le problème**

---

## 🎯 Le problème

Les interventions ne s'affichent plus. Le problème vient probablement du **nom de la foreign key** utilisé dans le JOIN.

---

## ✅ SOLUTION 1 : Utiliser la syntaxe correcte du JOIN

Le JOIN PostgreSQL via Supabase a 3 syntaxes possibles :

### Option A : JOIN avec nom de colonne (RECOMMANDÉ)

```typescript
// src/lib/api/v2/interventionsApi.ts ligne 84

// Remplacer :
status:intervention_statuses!statut_id (

// Par :
status:intervention_statuses(statut_id) (
```

### Option B : JOIN avec nom de FK explicite

Si l'option A ne fonctionne pas, utiliser le nom exact de la FK.

**Étape 1** : Trouver le nom de la FK dans Supabase Dashboard

1. Allez dans Supabase Dashboard
2. Table Editor → `interventions`
3. Onglet "Relationships"
4. Cherchez la FK vers `intervention_statuses`
5. Notez le nom exact (ex: `interventions_statut_id_fkey`)

**Étape 2** : Utiliser ce nom

```typescript
// Remplacer :
status:intervention_statuses!statut_id (

// Par (adaptez le nom) :
status:intervention_statuses!interventions_statut_id_fkey (
```

### Option C : LEFT JOIN explicite

```typescript
// Si les options A et B ne fonctionnent pas
status:intervention_statuses!left(statut_id) (
```

---

## 🔧 CORRECTION COMPLÈTE

### Fichier 1 : `src/lib/api/v2/interventionsApi.ts`

Remplacer **3 occurrences** du JOIN :

#### Occurrence 1 : getAll() (ligne ~84)

```typescript
async getAll(params?: InterventionQueryParams): Promise<PaginatedResponse<InterventionWithStatus>> {
  let query = supabase
    .from("interventions")
    .select(
      `
        *,
        status:intervention_statuses(statut_id) (
          id,
          code,
          label,
          color,
          sort_order
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });
  
  // ... reste du code inchangé
```

#### Occurrence 2 : getById() (ligne ~148)

```typescript
async getById(id: string, include?: string[]): Promise<InterventionWithStatus> {
  const { data, error } = await supabase
    .from("interventions")
    .select(`
      *,
      status:intervention_statuses(statut_id) (
        id,
        code,
        label,
        color,
        sort_order
      ),
      tenants (
        id,
        firstname,
        lastname,
        email,
        telephone,
        telephone2,
        adresse,
        ville,
        code_postal
      ),
      // ... reste inchangé
```

#### Occurrence 3 : update() (ligne ~242)

```typescript
async update(id: string, data: UpdateInterventionData): Promise<InterventionWithStatus> {
  const { data: updated, error } = await supabase
    .from("interventions")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`
      *,
      status:intervention_statuses(statut_id) (
        id,
        code,
        label,
        color,
        sort_order
      )
    `)
    .single();
  
  // ... reste inchangé
```

---

## 🧪 TEST : Vérifier que ça fonctionne

### Test 1 : Dans la console du navigateur

```javascript
// Ouvrir la console (F12)
// Recharger la page
// Chercher ces logs :

🚀 interventionsApi.getAll called with params: {...}
📊 Query result: {
  dataLength: 1000,
  error: null,
  count: 6276,
  firstItemHasStatus: { id: "...", code: "DEMANDE", label: "Demandé", ... }
}
```

Si vous voyez `firstItemHasStatus: null` → le JOIN ne fonctionne toujours pas.

### Test 2 : Dans Supabase SQL Editor

```sql
-- Tester directement le JOIN
SELECT 
  i.id,
  i.statut_id,
  s.label as status_label,
  s.color as status_color
FROM interventions i
LEFT JOIN intervention_statuses s ON s.id = i.statut_id
WHERE i.statut_id IS NOT NULL
LIMIT 5;
```

**Attendu** : Vous devez voir les labels et couleurs des statuts.

### Test 3 : API directement

Dans votre terminal :

```bash
# Test de l'API
curl "http://127.0.0.1:54321/rest/v1/interventions?select=*,status:intervention_statuses(statut_id)(id,code,label,color)&limit=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 🐛 Si ça ne fonctionne toujours pas

### Debug étape par étape

#### Étape 1 : Vérifier que la table existe

```sql
SELECT COUNT(*) FROM interventions;
-- Attendu : 6276
```

#### Étape 2 : Vérifier que statut_id existe

```sql
SELECT statut_id FROM interventions WHERE statut_id IS NOT NULL LIMIT 5;
-- Attendu : Des UUIDs
```

#### Étape 3 : Vérifier que les statuts existent

```sql
SELECT * FROM intervention_statuses LIMIT 5;
-- Attendu : 11 statuts
```

#### Étape 4 : Vérifier la FK

```sql
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='interventions'
  AND kcu.column_name = 'statut_id';
```

**Notez le `constraint_name`** retourné et utilisez-le dans le JOIN.

---

## 🔄 SOLUTION ALTERNATIVE : Sans JOIN

Si le JOIN ne fonctionne vraiment pas, utiliser le cache de référence uniquement :

```typescript
async getAll(params?: InterventionQueryParams): Promise<PaginatedResponse<InterventionWithStatus>> {
  // SELECT simple SANS JOIN
  let query = supabase
    .from("interventions")
    .select("*", { count: "exact" })  // ⚠️ PAS de JOIN
    .order("created_at", { ascending: false });
  
  // ... filtres et pagination ...
  
  const { data, error, count } = await query;
  if (error) throw error;
  
  // Hydrater via le cache uniquement
  const refs = await getReferenceCache();
  
  const transformedData = (data || []).map((item) => {
    const status = item.statut_id 
      ? refs.interventionStatusesById?.get(item.statut_id)
      : undefined;
    
    return {
      ...item,
      status: status ? {
        id: status.id,
        code: status.code,
        label: status.label,
        color: status.color,
        sort_order: status.sort_order
      } : undefined,
      statusLabel: status?.label,
      statusColor: status?.color,
      // ... reste du mapping
    } as InterventionWithStatus;
  });
  
  return {
    data: transformedData,
    pagination: { total: count || 0, limit, offset, hasMore: ... }
  };
}
```

**Avantages** :
- ✅ Fonctionne toujours
- ✅ Pas de problème de FK

**Inconvénients** :
- ❌ Un peu moins performant (mais négligeable)

---

## 📋 Checklist de correction

1. [ ] Ouvrir `src/lib/api/v2/interventionsApi.ts`
2. [ ] Remplacer les 3 JOINs avec la syntaxe correcte
3. [ ] Sauvegarder
4. [ ] Recharger la page `/interventions`
5. [ ] Vérifier la console : pas d'erreur 404
6. [ ] Vérifier que les interventions s'affichent
7. [ ] Vérifier que les badges de statut ont des couleurs
8. [ ] Tester le changement de statut

---

## 💡 TL;DR - Change rapide

**Dans `src/lib/api/v2/interventionsApi.ts`, remplacer toutes les occurrences de :**

```typescript
status:intervention_statuses!statut_id (
```

**Par :**

```typescript
status:intervention_statuses(statut_id) (
```

**Ça devrait marcher ! 🎉**

---

**Si vous avez besoin d'aide supplémentaire, partagez :**
1. Les logs de la console
2. Le résultat de la requête SQL de test
3. Le nom de la FK trouvé




