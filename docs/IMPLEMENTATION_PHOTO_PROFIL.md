# 📸 Implémentation de la Photo de Profil pour les Artisans

## 🎯 Objectif

Permettre aux artisans d'avoir une photo de profil unique qui s'affiche dans le tableau des artisans. Le kind `photo_profil` doit être unique par artisan (une seule photo_profil par artisan).

---

## ✅ Modifications Effectuées

### 1. **DocumentManager.tsx** - Gestion de l'unicité

**Fichier** : `src/components/documents/DocumentManager.tsx`

**Modification** : Ajout de la logique pour supprimer automatiquement l'ancienne `photo_profil` avant d'uploader une nouvelle.

```typescript
// Si c'est une photo_profil pour un artisan, supprimer l'ancienne avant d'uploader
if (entityType === "artisan" && normalizedKind === "photo_profil") {
  const existingPhotoProfil = documents.find(
    (doc) => normalizeKind(doc.kind) === "photo_profil"
  );
  if (existingPhotoProfil) {
    try {
      await documentsApi.delete(existingPhotoProfil.id, entityType);
      // Retirer de la liste locale immédiatement pour éviter les doublons visuels
      setDocuments((prev) => prev.filter((doc) => doc.id !== existingPhotoProfil.id));
    } catch (error) {
      console.warn("Erreur lors de la suppression de l'ancienne photo_profil:", error);
      // Continuer quand même l'upload
    }
  }
}
```

**Comportement** :
- Détecte si un upload de `photo_profil` est en cours
- Recherche une `photo_profil` existante pour cet artisan
- Supprime l'ancienne avant d'uploader la nouvelle
- Retire immédiatement de la liste locale pour éviter les doublons visuels

---

### 2. **app/artisans/page.tsx** - Affichage de la photo de profil

**Fichier** : `app/artisans/page.tsx`

**Modification** : Mise à jour de `mapArtisanToContact` pour récupérer l'URL de la `photo_profil` depuis les attachments.

```typescript
// Récupérer l'URL de la photo_profil depuis les attachments
const photoProfilUrl = (() => {
  const attachments = raw.artisan_attachments || raw.attachments;
  if (Array.isArray(attachments)) {
    const photoProfil = attachments.find(
      (att: any) => att?.kind === "photo_profil" && att?.url
    );
    return photoProfil?.url || null;
  }
  return null;
})();

return {
  // ...
  avatar: photoProfilUrl || "/placeholder.svg",
  // ...
}
```

**Comportement** :
- Recherche la `photo_profil` dans les attachments de l'artisan
- Utilise l'URL de la photo si trouvée
- Sinon, utilise le placeholder par défaut (`/placeholder.svg`)

**Affichage** : L'avatar s'affiche dans le tableau via le composant `Avatar` :
```tsx
<Avatar className="h-9 w-9">
  <AvatarImage src={contact.avatar} alt={contact.name} />
  <AvatarFallback>
    {/* Initiales */}
  </AvatarFallback>
</Avatar>
```

---

### 3. **supabase-api-v2.ts** - Chargement des attachments

**Fichier** : `src/lib/supabase-api-v2.ts`

**Modification 1** : Ajout des `artisan_attachments` dans la requête `getAll` :

```typescript
.select(`
  *,
  artisan_metiers (...),
  artisan_zones (...),
  artisan_attachments (
    id,
    kind,
    url,
    filename,
    mime_type
  )
`, { count: "exact" })
```

**Modification 2** : Préservation des attachments dans les données transformées :

```typescript
const transformedData = (data || []).map((item) => {
  const mapped = mapArtisanRecord(item, refs);
  // Préserver les attachments si présents dans les données brutes
  if (Array.isArray(item.artisan_attachments)) {
    (mapped as any).artisan_attachments = item.artisan_attachments;
  }
  return mapped;
});
```

**Comportement** :
- Les attachments sont maintenant chargés avec les artisans
- Les attachments sont préservés lors du mapping des données
- Accessibles via `artisan.artisan_attachments` dans le code

---

## 🔄 Flux Complet

### Upload d'une Photo de Profil

1. **Utilisateur sélectionne** le kind `photo_profil` dans le menu déroulant
2. **Utilisateur upload** un fichier image
3. **DocumentManager détecte** que c'est une `photo_profil` pour un artisan
4. **Recherche** une `photo_profil` existante
5. **Supprime** l'ancienne si elle existe
6. **Upload** la nouvelle photo
7. **Rafraîchit** la liste des documents
8. **Callback `onChange`** déclenche le rafraîchissement de l'artisan
9. **Tableau des artisans** se met à jour avec la nouvelle photo

### Affichage dans le Tableau

1. **Chargement des artisans** avec leurs attachments
2. **Mapping** de chaque artisan en Contact
3. **Recherche** de la `photo_profil` dans les attachments
4. **Affectation** de l'URL à `contact.avatar`
5. **Affichage** via le composant `Avatar`

---

## 📋 Points Importants

### Unicité Garantie

- ✅ **Côté application** : Le `DocumentManager` supprime automatiquement l'ancienne `photo_profil` avant d'uploader
- ⚠️ **Côté BDD** : Pas de contrainte UNIQUE sur `kind` pour `artisan_attachments`
- 💡 **Recommandation** : Pour une sécurité supplémentaire, on pourrait ajouter une contrainte unique ou un trigger PostgreSQL

### Performance

- Les attachments sont chargés avec les artisans (jointure SQL)
- Impact minimal sur les performances car :
  - Seulement les champs nécessaires sont chargés (`id`, `kind`, `url`, `filename`, `mime_type`)
  - La recherche de `photo_profil` est rapide (un seul document par artisan au maximum)

### Fallback

- Si aucune `photo_profil` n'est trouvée, l'avatar affiche les initiales de l'artisan
- Le placeholder `/placeholder.svg` est utilisé comme fallback

---

## 🧪 Tests à Effectuer

1. **Upload d'une première photo_profil** :
   - ✅ Vérifier que la photo s'affiche dans le tableau
   - ✅ Vérifier que la photo s'affiche dans le modal de l'artisan

2. **Remplacement d'une photo_profil existante** :
   - ✅ Vérifier que l'ancienne est supprimée
   - ✅ Vérifier que la nouvelle s'affiche correctement
   - ✅ Vérifier qu'il n'y a pas de doublons

3. **Suppression d'une photo_profil** :
   - ✅ Vérifier que l'avatar revient aux initiales
   - ✅ Vérifier qu'on peut uploader une nouvelle photo après suppression

4. **Performance** :
   - ✅ Vérifier que le chargement des artisans reste rapide
   - ✅ Vérifier que l'affichage du tableau n'est pas ralenti

---

## 🔮 Améliorations Futures Possibles

1. **Contrainte BDD** : Ajouter une contrainte unique ou un trigger PostgreSQL pour garantir l'unicité au niveau BDD
2. **Optimisation** : Charger les `photo_profil` séparément si le chargement devient trop lent
3. **Cache** : Mettre en cache les URLs des photos de profil pour éviter les rechargements
4. **Compression** : Compresser automatiquement les images uploadées pour optimiser le stockage
5. **Validation** : Valider que le fichier uploadé est bien une image avant l'upload

---

## 📝 Notes Techniques

- Le kind `photo_profil` est normalisé en `photo_profil` (pas de transformation)
- L'unicité est gérée côté application, pas au niveau BDD
- Les attachments sont chargés via une jointure SQL pour optimiser les performances
- Le callback `onChange` dans `DocumentManager` déclenche le rafraîchissement des données de l'artisan


