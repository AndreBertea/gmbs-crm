# API V2 - Architecture Modulaire

## 🎯 Vue d'ensemble

L'API V2 a été refactorisée en architecture modulaire pour améliorer la maintenabilité et la lisibilité du code. Chaque domaine métier a maintenant son propre fichier API dédié.

## 📁 Structure des fichiers

```
src/lib/api/v2/
├── common/
│   ├── types.ts          # Types TypeScript communs
│   └── utils.ts          # Utilitaires partagés
├── usersApi.ts           # Gestion des utilisateurs
├── interventionsApi.ts   # Gestion des interventions
├── artisansApi.ts        # Gestion des artisans
├── clientsApi.ts         # Gestion des clients
├── documentsApi.ts       # Gestion des documents
├── commentsApi.ts        # Gestion des commentaires
├── rolesApi.ts          # Gestion des rôles et permissions
├── utilsApi.ts          # Utilitaires avancés
└── index.ts             # Point d'entrée central
```

## 🚀 Utilisation

### Import simple
```typescript
import { usersApi, interventionsApi, artisansApi } from '@/lib/api/v2';
```

### Import avec alias (compatibilité)
```typescript
import { usersApiV2, interventionsApiV2 } from '@/lib/api/v2';
```

### Import par défaut
```typescript
import api from '@/lib/api/v2';
// Utilisation: api.users.getAll()
```

## 📋 APIs disponibles

### 👥 Users API (`usersApi`)
- `getAll()` - Récupérer tous les utilisateurs
- `getById()` - Récupérer un utilisateur par ID
- `create()` - Créer un utilisateur complet (auth + profile)
- `update()` - Modifier un utilisateur
- `delete()` - Supprimer un utilisateur
- `assignRoles()` - Assigner des rôles
- `getUserPermissions()` - Récupérer les permissions
- `getUsersByRole()` - Récupérer les utilisateurs par rôle
- `getStats()` - Statistiques des utilisateurs

### 🔧 Interventions API (`interventionsApi`)
- `getAll()` - Récupérer toutes les interventions
- `getById()` - Récupérer une intervention par ID
- `create()` - Créer une intervention
- `update()` - Modifier une intervention
- `delete()` - Supprimer une intervention
- `assignArtisan()` - Assigner un artisan
- `addCost()` - Ajouter un coût
- `addPayment()` - Ajouter un paiement
- `getByUser()` - Interventions par utilisateur
- `getByStatus()` - Interventions par statut

### 👷 Artisans API (`artisansApi`)
- `getAll()` - Récupérer tous les artisans
- `getById()` - Récupérer un artisan par ID
- `create()` - Créer un artisan
- `update()` - Modifier un artisan
- `delete()` - Supprimer un artisan
- `assignMetier()` - Assigner un métier
- `assignZone()` - Assigner une zone
- `searchByName()` - Rechercher par nom
- `getByGestionnaire()` - Artisans par gestionnaire

### 👤 Clients API (`clientsApi`)
- `getAll()` - Récupérer tous les clients
- `getById()` - Récupérer un client par ID
- `create()` - Créer un client
- `update()` - Modifier un client
- `delete()` - Supprimer un client
- `searchByName()` - Rechercher par nom
- `searchByEmail()` - Rechercher par email
- `getByCity()` - Clients par ville

### 📄 Documents API (`documentsApi`)
- `getAll()` - Récupérer tous les documents
- `getById()` - Récupérer un document par ID
- `create()` - Créer un document
- `upload()` - Upload un fichier
- `update()` - Modifier un document
- `delete()` - Supprimer un document
- `getByIntervention()` - Documents d'une intervention
- `getByArtisan()` - Documents d'un artisan

### 💬 Comments API (`commentsApi`)
- `getAll()` - Récupérer tous les commentaires
- `getById()` - Récupérer un commentaire par ID
- `create()` - Créer un commentaire
- `update()` - Modifier un commentaire
- `delete()` - Supprimer un commentaire
- `getByIntervention()` - Commentaires d'une intervention
- `getByArtisan()` - Commentaires d'un artisan
- `getInternal()` - Commentaires internes
- `getExternal()` - Commentaires externes

### 🎭 Roles API (`rolesApi`)
- `getAll()` - Récupérer tous les rôles
- `getById()` - Récupérer un rôle par ID
- `create()` - Créer un rôle
- `update()` - Modifier un rôle
- `delete()` - Supprimer un rôle
- `assignPermissions()` - Assigner des permissions
- `getUsersByRole()` - Utilisateurs ayant un rôle

### 🔑 Permissions API (`permissionsApi`)
- `getAll()` - Récupérer toutes les permissions
- `getById()` - Récupérer une permission par ID
- `create()` - Créer une permission
- `update()` - Modifier une permission
- `delete()` - Supprimer une permission
- `getRolesByPermission()` - Rôles ayant une permission

### 🛠️ Utils API (`utilsApi`)
- `fileToBase64()` - Convertir fichier en base64
- `formatFileSize()` - Formater taille de fichier
- `isValidEmail()` - Valider email
- `isValidUsername()` - Valider nom d'utilisateur
- `generateSecurePassword()` - Générer mot de passe sécurisé
- `generateUniqueCodeGestionnaire()` - Générer code gestionnaire unique
- `validateUserData()` - Valider données utilisateur

## 🔄 Migration depuis l'ancienne API

### Avant (monolithique)
```typescript
import { usersApiV2, interventionsApiV2 } from '@/lib/supabase-api-v2';
```

### Après (modulaire)
```typescript
import { usersApi, interventionsApi } from '@/lib/api/v2';
```

## ✅ Avantages de la nouvelle architecture

1. **📦 Modularité** - Chaque API est dans son propre fichier
2. **🔍 Lisibilité** - Code plus facile à comprendre et maintenir
3. **🚀 Performance** - Import seulement des APIs nécessaires
4. **🧪 Testabilité** - Tests plus faciles à écrire et maintenir
5. **👥 Collaboration** - Équipes peuvent travailler sur différents modules
6. **📈 Évolutivité** - Ajout de nouvelles fonctionnalités plus simple
7. **🔄 Réutilisabilité** - Types et utilitaires partagés

## 🎯 Bonnes pratiques

### Import spécifique
```typescript
// ✅ Bon - Import seulement ce dont vous avez besoin
import { usersApi, utilsApi } from '@/lib/api/v2';

// ❌ Éviter - Import de tout
import * as api from '@/lib/api/v2';
```

### Gestion des erreurs
```typescript
try {
  const user = await usersApi.create(userData);
  console.log('Utilisateur créé:', user);
} catch (error) {
  console.error('Erreur création utilisateur:', error.message);
}
```

### Validation des données
```typescript
const validation = utilsApi.validateUserData(userData);
if (!validation.isValid) {
  throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
}
```

## 🔧 Configuration

Toutes les APIs utilisent la même configuration Supabase :
- **URL des fonctions** : `http://localhost:54321/functions/v1`
- **Headers** : Service role key automatique
- **Cache** : Système de cache intégré pour les données de référence

## 📚 Exemples complets

Voir le fichier `examples/UserManagementExamples.ts` pour des exemples d'utilisation complets de toutes les APIs.
