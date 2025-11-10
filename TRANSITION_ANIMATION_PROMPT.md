# Prompt : Animation de transition login → dashboard avec effet de cercle révélateur

## Vue d'ensemble

Implémentation d'une animation de transition fluide entre la page de connexion et le dashboard utilisant un effet de cercle révélateur. Le cercle s'agrandit depuis le bouton "Se connecter" pour révéler progressivement le dashboard en dessous, tandis que la page de login reste visible à l'extérieur du cercle pendant toute l'animation.

## Architecture technique

### Structure des couches (z-index)

L'animation utilise un système de couches empilées avec des z-index spécifiques :

1. **Page login (z-index: 20)** : Page de connexion visible normalement, reste visible à l'extérieur du cercle pendant l'animation
2. **Dashboard conteneur (z-index: 30)** : Conteneur fixe contenant l'iframe du dashboard, masqué avec `clipPath` et révélé progressivement à l'intérieur du cercle

### Composants impliqués

#### 1. Hook personnalisé : `useRevealTransition`

**Fichier** : `src/hooks/useRevealTransition.ts`

**Responsabilités** :
- Gérer l'état de l'animation (`isAnimating`)
- Calculer la position du bouton via `getBoundingClientRect()`
- Calculer la taille maximale du cercle : `Math.sqrt(window.innerWidth² + window.innerHeight²)`
- Animer la taille du cercle avec Framer Motion (`useMotionValue` + `useSpring`)
- Courbe d'animation : `easeOutCubic` ([0.33, 1, 0.68, 1])
- Durée : 3 secondes (3000ms)

**API retournée** :
```typescript
{
  isAnimating: boolean
  circleSizeMotion: MotionValue<number>
  buttonPosition: { x: number, y: number } | null
  startAnimation: (buttonRef: RefObject<HTMLButtonElement>) => void
  maxCircleSize: number
}
```

#### 2. Page login modifiée

**Fichier** : `app/(auth)/login/page.tsx`

**Modifications principales** :
- Ajout du hook `useRevealTransition`
- Préchargement du dashboard avec `router.prefetch('/dashboard')`
- Refs pour le bouton et le conteneur dashboard
- Gestion de l'état `isAuthenticated` et `shouldPreloadDashboard`
- Animation du `clipPath` synchronisée avec le motion value
- Gestion de la transition finale (retrait du clipPath, masquage de la page login)

## Flux d'exécution détaillé

### Phase 1 : Initialisation

1. **Au chargement de la page login** :
   - `router.prefetch('/dashboard')` précharge la route dashboard
   - Le hook `useRevealTransition` initialise les motion values
   - Calcul de la taille maximale du cercle au chargement et au resize

### Phase 2 : Authentification réussie

2. **Après soumission du formulaire et authentification réussie** :
   ```typescript
   setIsAuthenticated(true)
   setShouldPreloadDashboard(true)
   router.prefetch(redirect) // Préchargement supplémentaire
   setTimeout(() => {
     startAnimation(buttonRef)
   }, 100) // Délai pour laisser l'iframe commencer à charger
   ```

3. **Démarrage de l'animation** :
   - Calcul de la position du bouton : `rect.left + rect.width/2, rect.top + rect.height/2`
   - Initialisation de `buttonPosition` avec les coordonnées calculées
   - `isAnimating` passe à `true`
   - L'animation du cercle démarre : `circleSizeMotion.set(0)` → `circleSizeSpring.set(maxCircleSize)`

### Phase 3 : Animation du cercle (0-3000ms)

4. **Rendu des conteneurs** :
   - La page login reste visible (z-index: 20)
   - Le conteneur dashboard apparaît (z-index: 30) avec `clipPath: circle(0px at X Y)`
   - L'iframe commence à charger `/dashboard` en arrière-plan

5. **Animation du clipPath** :
   ```typescript
   circleSizeMotion.on('change', (size) => {
     const clipPath = `circle(${size}px at ${buttonPosition.x}px ${buttonPosition.y}px)`
     // Application du clipPath au conteneur dashboard
     dashboardContainerRef.current.style.clipPath = clipPath
     dashboardContainerRef.current.style.webkitClipPath = clipPath
   })
   ```

6. **Effet visuel** :
   - Le cercle s'agrandit depuis le centre du bouton "Se connecter"
   - À l'intérieur du cercle : le dashboard apparaît progressivement
   - À l'extérieur du cercle : la page login reste visible
   - Courbe d'animation `easeOutCubic` pour un effet naturel

### Phase 4 : Fin de l'animation (après 3000ms)

7. **Transition finale** :
   ```typescript
   setTimeout(() => {
     // Retirer le clipPath pour rendre l'iframe pleine page
     dashboardContainerRef.current.style.clipPath = 'none'
     dashboardContainerRef.current.style.webkitClipPath = 'none'
     
     // Activer les interactions
     iframe.style.pointerEvents = 'auto'
     dashboardContainerRef.current.style.pointerEvents = 'auto'
     
     // Masquer la page login
     loginPage.style.display = 'none'
   }, 3000)
   ```

