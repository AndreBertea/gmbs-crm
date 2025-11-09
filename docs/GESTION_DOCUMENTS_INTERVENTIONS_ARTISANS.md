# 📄 Gestion des Documents - Interventions & Artisans

Ce document présente les **deux manières différentes** de gérer les documents dans le système :
1. **Documents des Interventions**
2. **Documents des Artisans**

---

## 1️⃣ DOCUMENTS DES INTERVENTIONS

### Architecture

#### **Méthode 1 : Route API Next.js (Legacy - Non implémentée)**
```12:37:app/api/interventions/[id]/documents/route.ts
export async function GET(_request: Request, { params }: Params) {
  const documents = await listInterventionDocuments(params.id)
  return NextResponse.json({ documents })
}

export async function POST(request: Request, { params }: Params) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ message: "FormData requis" }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Fichier manquant" }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const document = await uploadInterventionDocument({
    interventionId: params.id,
    fileName: file.name,
    mimeType: file.type,
    buffer,
    metadata: formData.get("metadata") ? JSON.parse(String(formData.get("metadata"))) : undefined,
  })

  return NextResponse.json(document, { status: 201 })
}
```

**Fonction backend** : `src/lib/api/documents.ts`
- ⚠️ **Non implémentée** (logNotImplemented)
- Retourne des données mockées

#### **Méthode 2 : Edge Function Supabase (Unifiée - Actuelle)**
```304:390:supabase/functions/documents/index.ts
    // ===== POST /documents - Créer un document =====
    if (req.method === 'POST' && resource === 'documents') {
      const body: CreateAttachmentRequest = await req.json();

      // Validation des données requises
      if (!body.entity_id || !body.entity_type || !body.kind || !body.url) {
        return new Response(
          JSON.stringify({ error: 'entity_id, entity_type, kind, and url are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validation du type de document
      const canonicalKind = body.entity_type === 'intervention'
        ? normalizeInterventionKind(body.kind)
        : body.kind;

      const allowedKinds = SUPPORTED_DOCUMENT_TYPES[body.entity_type];
      if (!allowedKinds.includes(canonicalKind)) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid kind for ${body.entity_type}. Allowed: ${allowedKinds.join(', ')}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query;
      if (body.entity_type === 'artisan') {
        query = supabase
          .from('artisan_attachments')
          .insert([{
            artisan_id: body.entity_id,
            kind: canonicalKind,
            url: body.url,
            filename: body.filename,
            mime_type: body.mime_type,
            file_size: body.file_size,
            created_by: body.created_by,
            created_by_display: body.created_by_display,
            created_by_code: body.created_by_code,
            created_by_color: body.created_by_color
          }])
          .select()
          .single();
      } else {
        query = supabase
          .from('intervention_attachments')
          .insert([{
            intervention_id: body.entity_id,
            kind: canonicalKind,
            url: body.url,
            filename: body.filename,
            mime_type: body.mime_type,
            file_size: body.file_size,
            created_by: body.created_by,
            created_by_display: body.created_by_display,
            created_by_code: body.created_by_code,
            created_by_color: body.created_by_color
          }])
          .select()
          .single();
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to create document: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        documentId: data.id,
        entityType: body.entity_type,
        entityId: body.entity_id,
        kind: canonicalKind,
        createdByDisplay: body.created_by_display || null,
        timestamp: new Date().toISOString(),
        message: 'Document created successfully'
      }));

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
```

**API Client** : `src/lib/api/v2/documentsApi.ts`
```118:121:src/lib/api/v2/documentsApi.ts
  // Récupérer les documents d'une intervention
  async getByIntervention(interventionId: string, params?: DocumentQueryParams): Promise<PaginatedResponse<InterventionAttachment>> {
    return this.getAll({ ...params, entity_type: "intervention", entity_id: interventionId }) as Promise<PaginatedResponse<InterventionAttachment>>;
  },
```

### Types de Documents Supportés (KINDS)

#### **Dans la Base de Données (contrainte CHECK)** :
```343:343:supabase/migrations/20251005_clean_schema.sql
  kind text NOT NULL CHECK (kind IN ('intervention','cout','devis','photos','factureGMBS','factureArtisan','factureMateriel')),
```

**Kinds autorisés en BDD** (7 valeurs) :
- `intervention`
- `cout`
- `devis`
- `photos`
- `factureGMBS`
- `factureArtisan`
- `factureMateriel`

#### **Dans l'Edge Function (validation application)** :
```22:33:supabase/functions/documents/index.ts
const SUPPORTED_DOCUMENT_TYPES = {
  intervention: [
    'devis',
    'photos',
    'factureGMBS',
    'factureArtisan',
    'factureMateriel',
    'rapport_intervention',
    'plan',
    'schema',
    'autre'
  ],
```

