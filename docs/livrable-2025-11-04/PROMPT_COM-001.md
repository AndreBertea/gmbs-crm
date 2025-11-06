# 🎯 Prompt pour Codex - COM-001 : Gestion complète des commentaires

**Sous-tâche de ARC-001** | **Pré-requis pour l'archivage**

---

## 📋 Contexte

La fonctionnalité d'archivage (ARC-001) nécessite un système de commentaires fonctionnel. Actuellement :
- ✅ Table `comments` existe en BDD
- ✅ Edge Function `/comments` existe
- ✅ Interfaces TypeScript définies
- ❌ **Mais l'UI ne fonctionne pas** dans les fiches artisans et interventions

Cette tâche doit implémenter la **gestion complète des commentaires** dans les deux pages.

---

## 🎯 Objectif

Rendre fonctionnelle la section "Commentaires" dans :
1. **Fiche Artisan** (`src/components/ui/artisan-modal/ArtisanModalContent.tsx`)
2. **Fiche Intervention** (`src/components/interventions/InterventionEditForm.tsx`)

**Approche** :
- S'inspirer de la logique du projet legacy
- Améliorer l'implémentation graphique
- Mapper correctement avec la table `comments`
- Assurer la traçabilité (auteur, date, historique)

---

## 📊 Structure BDD existante

### Table `comments`

```sql
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type text NOT NULL CHECK (entity_type IN ('artisan','intervention','task','client')),
  entity_id uuid NOT NULL,
  author_id uuid REFERENCES public.users(id),
  content text NOT NULL,
  comment_type text CHECK (comment_type IN ('internal','external','system')),
  is_internal boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Interfaces TypeScript existantes

```typescript
// src/lib/api/v2/common/types.ts
export interface Comment {
  id: string;
  entity_id: string;
  entity_type: "intervention" | "artisan" | "client";
  content: string;
  comment_type: string;
  is_internal: boolean | null;
  author_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  users?: {
    id: string;
    firstname: string | null;
    lastname: string | null;
    username: string;
  };
}
```

---

## 🔧 Implémentation

### Étape 1 : Créer l'API Client pour les commentaires

**Fichier** : `src/lib/api/v2/commentsApi.ts` (existe déjà, vérifier et améliorer si nécessaire)

```typescript
import { Comment, CreateCommentData } from './common/types';

const COMMENTS_API_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/comments`;

export const commentsApi = {
  // Récupérer les commentaires d'une entité
  async getByEntity(entityType: 'artisan' | 'intervention', entityId: string): Promise<Comment[]> {
    const response = await fetch(
      `${COMMENTS_API_URL}/comments?entity_type=${entityType}&entity_id=${entityId}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    
    return response.json();
  },

  // Créer un commentaire
  async create(data: CreateCommentData): Promise<Comment> {
    const response = await fetch(`${COMMENTS_API_URL}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create comment');
    }
    
    return response.json();
  },

  // Supprimer un commentaire (optionnel)
  async delete(commentId: string): Promise<void> {
    const response = await fetch(`${COMMENTS_API_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
  },
};
```

---

### Étape 2 : Créer un composant réutilisable `CommentSection`

**Nouveau fichier** : `src/components/shared/CommentSection.tsx`

```tsx
"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { commentsApi } from "@/lib/api/v2/commentsApi"
import type { Comment } from "@/lib/api/v2/common/types"

interface CommentSectionProps {
  entityType: "artisan" | "intervention"
  entityId: string
  currentUserId?: string
}

const formatDate = (value: string | null | undefined, withTime = false) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  try {
    return new Intl.DateTimeFormat("fr-FR", 
      withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }
    ).format(date)
  } catch {
    return value
  }
}

