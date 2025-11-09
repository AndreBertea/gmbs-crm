# ✅ Résumé des Modifications des Kinds de Documents

## 📋 Fichiers Modifiés

### 1. Migration SQL
- ✅ **Créé** : `supabase/migrations/20250115000000_update_document_kinds.sql`
  - Mise à jour de la contrainte CHECK pour `intervention_attachments`
  - Ajout de la contrainte CHECK pour `artisan_attachments`
  - Migration des données existantes (anciens kinds → nouveaux)
  - Requêtes de vérification

### 2. Edge Function
- ✅ **Modifié** : `supabase/functions/documents/index.ts`
  - Mise à jour de `SUPPORTED_DOCUMENT_TYPES` pour interventions et artisans
  - Mise à jour de `normalizeInterventionKind()` pour supporter les nouveaux formats

### 3. Frontend - Composants UI
- ✅ **Modifié** : `src/components/ui/artisan-modal/ArtisanModalContent.tsx`
  - Ajout de `photo_profil` et `a_classe` dans `ARTISAN_DOCUMENT_KINDS`

- ✅ **Modifié** : `src/components/interventions/InterventionEditForm.tsx`
  - Mise à jour de `INTERVENTION_DOCUMENT_KINDS` avec les nouveaux kinds
  - Ajout de `autre` et `a_classe`
  - Changement de format : `factures_gmbs`, `factures_artisans`, `factures_materiel`

- ✅ **Modifié** : `src/components/interventions/LegacyInterventionForm.tsx`
  - Même mise à jour que `InterventionEditForm.tsx`

### 4. Types et Utilitaires
- ✅ **Modifié** : `src/lib/artisans/dossierStatus.ts`
  - Ajout de `photo_profil` et `a_classe` dans le type `ArtisanDocumentKind`
  - Note : `a_classe` n'est PAS dans `REQUIRED_DOCUMENT_KINDS` (correct)

- ✅ **Modifié** : `src/lib/api/v2/common/utils.ts`
  - Mise à jour de `DOCUMENT_TYPES` pour interventions et artisans

- ✅ **Modifié** : `src/hooks/useDocumentUpload.tsx`
  - Mise à jour de `DOCUMENT_KINDS` pour interventions et artisans
  - Correction des kinds d'artisans (étaient incorrects avant)

---

## 📊 Kinds Finaux

### Artisans (8 kinds)
1. `kbis` → "Extrait Kbis"
2. `assurance` → "Attestation d'assurance"
3. `cni_recto_verso` → "CNI recto/verso"
4. `iban` → "IBAN"
5. `decharge_partenariat` → "Décharge partenariat"
6. `photo_profil` → "Photo de profil" ⭐ **NOUVEAU**
7. `autre` → "Autre document"
8. `a_classe` → "À classer" ⭐ **NOUVEAU**

### Interventions (7 kinds)
1. `devis` → "Devis"
2. `photos` → "Photos"
3. `facturesGMBS` → "Factures GMBS" (normalisé depuis `factures_gmbs`)
4. `facturesArtisans` → "Factures Artisans" (normalisé depuis `factures_artisans`)
5. `facturesMateriel` → "Factures Matériel" (normalisé depuis `factures_materiel`)
6. `autre` → "Autre document" ⭐ **NOUVEAU**
7. `a_classe` → "À classer" ⭐ **NOUVEAU**

---

## 🔄 Migration des Données

La migration SQL convertit automatiquement :

### Interventions
- `factureGMBS` → `facturesGMBS`
- `factureArtisan` → `facturesArtisans`
- `factureMateriel` → `facturesMateriel`
- `intervention` → `autre`
- `cout` → `autre`
- `rapport_intervention` → `autre`
- `plan` → `autre`
- `schema` → `autre`

### Artisans
- `certificat` → `autre`
- `siret` → `autre`
- `portfolio` → `autre`

---

## ⚠️ Points d'Attention

1. **Convention de nommage** : Les kinds dans l'UI utilisent des underscores (`factures_gmbs`), mais sont normalisés en camelCase (`facturesGMBS`) par l'Edge Function.

2. **Kind `a_classe`** : 
   - N'est PAS requis pour le calcul du statut de dossier complet
   - Pas encore d'action spécifique dans le CRM
   - Sera utilisé pour un workflow futur de reclassification

3. **Documents requis** : Seuls les 5 kinds suivants comptent pour le statut de dossier des artisans :
   - `kbis`
   - `assurance`
   - `cni_recto_verso`
   - `iban`
   - `decharge_partenariat`

---

## ✅ Prochaines Étapes

1. **Exécuter la migration SQL** :
   ```bash
   # En local avec Supabase CLI
   supabase db reset
   # OU appliquer la migration manuellement
   ```

2. **Déployer l'Edge Function** :
   ```bash
   supabase functions deploy documents
   ```

3. **Tester** :
   - Upload de documents avec les nouveaux kinds
   - Vérifier que les anciens kinds sont bien migrés
   - Vérifier que les menus UI affichent les bons kinds

4. **Documenter le workflow `a_classe`** : Une fois que vous aurez défini comment utiliser ce kind dans le CRM, mettre à jour la documentation.

---

## 📝 Notes Techniques

- La normalisation des kinds se fait dans `normalizeInterventionKind()` de l'Edge Function
- Les contraintes CHECK en BDD garantissent l'intégrité des données
- Les anciens kinds sont automatiquement migrés vers `autre` ou les nouveaux formats
- Le kind `a_classe` est accepté partout mais n'a pas encore de logique métier associée