**Kinds supportés par l'Edge Function** (9 valeurs) :
- `devis`
- `photos`
- `factureGMBS`
- `factureArtisan`
- `factureMateriel`
- `rapport_intervention`
- `plan`
- `schema`
- `autre`

⚠️ **Note** : Il y a une différence entre la contrainte BDD et la validation Edge Function. Les kinds `rapport_intervention`, `plan`, `schema`, `autre` ne sont pas dans la contrainte CHECK mais sont acceptés par l'Edge Function.

#### **Dans le Frontend (UI)** :
```30:36:src/components/interventions/InterventionEditForm.tsx
const INTERVENTION_DOCUMENT_KINDS = [
  { kind: "devis", label: "Devis" },
  { kind: "facture_gmbs", label: "Facture GMBS" },
  { kind: "facture_materiel", label: "Facture Matériel" },
  { kind: "photos", label: "Photos" },
  { kind: "facture_artisan", label: "Facture Artisan" },
]
```

**Kinds affichés dans l'UI** (5 valeurs) :
- `devis` → "Devis"
- `facture_gmbs` → "Facture GMBS" (normalisé en `factureGMBS`)
- `facture_materiel` → "Facture Matériel" (normalisé en `factureMateriel`)
- `photos` → "Photos"
- `facture_artisan` → "Facture Artisan" (normalisé en `factureArtisan`)

### Mapping en Base de Données

**Table** : `intervention_attachments`

```340:353:supabase/migrations/20251005_clean_schema.sql
CREATE TABLE IF NOT EXISTS public.intervention_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervention_id uuid REFERENCES public.interventions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('intervention','cout','devis','photos','factureGMBS','factureArtisan','factureMateriel')),
  url text NOT NULL,
  mime_type text,
  filename text,
  file_size int,
  created_at timestamptz DEFAULT now(),
  created_by uuid NULL REFERENCES public.users(id),
  created_by_display text NULL,
  created_by_code text NULL,
  created_by_color text NULL
);
```

**Champs** :
- `intervention_id` : Référence vers `interventions.id`
- `kind` : Type de document (contrainte CHECK avec valeurs autorisées)
- `url` : URL du document (Supabase Storage ou externe)
- `mime_type`, `filename`, `file_size` : Métadonnées du fichier
- `created_by*` : Informations sur le créateur (UUID, nom, code badge, couleur)

---

## 2️⃣ DOCUMENTS DES ARTISANS

### Architecture

#### **Méthode 1 : Edge Function Artisans-V2 (Spécifique)**
```970:1010:supabase/functions/artisans-v2/index.ts
    // ===== POST /artisans/{id}/documents - Ajouter un document Drive =====
    if (req.method === 'POST' && resourceId && resource === 'documents') {
      const body = await req.json();

      if (!body.kind || !body.url || !body.filename) {
        return new Response(
          JSON.stringify({ error: 'kind, url, and filename are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('artisan_attachments')
        .insert({
          artisan_id: resourceId,
          kind: body.kind,
          url: body.url,
          filename: body.filename,
          mime_type: body.mime_type || 'application/octet-stream'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create document: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        artisanId: resourceId,
        documentId: data.id,
        timestamp: new Date().toISOString(),
        message: 'Document created successfully'
      }));

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
```

**Endpoint** : `POST /artisans-v2/artisans/{id}/documents`

