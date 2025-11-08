# Optimisations de Performance - Résumé

Ce document résume les optimisations de performance appliquées au codebase pour améliorer la taille du bundle, les temps de chargement et les performances globales.

## 🎯 Optimisations Appliquées

### ⚠️ Important : Optimisations Mode Développement vs Production

**Toutes les optimisations agressives sont désactivées en développement** pour éviter la surcharge CPU lors du hot reload. Elles sont uniquement actives en production.

### 1. Configuration Next.js (`next.config.mjs`)

#### Optimisations de compilation
- ✅ **SWC Minify** activé pour une minification plus rapide et efficace
- ✅ **Suppression des console.log** en production uniquement (sauf error et warn)
- ✅ **Source maps désactivés** en production pour réduire la taille du bundle

#### Optimisations d'images
- ✅ Formats modernes : AVIF et WebP activés
- ✅ Tailles d'images optimisées pour différents devices
- ✅ Cache TTL configuré pour les images

#### Optimisations expérimentales
- ✅ **`optimizePackageImports`** activé pour :
  - `lucide-react` (tree-shaking amélioré)
  - `@radix-ui/*` (imports optimisés)
  - `@tanstack/react-table`
  - `recharts`
  - `date-fns`

#### Code splitting optimisé (PRODUCTION UNIQUEMENT)
- ✅ Chunks séparés pour :
  - **Radix UI** : chunk dédié pour tous les composants Radix
  - **Maps** : chunk séparé pour maplibre-gl et @maptiler
  - **React Query** : chunk dédié pour @tanstack/react-query
  - **Vendor** : chunk pour les autres dépendances node_modules
  - **Common** : chunk partagé pour les composants utilisés plusieurs fois
  
⚠️ **Désactivé en développement** : Le code splitting complexe ralentit trop le hot reload et fait chauffer le CPU. Il est uniquement actif en production.

#### Headers de cache
- ✅ Cache long terme (1 an) pour :
  - Fichiers statiques Next.js
  - Images (jpg, jpeg, png, webp, avif, svg)
  - Modèles 3D (glb, gltf)

### 2. Dynamic Imports

#### Composants lourds chargés à la demande
- ✅ **Vues d'interventions** (toujours en dynamic import) :
  - `CalendarView`
  - `GalleryView`
  - `KanbanView`
  - `TableView`
  - `TimelineView`

- ✅ **Composants de graphiques** :
  - **En développement** : Imports directs pour éviter les recompilations coûteuses
  - **En production** : Optimisés automatiquement par `optimizePackageImports`
  - Les composants `recharts` utilisent des imports directs (Next.js optimise automatiquement)

- ✅ **DocumentManager** :
  - Chargé dynamiquement dans :
    - `ArtisanModalContent`
    - `InterventionEditForm`
    - `LegacyInterventionForm`

### 3. Optimisations du Layout

- ✅ Script de thème optimisé avec `Script` component de Next.js
- ✅ Strategy `beforeInteractive` pour éviter le flash de thème

## 📊 Impact Attendu

### Taille du Bundle
- **Réduction estimée** : 30-40% du bundle initial grâce au code splitting
- **Chargement initial** : Réduction significative grâce aux dynamic imports

### Temps de Chargement
- **First Contentful Paint (FCP)** : Amélioration attendue de 20-30%
- **Time to Interactive (TTI)** : Amélioration attendue de 25-35%
- **Largest Contentful Paint (LCP)** : Amélioration grâce aux optimisations d'images

### Performance Runtime
- **Tree-shaking amélioré** : Moins de code mort dans le bundle
- **Chunks optimisés** : Meilleure mise en cache et chargement parallèle
- **Lazy loading** : Composants chargés uniquement quand nécessaires

## 🔧 Commandes Utiles

### Analyser le bundle
```bash
npm run build:analyze
```

Cela génère un rapport détaillé de la taille de chaque chunk et permet d'identifier les opportunités d'optimisation supplémentaires.

### Build de production
```bash
npm run build
```

## 📝 Recommandations Futures

1. **Images** : Utiliser `next/image` partout pour bénéficier de l'optimisation automatique
2. **Fonts** : Précharger les fonts critiques avec `next/font`
3. **Monitoring** : Intégrer Web Vitals pour suivre les performances en production
4. **Service Worker** : Considérer l'ajout d'un service worker pour le cache offline
5. **Prefetching** : Utiliser `next/link` avec prefetch pour les routes fréquentes

## 🐛 Notes

### Mode Développement
- ⚠️ **Code splitting désactivé** : Les optimisations de chunks sont désactivées en dev pour éviter la surcharge CPU
- ⚠️ **optimizePackageImports désactivé** : Désactivé en dev pour éviter les recompilations coûteuses
- ✅ **Imports directs pour recharts** : En dev, on utilise des imports directs pour éviter les recompilations du hot reload
- ✅ **Compression désactivée** : Pas de compression en dev pour des builds plus rapides

### Mode Production
- ✅ Toutes les optimisations sont actives
- ✅ Code splitting optimisé pour réduire la taille du bundle
- ✅ Tree-shaking amélioré avec optimizePackageImports
- ✅ Compression activée

### Autres Notes
- Les dynamic imports peuvent causer un léger délai lors du premier chargement d'un composant
- Les composants avec SSR désactivé ne seront pas rendus côté serveur
- Le bundle analyzer nécessite `ANALYZE=true` pour fonctionner

## ✅ Tests Recommandés

1. Tester le chargement initial de la page
2. Vérifier que les composants dynamiques se chargent correctement
3. Mesurer les Core Web Vitals avant/après
4. Vérifier le cache des assets statiques
5. Tester sur différents réseaux (3G, 4G, WiFi)