export function CommentSection({ entityType, entityId, currentUserId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Récupérer les commentaires
  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => commentsApi.getByEntity(entityType, entityId),
    enabled: Boolean(entityId),
  })

  // Mutation pour créer un commentaire
  const createComment = useMutation({
    mutationFn: (content: string) => 
      commentsApi.create({
        entity_id: entityId,
        entity_type: entityType,
        content,
        comment_type: "internal",
        is_internal: true,
        author_id: currentUserId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", entityType, entityId] })
      setNewComment("")
      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été enregistré avec succès.",
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'ajouter le commentaire",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    createComment.mutate(newComment)
  }

  return (
    <div className="space-y-4">
      {/* Historique des commentaires */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-20 rounded bg-muted animate-pulse" />
          <div className="h-20 rounded bg-muted animate-pulse" />
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => {
            const author = comment.users
              ? [comment.users.firstname, comment.users.lastname].filter(Boolean).join(" ") || comment.users.username
              : "Utilisateur"

            return (
              <div
                key={comment.id}
                className="rounded border border-muted/60 bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">{author}</span>
                  <span>{formatDate(comment.created_at, true)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground">
                  {comment.content}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun commentaire pour le moment.
        </p>
      )}

      {/* Formulaire d'ajout */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-comment">Ajouter un commentaire</Label>
        <Textarea
          id="new-comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
          placeholder="Écrivez votre commentaire ici..."
          disabled={createComment.isPending}
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!newComment.trim() || createComment.isPending}
            size="sm"
          >
            {createComment.isPending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

---

### Étape 3 : Intégrer dans `ArtisanModalContent`

**Fichier** : `src/components/ui/artisan-modal/ArtisanModalContent.tsx`

**Remplacer** la section Commentaires (lignes 692-727) par :

```tsx
import { CommentSection } from "@/components/shared/CommentSection"

// Dans le renderContent(), remplacer la Card "Commentaires" :

<Card>
  <CardHeader>
    <CardTitle>Commentaires</CardTitle>
  </CardHeader>
  <CardContent>
    <CommentSection 
      entityType="artisan" 
      entityId={artisanId}
      currentUserId={currentUser?.id}
    />
  </CardContent>
</Card>
```

**Note** : Supprimer l'ancien code qui utilisait `commentHistoryList` et le champ `commentaire` lié à `suivi_relances_docs`.

---

### Étape 4 : Intégrer dans `InterventionEditForm`

**Fichier** : `src/components/interventions/InterventionEditForm.tsx`

Ajouter une nouvelle section (après Documents) :

```tsx
import { CommentSection } from "@/components/shared/CommentSection"

// Ajouter un nouvel état Collapsible pour les commentaires
const [isCommentsOpen, setIsCommentsOpen] = useState(false)

// Dans le JSX, après la section Documents :

<Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
  <Card>
    <CollapsibleTrigger asChild>
      <CardHeader className="cursor-pointer pb-3 hover:bg-muted/50">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          Commentaires
          <ChevronDown className={cn(
            "ml-auto h-4 w-4 transition-transform",
            isCommentsOpen && "rotate-180"
          )} />
        </CardTitle>
      </CardHeader>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <CardContent className="pt-0">
        <CommentSection 
          entityType="intervention" 
          entityId={intervention.id}
          currentUserId={currentUser?.id}
        />
      </CardContent>
    </CollapsibleContent>
  </Card>
</Collapsible>
```

---

### Étape 5 : Vérifier l'Edge Function

**Fichier** : `supabase/functions/comments/index.ts`

S'assurer que l'Edge Function répond correctement aux requêtes :

**Endpoints à vérifier** :
- `GET /comments?entity_type=artisan&entity_id={uuid}` → Liste des commentaires
- `POST /comments` → Créer un commentaire
- `DELETE /comments/{id}` → Supprimer un commentaire (optionnel)

**Ajout important** : L'Edge Function doit joindre les informations utilisateur :

```sql
SELECT 
  c.id,
  c.entity_id,
  c.entity_type,
  c.content,
  c.comment_type,
  c.is_internal,
  c.author_id,
  c.created_at,
  c.updated_at,
  json_build_object(
    'id', u.id,
    'firstname', u.firstname,
    'lastname', u.lastname,
    'username', u.username
  ) as users
FROM comments c
LEFT JOIN users u ON u.id = c.author_id
WHERE c.entity_type = $1 AND c.entity_id = $2
ORDER BY c.created_at DESC;
```

---

## 📝 Checklist d'implémentation

### Backend
- [ ] Vérifier Edge Function `/comments` (GET, POST, DELETE)
- [ ] S'assurer que les commentaires incluent les infos utilisateur (JOIN)
- [ ] Tester les endpoints avec Postman ou `curl`

### Frontend - Composant partagé
- [ ] Créer `src/components/shared/CommentSection.tsx`
- [ ] Implémenter `commentsApi` dans `src/lib/api/v2/commentsApi.ts`
- [ ] Gérer les états de chargement et erreurs
- [ ] Afficher l'historique avec auteur + date
- [ ] Formulaire d'ajout avec validation

### Frontend - Artisans
- [ ] Intégrer `CommentSection` dans `ArtisanModalContent.tsx`
- [ ] Supprimer l'ancien code `suivi_relances_docs`
- [ ] Tester l'ajout/affichage de commentaires

### Frontend - Interventions
- [ ] Intégrer `CommentSection` dans `InterventionEditForm.tsx`
- [ ] Ajouter section collapsible "Commentaires"
- [ ] Tester l'ajout/affichage de commentaires

### Tests
- [ ] Test manuel : Ajouter un commentaire sur un artisan → Visible immédiatement
- [ ] Test manuel : Ajouter un commentaire sur une intervention → Visible immédiatement
- [ ] Test manuel : Vérifier l'auteur et la date
- [ ] Test manuel : Recharger la page → Commentaires persistent

---

## 🎯 Résultat attendu

### Artisan
1. Ouvrir une fiche artisan
2. Section "Commentaires" affiche l'historique (si existant)
3. Ajouter un commentaire → Envoyé avec succès
4. Commentaire apparaît immédiatement dans l'historique avec nom + date

### Intervention
1. Ouvrir une fiche intervention en édition
2. Section "Commentaires" (collapsible) affiche l'historique
3. Ajouter un commentaire → Envoyé avec succès
4. Commentaire apparaît immédiatement dans l'historique avec nom + date

---

## 🔗 Lien avec ARC-001

Une fois COM-001 terminé, l'implémentation de ARC-001 sera triviale :

**ARC-001 pourra simplement** :
1. Ajouter un commentaire système lors de l'archivage :
```typescript
await commentsApi.create({
  entity_id: artisanId,
  entity_type: "artisan",
  content: `Artisan archivé.\nMotif : ${archived_reason}`,
  comment_type: "system",
  is_internal: true,
  author_id: currentUserId,
})
```

2. Mettre à jour les champs BDD :
```sql
UPDATE artisans SET
  archived_at = NOW(),
  archived_by = {user_id},
  archived_reason = {reason}
WHERE id = {artisan_id};
```

3. Afficher le statut archivé dans l'UI avec badge + commentaire système

---

## 📚 Fichiers à modifier

### Nouveaux fichiers
- `src/components/shared/CommentSection.tsx`

### Fichiers à modifier
- `src/lib/api/v2/commentsApi.ts` (vérifier/améliorer)
- `src/components/ui/artisan-modal/ArtisanModalContent.tsx` (lignes 692-727)
- `src/components/interventions/InterventionEditForm.tsx` (ajouter section)
- `supabase/functions/comments/index.ts` (vérifier JOIN users)

### Fichiers à vérifier
- `src/lib/api/v2/common/types.ts` (interfaces déjà définies ✅)
- `supabase/migrations/20251005_clean_schema.sql` (table comments existe ✅)

---

## ⚠️ Points d'attention

1. **Ne pas confondre** `suivi_relances_docs` (champ texte simple) et `comments` (table relationnelle avec historique)
2. **Supprimer** l'ancien code qui utilisait `commentaire` dans le formulaire artisan
3. **Unifier** la logique entre artisans et interventions via `CommentSection`
4. **Traçabilité** : Toujours afficher l'auteur + date + heure
5. **Temps réel** : Utiliser React Query pour invalidation automatique après ajout

---

## 🎯 Estimation

**Durée** : 1.5-2j
- Backend vérification : 0.5j
- Composant CommentSection : 0.5j
- Intégration artisans : 0.25j
- Intégration interventions : 0.25j
- Tests manuels : 0.5j

**Complexité** : 🟡 Moyenne

---

**Une fois COM-001 terminé, ARC-001 ne prendra que 0.5j supplémentaire !** 🚀