**API Client** : `src/lib/api/v2/artisansApi.ts`
```284:303:src/lib/api/v2/artisansApi.ts
  // Créer un document pour un artisan
  async createDocument(data: {
    artisan_id: string;
    kind: string;
    url: string;
    filename: string;
    created_at?: string;
    updated_at?: string;
  }): Promise<any> {
    const headers = await getHeaders();
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${data.artisan_id}/documents`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },
```

#### **Méthode 2 : Edge Function Documents (Unifiée - Actuelle)**
Même Edge Function que pour les interventions, avec `entity_type='artisan'` :

```331:348:supabase/functions/documents/index.ts
      let query;
      if (body.entity_type === 'artisan') {
        query = supabase
          .from('artisan_attachments')
          .insert([{
            artisan_id: body.entity_id,
            kind: canonicalKind,
            url: body.url,
            filename: body.filename,
            mime_type: body.mime_type,
            file_size: body.file_size,
            created_by: body.created_by,
            created_by_display: body.created_by_display,
            created_by_code: body.created_by_code,
            created_by_color: body.created_by_color
          }])
          .select()
          .single();
```

**API Client** : `src/lib/api/v2/documentsApi.ts`
```123:126:src/lib/api/v2/documentsApi.ts
  // Récupérer les documents d'un artisan
  async getByArtisan(artisanId: string, params?: DocumentQueryParams): Promise<PaginatedResponse<ArtisanAttachment>> {
    return this.getAll({ ...params, entity_type: "artisan", entity_id: artisanId }) as Promise<PaginatedResponse<ArtisanAttachment>>;
  },
```

### Types de Documents Supportés (KINDS)

#### **Dans la Base de Données** :
```206:219:supabase/migrations/20251005_clean_schema.sql
CREATE TABLE IF NOT EXISTS public.artisan_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artisan_id uuid REFERENCES public.artisans(id) ON DELETE CASCADE,
  kind text NOT NULL,
  url text NOT NULL,
```

**Pas de contrainte CHECK** : Le champ `kind` est de type `text NOT NULL` sans restriction. La validation se fait uniquement côté application.

#### **Dans l'Edge Function (validation application)** :
```34:45:supabase/functions/documents/index.ts
  artisan: [
    'kbis',
    'assurance',
    'cni_recto_verso',
    'iban',
    'decharge_partenariat',
    'certificat',
    'siret',
    'photo_profil',
    'portfolio',
    'autre'
  ]
```

**Kinds supportés par l'Edge Function** (10 valeurs) :
- `kbis`
- `assurance`
- `cni_recto_verso`
- `iban`
- `decharge_partenariat`
- `certificat`
- `siret`
- `photo_profil`
- `portfolio`
- `autre`

#### **Dans le Frontend (UI)** :
```135:142:src/components/ui/artisan-modal/ArtisanModalContent.tsx
const ARTISAN_DOCUMENT_KINDS = [
  { kind: "kbis", label: "Extrait Kbis" },
  { kind: "assurance", label: "Attestation d'assurance" },
  { kind: "cni_recto_verso", label: "CNI recto/verso" },
  { kind: "iban", label: "IBAN" },
  { kind: "decharge_partenariat", label: "Décharge partenariat" },
  { kind: "autre", label: "Autre document" },
]
```

**Kinds affichés dans l'UI** (6 valeurs) :
- `kbis` → "Extrait Kbis"
- `assurance` → "Attestation d'assurance"
- `cni_recto_verso` → "CNI recto/verso"
- `iban` → "IBAN"
- `decharge_partenariat` → "Décharge partenariat"
- `autre` → "Autre document"

#### **Documents Requis pour un Dossier Complet** :
```32:38:src/lib/artisans/dossierStatus.ts
export const REQUIRED_DOCUMENT_KINDS: ArtisanDocumentKind[] = [
  "kbis",
  "assurance",
  "cni_recto_verso",
  "iban",
  "decharge_partenariat",
]
```

**Kinds requis** (5 valeurs, pour le calcul du statut de dossier) :
- `kbis`
- `assurance`
- `cni_recto_verso`
- `iban`
- `decharge_partenariat`

⚠️ **Note** : Le kind `autre` n'est pas requis pour qu'un dossier soit considéré comme complet.

### Mapping en Base de Données

**Table** : `artisan_attachments`

```206:219:supabase/migrations/20251005_clean_schema.sql
CREATE TABLE IF NOT EXISTS public.artisan_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artisan_id uuid REFERENCES public.artisans(id) ON DELETE CASCADE,
  kind text NOT NULL,
  url text NOT NULL,
  mime_type text,
  filename text,
  file_size int,
  created_at timestamptz DEFAULT now(),
  created_by uuid NULL REFERENCES public.users(id),
  created_by_display text NULL,
  created_by_code text NULL,
  created_by_color text NULL
);
```

**Champs** :
- `artisan_id` : Référence vers `artisans.id`
- `kind` : Type de document (pas de contrainte CHECK, validation côté application)
- `url` : URL du document (Google Drive, Supabase Storage ou externe)
- `mime_type`, `filename`, `file_size` : Métadonnées du fichier
- `created_by*` : Informations sur le créateur (UUID, nom, code badge, couleur)

---

## 📊 Comparaison des Deux Systèmes

| Aspect | Interventions | Artisans |
|--------|---------------|----------|
| **Table BDD** | `intervention_attachments` | `artisan_attachments` |
| **Contrainte CHECK** | ✅ Oui (7 valeurs) | ❌ Non (validation côté app) |
| **Edge Function** | `/documents` (unifiée) | `/documents` (unifiée) OU `/artisans-v2/artisans/{id}/documents` |
| **Kinds en BDD** | `intervention`, `cout`, `devis`, `photos`, `factureGMBS`, `factureArtisan`, `factureMateriel` | Aucune restriction |
| **Kinds Edge Function** | `devis`, `photos`, `factureGMBS`, `factureArtisan`, `factureMateriel`, `rapport_intervention`, `plan`, `schema`, `autre` | `kbis`, `assurance`, `cni_recto_verso`, `iban`, `decharge_partenariat`, `certificat`, `siret`, `photo_profil`, `portfolio`, `autre` |
| **Kinds UI** | `devis`, `facture_gmbs`, `facture_materiel`, `photos`, `facture_artisan` | `kbis`, `assurance`, `cni_recto_verso`, `iban`, `decharge_partenariat`, `autre` |
| **Kinds Requis** | ❌ Aucun | ✅ 5 kinds requis : `kbis`, `assurance`, `cni_recto_verso`, `iban`, `decharge_partenariat` |
| **Route API Next.js** | `/api/interventions/[id]/documents` (legacy, non implémentée) | ❌ Aucune |
| **API Client V2** | `documentsApi.getByIntervention()` | `documentsApi.getByArtisan()` OU `artisansApi.createDocument()` |

---

## 🔄 Flux d'Upload

### Pour les Interventions

1. **Frontend** → Appelle `documentsApi.upload()` ou `documentsApi.create()`
2. **Edge Function** → `/documents/documents` ou `/documents/upload`
3. **Validation** → Vérifie `entity_type='intervention'` et `kind` autorisé
4. **Storage** → Upload vers Supabase Storage (si upload avec contenu)
5. **BDD** → Insert dans `intervention_attachments`

### Pour les Artisans

1. **Frontend** → Appelle `documentsApi.upload()` ou `artisansApi.createDocument()`
2. **Edge Function** → `/documents/documents` (unifiée) OU `/artisans-v2/artisans/{id}/documents` (spécifique)
3. **Validation** → Vérifie `entity_type='artisan'` et `kind` autorisé
4. **Storage** → URL externe (Google Drive) ou Supabase Storage
5. **BDD** → Insert dans `artisan_attachments`

---

## 📝 Notes Importantes

1. **Double système pour les artisans** : Deux endpoints peuvent être utilisés :
   - `/artisans-v2/artisans/{id}/documents` (spécifique, moins de métadonnées)
   - `/documents/documents` avec `entity_type='artisan'` (unifiée, plus complète)

2. **Normalisation des kinds** : Pour les interventions, la fonction `normalizeInterventionKind()` convertit les variations (ex: `facture_gmbs` → `factureGMBS`)

3. **Tracking utilisateur** : Les deux systèmes supportent `created_by*` pour tracer qui a créé le document

4. **Suppression** : La suppression supprime à la fois l'enregistrement BDD et le fichier dans Supabase Storage (si applicable)

---

## 📋 Modifications Planifiées des Kinds

> **📝 Voir le document détaillé** : [`MODIFICATIONS_KINDS_DOCUMENTS.md`](./MODIFICATIONS_KINDS_DOCUMENTS.md)

### Nouveaux Kinds à Implémenter

#### **Artisans** (8 kinds finaux)
- `kbis`
- `assurance`
- `cni_recto_verso`
- `iban`
- `decharge_partenariat`
- `photo_profil`
- `autre`
- `a_classe` ⭐ **NOUVEAU** (pas encore d'action dans le CRM)

#### **Interventions** (7 kinds finaux)
- `devis`
- `photos`
- `facturesGMBS` (ou `factureGMBS` selon convention à clarifier)
- `facturesArtisans` (ou `factureArtisan` selon convention à clarifier)
- `facturesMateriel` (ou `factureMateriel` selon convention à clarifier)
- `autre`
- `a_classe` ⭐ **NOUVEAU** (pas encore d'action dans le CRM)

### Kind `a_classe` - Spécifications

Le kind `a_classe` est un nouveau type de document qui indique qu'un document doit être classé/catégorisé ultérieurement. Il n'a **pas encore d'action spécifique dans le CRM**.

**Comportement attendu** :
- Affichage dans l'interface
- Possibilité de filtrer les documents "à classer"
- **Ne compte PAS** dans le calcul du statut de dossier complet pour les artisans
- Un workflow pour reclasser ces documents sera implémenté ultérieurement

Pour plus de détails sur l'implémentation, voir [`MODIFICATIONS_KINDS_DOCUMENTS.md`](./MODIFICATIONS_KINDS_DOCUMENTS.md).

