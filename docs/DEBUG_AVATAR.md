# Guide de Débogage - Avatar ne s'affiche pas

## Problème
Après avoir uploadé une photo de profil, l'avatar ne s'affiche pas (seulement les initiales).

## Étapes de Diagnostic

### 1. Vérifier que l'upload a bien créé l'attachment

```sql
-- Se connecter à la base
supabase db connect

-- Vérifier les derniers attachments photo_profil
SELECT 
  id,
  artisan_id,
  kind,
  url,
  content_hash,
  derived_sizes,
  mime_preferred,
  created_at
FROM artisan_attachments
WHERE kind = 'photo_profil'
ORDER BY created_at DESC
LIMIT 5;
```

**Résultat attendu** :
- `url` : URL de l'image originale
- `content_hash` : Hash SHA-256 (64 caractères hex) ou NULL si pas encore traité
- `derived_sizes` : JSON avec `{"40": "url", "80": "url", "160": "url"}` ou `{}` si pas encore traité
- `mime_preferred` : `image/webp` ou `image/jpeg` ou NULL

### 2. Vérifier que process-avatar a été appelée

```bash
# Vérifier les logs de la fonction documents (pour voir si process-avatar est appelée)
supabase functions logs documents --limit 50

# Vérifier les logs de process-avatar (pour voir si le traitement s'est bien passé)
supabase functions logs process-avatar --limit 50
```

**Ce qu'on cherche** :
- Dans les logs `documents` : "Error calling process-avatar" ou pas d'erreur
- Dans les logs `process-avatar` : "Image processed successfully" pour chaque taille

### 3. Vérifier les fichiers dans Storage

1. Ouvrir Supabase Studio : http://localhost:54323
2. Aller dans **Storage** → `documents`
3. Naviguer vers `avatars/{artisan_id}/`
4. Vérifier les fichiers :
   - `avatar_{hash}_40.webp` (ou `.jpeg`)
   - `avatar_{hash}_80.webp` (ou `.jpeg`)
   - `avatar_{hash}_160.webp` (ou `.jpeg`)

**Si les fichiers n'existent pas** : La fonction `process-avatar` n'a pas fonctionné.

### 4. Vérifier les données dans l'API

Ouvrir la console du navigateur (F12) et exécuter :

```javascript
// Vérifier les données d'un artisan spécifique
const artisanId = "VOTRE_ARTISAN_ID"; // Remplacer par l'ID réel

fetch(`http://127.0.0.1:54321/rest/v1/artisans?id=eq.${artisanId}&select=*,artisan_attachments(*)`, {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  }
})
.then(r => r.json())
.then(data => {
  const photoProfil = data[0]?.artisan_attachments?.find(a => a.kind === 'photo_profil');
  console.log('Photo profil attachment:', photoProfil);
  console.log('derived_sizes:', photoProfil?.derived_sizes);
  console.log('content_hash:', photoProfil?.content_hash);
});
```

### 5. Vérifier le format des données dans le composant

Dans la console du navigateur, vérifier ce que reçoit le composant Avatar :

```javascript
// Dans la console, chercher les logs du composant Avatar
// Ou ajouter temporairement un console.log dans Avatar.tsx
```

## Solutions selon le problème

### Problème 1 : `derived_sizes` est vide `{}`

**Cause** : La fonction `process-avatar` n'a pas été appelée ou a échoué.

**Solution** :
1. Vérifier les logs : `supabase functions logs process-avatar`
2. Si pas de logs, vérifier que l'appel à `process-avatar` fonctionne dans `documents/index.ts`
3. Appeler manuellement `process-avatar` :

```bash
# Récupérer l'URL de la fonction
FUNCTIONS_URL="http://127.0.0.1:54321/functions/v1"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Appeler process-avatar manuellement (remplacer les valeurs)
curl -X POST "${FUNCTIONS_URL}/process-avatar" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "artisan_id": "VOTRE_ARTISAN_ID",
    "attachment_id": "VOTRE_ATTACHMENT_ID",
    "image_url": "URL_DE_L_IMAGE_ORIGINALE",
    "mime_type": "image/jpeg"
  }'
```

### Problème 2 : Les fichiers existent mais `derived_sizes` est vide

**Cause** : La mise à jour des métadonnées a échoué.

**Solution** :
1. Vérifier les logs de `process-avatar` pour voir l'erreur de mise à jour
2. Vérifier que les colonnes existent : `\d artisan_attachments` dans psql
3. Mettre à jour manuellement :

```sql
UPDATE artisan_attachments
SET derived_sizes = '{"40": "http://127.0.0.1:54321/storage/v1/object/public/documents/avatars/ARTISAN_ID/avatar_HASH_40.webp", "80": "...", "160": "..."}',
    content_hash = 'HASH_SHA256',
    mime_preferred = 'image/webp'
WHERE id = 'ATTACHMENT_ID';
```

### Problème 3 : Les données existent mais l'avatar ne s'affiche pas

**Cause** : Problème dans le composant Avatar ou dans le mapping des données.

**Solution** :
1. Vérifier dans la console du navigateur ce que reçoit `photoProfilMetadata`
2. Vérifier que `photoProfilMetadata.sizes` contient bien les clés "40", "80", "160"
3. Vérifier que les URLs sont accessibles (pas d'erreur 404)
4. Vérifier la config Next.js Image dans `next.config.mjs`

### Problème 4 : L'avatar s'affiche mais pas après rafraîchissement

**Cause** : Les données ne sont pas rafraîchies après l'upload.

**Solution** :
1. Rafraîchir manuellement la liste des artisans
2. Vérifier que `useArtisans` recharge bien les données
3. Ajouter un `refresh()` après l'upload dans le composant d'upload

## Test Rapide

Pour tester rapidement si tout fonctionne :

1. **Uploader une photo** via l'interface
2. **Attendre 5-10 secondes** (temps de traitement)
3. **Rafraîchir la page** `/artisans`
4. **Vérifier dans la console** :
   ```javascript
   // Dans la console du navigateur
   const contacts = document.querySelectorAll('[data-artisan-id]');
   console.log('Nombre d\'artisans affichés:', contacts.length);
   ```
5. **Vérifier les métadonnées** :
   ```sql
   SELECT derived_sizes FROM artisan_attachments WHERE kind = 'photo_profil' ORDER BY created_at DESC LIMIT 1;
   ```

## Logs Utiles

```bash
# Suivre les logs en temps réel
supabase functions logs documents --follow
supabase functions logs process-avatar --follow

# Dans un autre terminal, uploader une photo et observer les logs
```