8. **Résultat** :
   - L'iframe dashboard prend le contrôle complet de l'écran
   - La page login est masquée
   - Les interactions sont activées
   - **Aucun rechargement** : l'iframe reste en place

## Détails techniques critiques

### ClipPath et compatibilité navigateurs

**ClipPath pour le dashboard** :
```css
clipPath: circle(size px at x px y px)
-webkitClipPath: circle(size px at x px y px) /* Safari */
```

**Pourquoi pas d'overlay blanc ?**
- Initialement prévu un overlay blanc (z-index: 25) pour masquer l'extérieur
- Finalement supprimé car le clipPath du dashboard limite naturellement sa visibilité
- La page login reste visible à l'extérieur grâce à son z-index inférieur (20)

### Gestion de l'iframe

**Pourquoi une iframe ?**
- Permet de précharger le dashboard sans naviguer immédiatement
- L'iframe charge `/dashboard` avec les cookies de session après authentification
- Évite le rechargement visible en gardant l'iframe en place après l'animation

**Optimisations** :
- `loading="eager"` pour charger l'iframe rapidement
- `pointerEvents: 'none'` pendant l'animation pour éviter les interactions accidentelles
- Création de l'iframe seulement après authentification (`shouldPreloadDashboard`) pour avoir accès aux cookies

### Calcul de la taille maximale du cercle

```typescript
const maxCircleSize = Math.sqrt(
  window.innerWidth * window.innerWidth + 
  window.innerHeight * window.innerHeight
)
```

**Pourquoi cette formule ?**
- Garantit que le cercle couvre tout l'écran quelle que soit la taille
- Utilise la diagonale de l'écran comme rayon maximum
- Recalculée au resize pour le responsive

### Position du bouton

```typescript
const rect = buttonRef.current.getBoundingClientRect()
const x = rect.left + rect.width / 2  // Centre horizontal
const y = rect.top + rect.height / 2 // Centre vertical
```

**Pourquoi `getBoundingClientRect()` ?**
- Calcul dynamique de la position réelle du bouton dans le viewport
- Fonctionne même si le bouton change de position (responsive, scroll, etc.)
- Calculé au moment du déclenchement pour garantir la précision

## Solutions aux problèmes rencontrés

### Problème 1 : Le dashboard ne s'affichait pas

**Cause** : L'iframe était créée avant l'authentification, donc sans accès aux cookies de session.

**Solution** : Créer l'iframe seulement après authentification réussie :
```typescript
setIsAuthenticated(true)
setShouldPreloadDashboard(true) // Crée l'iframe après auth
```

### Problème 2 : Rechargement visible après 3 secondes

**Cause** : Navigation avec `router.push()` ou `router.replace()` causait un rechargement complet.

**Solution** : Ne pas naviguer, mais rendre l'iframe pleine page :
```typescript
// Retirer le clipPath au lieu de naviguer
dashboardContainerRef.current.style.clipPath = 'none'
loginPage.style.display = 'none'
```

### Problème 3 : La page login disparaissait à l'extérieur du cercle

**Cause** : Overlay blanc masquait tout l'écran.

**Solution** : Supprimer l'overlay blanc. Le clipPath du dashboard limite naturellement sa visibilité, laissant la page login visible à l'extérieur grâce au z-index.

### Problème 4 : Compatibilité Safari

**Cause** : Safari nécessite le préfixe `-webkit-` pour clipPath.

**Solution** : Application des deux propriétés :
```typescript
element.style.clipPath = clipPath
element.style.webkitClipPath = clipPath
```

## Optimisations de performance

1. **Préchargement** : `router.prefetch('/dashboard')` au chargement de la page login
2. **Délai avant animation** : 100ms pour laisser l'iframe commencer à charger
3. **Motion values** : Utilisation de Framer Motion pour des animations performantes avec `requestAnimationFrame`
4. **Cleanup** : Nettoyage des event listeners et timers dans les `useEffect`

## Accessibilité

- `aria-hidden="true"` sur les conteneurs d'animation
- `pointerEvents: 'none'` pendant l'animation pour éviter les interactions accidentelles
- Titre descriptif sur l'iframe : `title="Dashboard"`

## Responsive

- Calcul dynamique de la taille max du cercle au resize
- Position du bouton calculée dynamiquement (fonctionne sur mobile et desktop)
- Le cercle couvre toujours tout l'écran quelle que soit la taille

## Courbe d'animation

**EaseOutCubic** : `[0.33, 1, 0.68, 1]`
- Démarrage rapide
- Ralentissement progressif vers la fin
- Effet naturel et fluide

## Durée

**3 secondes (3000ms)**
- Assez long pour être visible et appréciable
- Assez court pour ne pas être frustrant
- Permet à l'iframe de charger pendant l'animation

## Résultat final

Une transition fluide et moderne où :
1. ✅ Le cercle part du bouton "Se connecter"
2. ✅ Le dashboard apparaît progressivement à l'intérieur du cercle
3. ✅ La page login reste visible à l'extérieur du cercle
4. ✅ Aucun rechargement visible après l'animation
5. ✅ L'iframe prend le contrôle de l'écran une fois l'animation terminée
6. ✅ Expérience utilisateur fluide et moderne

