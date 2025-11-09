# 📝 Modifications des Kinds de Documents

Ce document décrit les modifications à apporter aux kinds de documents pour les interventions et les artisans.

---

## 🎯 Objectif

Standardiser et étendre les kinds de documents supportés dans le système, avec l'ajout du nouveau kind `a_classe` pour les deux entités.

---

## 1️⃣ ARTISANS - Nouveaux Kinds

### Kinds à supporter dans la BDD

Les kinds suivants doivent être supportés dans la table `artisan_attachments` :

1. `kbis`
2. `assurance`
3. `cni_recto_verso`
4. `iban`
5. `decharge_partenariat`
6. `photo_profil`
7. `autre`
8. `a_classe` ⭐ **NOUVEAU** (pas encore d'action dans le CRM)

### État Actuel vs État Cible

| Kind | Actuel (BDD) | Actuel (Edge Function) | Cible (BDD) | Statut |
|------|--------------|------------------------|-------------|--------|
| `kbis` | ✅ Pas de contrainte | ✅ Supporté | ✅ À garder | ✅ |
| `assurance` | ✅ Pas de contrainte | ✅ Supporté | ✅ À garder | ✅ |
| `cni_recto_verso` | ✅ Pas de contrainte | ✅ Supporté | ✅ À garder | ✅ |
| `iban` | ✅ Pas de contrainte | ✅ Supporté | ✅ À garder | ✅ |
| `decharge_partenariat` | ✅ Pas de contrainte | ✅ Supporté | ✅ À garder | ✅ |
| `photo_profil` | ✅ Pas de contrainte | ✅ Supporté | ✅ À garder | ✅ |
| `autre` | ✅ Pas de contrainte | ✅ Supporté | ✅ À garder | ✅ |
| `a_classe` | ❌ Non supporté | ❌ Non supporté | ⭐ **À ajouter** | 🔄 **À implémenter** |
| `certificat` | ✅ Pas de contrainte | ✅ Supporté | ❌ À retirer | ⚠️ |
| `siret` | ✅ Pas de contrainte | ✅ Supporté | ❌ À retirer | ⚠️ |
| `portfolio` | ✅ Pas de contrainte | ✅ Supporté | ❌ À retirer | ⚠️ |

### Modifications Requises

#### 1. Base de Données

**Option A : Ajouter une contrainte CHECK** (recommandé pour la cohérence)
```sql
ALTER TABLE public.artisan_attachments 
DROP CONSTRAINT IF EXISTS artisan_attachments_kind_check;

ALTER TABLE public.artisan_attachments 
ADD CONSTRAINT artisan_attachments_kind_check 
CHECK (kind IN (
  'kbis',
  'assurance',
  'cni_recto_verso',
  'iban',
  'decharge_partenariat',
  'photo_profil',
  'autre',
  'a_classe'
));
```

**Option B : Garder sans contrainte CHECK** (actuel)
- La validation se fera uniquement côté application
- Plus flexible mais moins de sécurité au niveau BDD

#### 2. Edge Function `documents/index.ts`

Mettre à jour `SUPPORTED_DOCUMENT_TYPES.artisan` :
```typescript
artisan: [
  'kbis',
  'assurance',
  'cni_recto_verso',
  'iban',
  'decharge_partenariat',
  'photo_profil',
  'autre',
  'a_classe'  // ⭐ NOUVEAU
]
```

#### 3. Frontend UI

Mettre à jour `ARTISAN_DOCUMENT_KINDS` dans `src/components/ui/artisan-modal/ArtisanModalContent.tsx` :
```typescript
const ARTISAN_DOCUMENT_KINDS = [
  { kind: "kbis", label: "Extrait Kbis" },
  { kind: "assurance", label: "Attestation d'assurance" },
  { kind: "cni_recto_verso", label: "CNI recto/verso" },
  { kind: "iban", label: "IBAN" },
  { kind: "decharge_partenariat", label: "Décharge partenariat" },
  { kind: "photo_profil", label: "Photo de profil" },
  { kind: "autre", label: "Autre document" },
  { kind: "a_classe", label: "À classer" },  // ⭐ NOUVEAU
]
```

#### 4. Documents Requis (Statut de Dossier)

Le kind `a_classe` ne doit **PAS** être dans la liste des documents requis pour le calcul du statut de dossier.

Mettre à jour `src/lib/artisans/dossierStatus.ts` :
```typescript
export const REQUIRED_DOCUMENT_KINDS: ArtisanDocumentKind[] = [
  "kbis",
  "assurance",
  "cni_recto_verso",
  "iban",
  "decharge_partenariat",
  // 'a_classe' n'est PAS requis
]
```

---

## 2️⃣ INTERVENTIONS - Nouveaux Kinds

### Kinds à supporter dans la BDD

Les kinds suivants doivent être supportés dans la table `intervention_attachments` :

1. `devis`
2. `photos`
3. `facturesGMBS` ⚠️ **Note** : Format avec 's' (à vérifier avec la convention existante)
4. `facturesArtisans` ⚠️ **Note** : Format avec 's' (à vérifier avec la convention existante)
5. `facturesMateriel` ⚠️ **Note** : Format avec 's' (à vérifier avec la convention existante)
6. `autre`
7. `a_classe` ⭐ **NOUVEAU** (pas encore d'action dans le CRM)

### État Actuel vs État Cible

| Kind | Actuel (BDD CHECK) | Actuel (Edge Function) | Cible (BDD) | Statut |
|------|-------------------|------------------------|-------------|--------|
| `devis` | ✅ Supporté | ✅ Supporté | ✅ À garder | ✅ |
| `photos` | ✅ Supporté | ✅ Supporté | ✅ À garder | ✅ |
| `factureGMBS` | ✅ Supporté | ✅ Supporté | ⚠️ `facturesGMBS` ? | 🔄 **À clarifier** |
| `factureArtisan` | ✅ Supporté | ✅ Supporté | ⚠️ `facturesArtisans` ? | 🔄 **À clarifier** |
| `factureMateriel` | ✅ Supporté | ✅ Supporté | ⚠️ `facturesMateriel` ? | 🔄 **À clarifier** |
| `autre` | ❌ Non supporté | ✅ Supporté | ⭐ **À ajouter** | 🔄 **À implémenter** |
| `a_classe` | ❌ Non supporté | ❌ Non supporté | ⭐ **À ajouter** | 🔄 **À implémenter** |
| `intervention` | ✅ Supporté | ❌ Non supporté | ❌ À retirer | ⚠️ |
| `cout` | ✅ Supporté | ❌ Non supporté | ❌ À retirer | ⚠️ |
| `rapport_intervention` | ❌ Non supporté | ✅ Supporté | ❌ À retirer | ⚠️ |
| `plan` | ❌ Non supporté | ✅ Supporté | ❌ À retirer | ⚠️ |
| `schema` | ❌ Non supporté | ✅ Supporté | ❌ À retirer | ⚠️ |

### ⚠️ Question sur la Convention de Nommage

**Format actuel** : `factureGMBS`, `factureArtisan`, `factureMateriel` (singulier)
**Format demandé** : `facturesGMBS`, `facturesArtisans`, `facturesMateriel` (pluriel)

**Recommandation** : 
- Garder le format actuel (`factureGMBS`, `factureArtisan`, `factureMateriel`) pour la cohérence avec le code existant
- OU migrer vers le pluriel si c'est la nouvelle convention souhaitée

### Modifications Requises

#### 1. Base de Données

Mettre à jour la contrainte CHECK :
```sql
ALTER TABLE public.intervention_attachments 
DROP CONSTRAINT IF EXISTS intervention_attachments_kind_check;

ALTER TABLE public.intervention_attachments 
ADD CONSTRAINT intervention_attachments_kind_check 
CHECK (kind IN (
  'devis',
  'photos',
  'facturesGMBS',      -- OU 'factureGMBS' selon convention
  'facturesArtisans',  -- OU 'factureArtisan' selon convention
  'facturesMateriel',  -- OU 'factureMateriel' selon convention
  'autre',
  'a_classe'           -- ⭐ NOUVEAU
));
```

#### 2. Edge Function `documents/index.ts`

Mettre à jour `SUPPORTED_DOCUMENT_TYPES.intervention` :
```typescript
intervention: [
  'devis',
  'photos',
  'facturesGMBS',      // OU 'factureGMBS' selon convention
  'facturesArtisans',  // OU 'factureArtisan' selon convention
  'facturesMateriel',  // OU 'factureMateriel' selon convention
  'autre',
  'a_classe'           // ⭐ NOUVEAU
]
```

Mettre à jour la fonction `normalizeInterventionKind()` si nécessaire :
```typescript
function normalizeInterventionKind(kind: string): string {
  if (!kind) return kind;
  const trimmed = kind.trim();
  const compact = trimmed.toLowerCase().replace(/[_\s-]/g, '');

  switch (compact) {
    case 'facturesgmbs':
    case 'facturegmbs':
      return 'facturesGMBS';  // OU 'factureGMBS' selon convention
    case 'facturesartisans':
    case 'factureartisan':
      return 'facturesArtisans';  // OU 'factureArtisan' selon convention
    case 'facturesmateriel':
    case 'facturemateriel':
      return 'facturesMateriel';  // OU 'factureMateriel' selon convention
    default:
      return trimmed;
  }
}
```

#### 3. Frontend UI

Mettre à jour `INTERVENTION_DOCUMENT_KINDS` dans `src/components/interventions/InterventionEditForm.tsx` :
```typescript
const INTERVENTION_DOCUMENT_KINDS = [
  { kind: "devis", label: "Devis" },
  { kind: "photos", label: "Photos" },
  { kind: "factures_gmbs", label: "Factures GMBS" },      // Normalisé en facturesGMBS
  { kind: "factures_artisans", label: "Factures Artisans" }, // Normalisé en facturesArtisans
  { kind: "factures_materiel", label: "Factures Matériel" }, // Normalisé en facturesMateriel
  { kind: "autre", label: "Autre document" },
  { kind: "a_classe", label: "À classer" },  // ⭐ NOUVEAU
]
```

---

## 3️⃣ Kind `a_classe` - Spécifications

### Description

Le kind `a_classe` est un nouveau type de document qui indique qu'un document doit être classé/catégorisé ultérieurement. Il n'a **pas encore d'action spécifique dans le CRM**.

### Comportement Attendu

1. **Affichage** : Les documents avec `kind='a_classe'` doivent être visibles dans l'interface
2. **Filtrage** : Possibilité de filtrer les documents "à classer"
3. **Action future** : Un workflow pour reclasser ces documents sera implémenté ultérieurement
4. **Statut de dossier** : `a_classe` ne compte **PAS** dans le calcul du statut de dossier complet pour les artisans

### Cas d'Usage

- Documents uploadés sans catégorie précise
- Documents nécessitant une vérification avant classification
- Documents temporaires en attente de traitement

---

## 4️⃣ Plan d'Implémentation

### Phase 1 : Base de Données
- [ ] Créer une migration SQL pour mettre à jour les contraintes CHECK
- [ ] Ajouter `a_classe` aux kinds autorisés
- [ ] Retirer les kinds obsolètes (si nécessaire)
- [ ] Tester la migration sur un environnement de dev

### Phase 2 : Backend (Edge Functions)
- [ ] Mettre à jour `SUPPORTED_DOCUMENT_TYPES` dans `documents/index.ts`
- [ ] Mettre à jour `normalizeInterventionKind()` si changement de convention
- [ ] Tester les validations côté Edge Function

### Phase 3 : Frontend
- [ ] Mettre à jour les constantes `ARTISAN_DOCUMENT_KINDS` et `INTERVENTION_DOCUMENT_KINDS`
- [ ] Ajouter les labels pour `a_classe`
- [ ] Vérifier que `a_classe` n'est pas dans les documents requis
- [ ] Tester l'upload et l'affichage des documents

### Phase 4 : Migration des Données Existantes
- [ ] Identifier les documents avec des kinds obsolètes
- [ ] Créer un script de migration si nécessaire
- [ ] Valider l'intégrité des données après migration

### Phase 5 : Documentation
- [ ] Mettre à jour la documentation technique
- [ ] Documenter le workflow futur pour `a_classe`
- [ ] Mettre à jour les guides utilisateur

---

## 5️⃣ Checklist de Validation

### Artisans
- [ ] Les 8 kinds sont acceptés en BDD
- [ ] L'Edge Function valide les 8 kinds
- [ ] L'UI affiche les 8 kinds avec les bons labels
- [ ] `a_classe` n'est pas dans les documents requis
- [ ] Les anciens kinds (`certificat`, `siret`, `portfolio`) sont retirés

### Interventions
- [ ] Les 7 kinds sont acceptés en BDD
- [ ] L'Edge Function valide les 7 kinds
- [ ] L'UI affiche les 7 kinds avec les bons labels
- [ ] La convention de nommage est cohérente (singulier vs pluriel)
- [ ] Les anciens kinds (`intervention`, `cout`, `rapport_intervention`, `plan`, `schema`) sont retirés

### Général
- [ ] Les migrations SQL sont testées
- [ ] Les Edge Functions sont déployées et testées
- [ ] Le frontend est mis à jour et testé
- [ ] Aucune régression sur les fonctionnalités existantes
- [ ] La documentation est à jour

---

## 6️⃣ Notes Importantes

1. **Convention de nommage** : À clarifier si `facturesGMBS` (pluriel) ou `factureGMBS` (singulier)
2. **Migration des données** : Vérifier s'il y a des documents existants avec les anciens kinds à migrer
3. **Rétrocompatibilité** : S'assurer que les anciens kinds ne cassent pas le système pendant la transition
4. **Kind `a_classe`** : Ce kind est un placeholder pour une fonctionnalité future, pas d'action immédiate requise

---

## 📋 Résumé des Kinds Finaux

### Artisans (8 kinds)
1. `kbis`
2. `assurance`
3. `cni_recto_verso`
4. `iban`
5. `decharge_partenariat`
6. `photo_profil`
7. `autre`
8. `a_classe` ⭐

### Interventions (7 kinds)
1. `devis`
2. `photos`
3. `facturesGMBS` (ou `factureGMBS` selon convention)
4. `facturesArtisans` (ou `factureArtisan` selon convention)
5. `facturesMateriel` (ou `factureMateriel` selon convention)
6. `autre`
7. `a_classe` ⭐


