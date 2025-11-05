# Référence Design UI – Couleurs, Profondeur & Ombres (d’après Sajid)

> **But** : servir de fichier de référence pour Codex (ou tout LLM/codegen) afin d’appliquer rapidement les conseils de Sajid sur **les couleurs, la profondeur (depth), les ombres, les dégradés, les highlights** et la gestion **light/dark mode** dans une app **React + Next.js**.  
> **Esprit** : *opinionated mais personnalisable* — utilisez ces règles comme base, adaptez les valeurs à votre brand.

---

## 0) TL;DR opérationnel (point d’entrée rapide)

1. **Palette minimale et hiérarchisée** : Neutres (fond/texte), Accent (brand), Sémantiques (succès/erreur/alerte).  
2. **Profondeur par 3 nuances** d’un même ton : `bg-dark` (arrière-plan), `bg` (surfaces), `bg-light` (éléments élevés).  
3. **Ombre réaliste = 2 couches** : une **courte & foncée** + une **plus longue & claire** (+ *highlight* très clair en haut).  
4. **Dégradés subtils** (haut → bas) et **bord haut “highlight”** pour simuler la lumière venant d’en haut.  
5. **Dark-first** puis **inversion** pour le light mode, ensuite *tweak* (surtout les highlights/borders).  
6. **OKLCH recommandé** (meilleure uniformité que HSL). Garder **HSL fallback** au besoin.

---

## 1) Structure de thème (CSS variables)

> Définissez vos tokens au niveau `:root` (light) et sur `[data-theme="dark"]` (dark). Exemple avec **OKLCH** + fallback **HSL** (définissez d’abord HSL, puis OKLCH par-dessus — les navigateurs anciens liront HSL).

```css
/* Light (par défaut) */
:root {
  /* Neutres (3 couches pour depth) */
  --bg-dark-hsl: hsl(210 6% 92%);
  --bg-hsl:      hsl(210 6% 96%);
  --bg-light-hsl:hsl(210 10% 99%);

  --bg-dark: oklch(0.92 0.01 240);
  --bg:      oklch(0.96 0.01 240);
  --bg-light:oklch(0.99 0.004 240);

  /* Texte */
  --text-hsl:        hsl(220 15% 14%);
  --text-muted-hsl:  hsl(220 10% 40%);
  --text:        oklch(0.18 0.03 260);
  --text-muted:  oklch(0.45 0.02 260);

  /* Bordures & highlight (light mode = très clairs) */
  --border-hsl:      hsl(210 10% 96%); /* même ton que la carte => “disparaît” */
  --highlight-hsl:   hsl(0 0% 100%);   /* vrai highlight */
  --border:    oklch(0.96 0.004 240);
  --highlight: oklch(1 0 0);

  /* Accent (brand) : clair en dark, plus sombre en light */
  --accent-hsl:      hsl(270 75% 36%);
  --accent:          oklch(0.55 0.21 300);

  /* Ombres (utiliser 2 couches) */
  --shadow-sm-1: 0 2px 4px rgba(0,0,0,.18);
  --shadow-sm-2: 0 6px 12px rgba(0,0,0,.08);
  --shadow-lg-1: 0 8px 16px rgba(0,0,0,.16);
  --shadow-lg-2: 0 24px 40px rgba(0,0,0,.08);
}

/* Dark */
:root[data-theme="dark"] {
  /* Inversion + ajustements pour rendre la lumière crédible */
  --bg-dark-hsl: hsl(220 12% 6%);
  --bg-hsl:      hsl(220 10% 12%);
  --bg-light-hsl:hsl(220 8% 18%);

  --bg-dark: oklch(0.07 0.02 260);
  --bg:      oklch(0.12 0.02 260);
  --bg-light:oklch(0.18 0.02 260);

  --text-hsl:       hsl(0 0% 98%);
  --text-muted-hsl: hsl(220 10% 68%);
  --text:        oklch(0.98 0 0);
  --text-muted:  oklch(0.70 0.02 260);

  /* En dark, highlight = un peu plus clair que la surface */
  --border-hsl:    hsl(220 8% 14%);
  --highlight-hsl: hsl(220 10% 26%);
  --border:    oklch(0.14 0.02 260);
  --highlight: oklch(0.26 0.02 260);

  /* Accent plus clair en dark */
  --accent-hsl:    hsl(270 75% 76%);
  --accent:        oklch(0.78 0.21 300);

  /* Ombres en dark : un peu plus courtes/légères + privilégier le highlight */
  --shadow-sm-1: 0 2px 4px rgba(0,0,0,.30);
  --shadow-sm-2: 0 6px 12px rgba(0,0,0,.18);
  --shadow-lg-1: 0 8px 16px rgba(0,0,0,.28);
  --shadow-lg-2: 0 24px 40px rgba(0,0,0,.16);
}
```

> **Principes clés** :  
> • **3 couches neutres** = séparation visuelle sans border lourde.  
> • **Highlight top** (quasi blanc en light / plus clair que surface en dark).  
> • **Ombre double** = réaliste : *courte & foncée* + *longue & claire* (alpha bas).  
> • **Accent inversé** entre light/dark pour conserver le contraste.

---

## 2) Composants de base (patterns réutilisables)

### 2.1 Carte (surface élevée)

```css
.card {
  background: var(--bg-light);
  /* Dégradé subtil (haut plus clair) */
  background-image: linear-gradient(to bottom, color-mix(in oklab, var(--bg-light), white 6%), var(--bg-light));
  border: 1px solid var(--border);          /* Light: fond ≈ border (discret) */
  /* Highlight top : simule la lumière */
  box-shadow:
    inset 0 1px 0 var(--highlight),          /* highlight interne en haut */
    var(--shadow-sm-1), var(--shadow-sm-2);  /* ombre double */
  border-radius: 12px;
}
.card--hover:hover {
  /* Renforcer légèrement le dégradé et l’ombre */
  background-image: linear-gradient(to bottom, color-mix(in oklab, var(--bg-light), white 10%), var(--bg-light));
  box-shadow:
    inset 0 1px 0 var(--highlight),
    var(--shadow-lg-1), var(--shadow-lg-2);
}
```

### 2.2 Bouton primaire

```css
.button {
  --btn-bg: var(--accent);
  color: var(--bg-light); /* texte clair */
  background: linear-gradient(to bottom, color-mix(in oklab, var(--accent), white 8%), var(--accent));
  border: 1px solid color-mix(in oklab, var(--accent), black 10%);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--accent), white 30%), /* highlight top */
    0 2px 4px rgba(0,0,0,.18), 0 8px 16px rgba(0,0,0,.10);       /* ombre double */
  border-radius: 10px;
  padding: .625rem .9rem;
  font-weight: 600;
}
.button:hover {
  background: linear-gradient(to bottom, color-mix(in oklab, var(--accent), white 12%), var(--accent));
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--accent), white 30%),
    0 4px 8px rgba(0,0,0,.20), 0 14px 24px rgba(0,0,0,.12);
}
.button:active {
  transform: translateY(0);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--accent), white 30%),
    0 1px 2px rgba(0,0,0,.18), 0 4px 8px rgba(0,0,0,.10);
}
```

### 2.3 Barre de navigation (layering + ombre + highlight)

```css
.navbar {
  background: var(--bg);
  background-image: linear-gradient(to bottom, color-mix(in oklab, var(--bg), white 6%), var(--bg));
  border-bottom: 1px solid var(--border);
  box-shadow:
    inset 0 1px 0 var(--highlight),  /* highlight en haut */
    0 6px 12px rgba(0,0,0,.08);      /* ombre douce globale */
}
.navbar .tab.is-active {
  background: var(--bg-light);
  color: var(--text);
  /* petite ombre pour l’onglet actif */
  box-shadow: var(--shadow-sm-1);
  border-radius: 10px;
}
```

### 2.4 Groupe d’options / Radios “cartes” (sélection élevée)

```css
.options {
  background: var(--bg);
  border-radius: 14px;
  padding: 8px;
}
.option {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}
.option.is-selected {
  background: var(--bg-light);
  box-shadow:
    inset 0 1px 0 var(--highlight),  /* highlight top */
    var(--shadow-sm-1), var(--shadow-sm-2);
  border-color: transparent; /* laisser la couche claire “faire” la bordure */
}
```

### 2.5 Table “enfoncée” (recessed)

```css
.table {
  background: var(--bg-dark); /* légèrement plus sombre que le contexte */
  border-radius: 12px;
  /* Inset : sombre en haut, clair en bas -> creusé */
  box-shadow:
    inset 0 6px 10px rgba(0,0,0,.18),
    inset 0 -1px 0 var(--highlight);
  border: 1px solid var(--border);
}
```

---

## 3) Next.js – bascule light/dark

**HTML** : ajouter un attribut `data-theme` sur `<html>`.

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
```

**Hook** pour basculer le thème (persisté en `localStorage`) :

```tsx
// hooks/useTheme.ts
import { useEffect, useState } from "react";

type Mode = "light" | "dark";
export function useTheme(defaultMode: Mode = "light") {
  const [mode, setMode] = useState<Mode>(defaultMode);
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Mode) || defaultMode;
    setMode(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, [defaultMode]);
  const toggle = () => {
    const next: Mode = mode === "light" ? "dark" : "light";
    setMode(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };
  return { mode, toggle };
}
```

**Bouton** :

```tsx
// components/ThemeToggle.tsx
"use client";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button className="button" onClick={toggle} aria-label="Basculer le thème">
      {mode === "light" ? "🌙" : "☀️"}
    </button>
  );
}
```

---

## 4) Tailwind v4 (optionnel)

- Tailwind v4 utilise **OKLCH** dans sa palette par défaut — vous pouvez rester “full Tailwind” ou surcharger par vos propres tokens.  
- Définissez vos couleurs personnalisées avec `@theme` et utilisez-les comme d’habitude (`bg-[color]`, `text-[color]`, etc.).

```css
@import "tailwindcss";

@theme {
  /* Neutres personnalisés (OKLCH) */
  --color-bg-dark:  oklch(0.92 0.01 240);
  --color-bg:       oklch(0.96 0.01 240);
  --color-bg-light: oklch(0.99 0.004 240);

  --color-text:        oklch(0.18 0.03 260);
  --color-text-muted:  oklch(0.45 0.02 260);

  --color-border:   oklch(0.96 0.004 240);
  --color-highlight:oklch(1 0 0);

  --color-accent:   oklch(0.55 0.21 300);
}

/* Dark via data-theme */
:root[data-theme="dark"] {
  --color-bg-dark:  oklch(0.07 0.02 260);
  --color-bg:       oklch(0.12 0.02 260);
  --color-bg-light: oklch(0.18 0.02 260);

  --color-text:        oklch(0.98 0 0);
  --color-text-muted:  oklch(0.70 0.02 260);

  --color-border:   oklch(0.14 0.02 260);
  --color-highlight:oklch(0.26 0.02 260);

  --color-accent:   oklch(0.78 0.21 300);
}

/* Exemples d’usage */
.card-tw {
  @apply bg-[--color-bg-light] text-[--color-text] rounded-xl;
  box-shadow: var(--shadow-sm-1), var(--shadow-sm-2);
}
.btn-tw {
  @apply text-[--color-bg-light] rounded-lg font-semibold;
  background: linear-gradient(to bottom, color-mix(in oklab, var(--color-accent), white 8%), var(--color-accent));
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--color-accent), white 30%),
    0 2px 4px rgba(0,0,0,.18), 0 8px 16px rgba(0,0,0,.10);
}
```

> **Note** : Tailwind fournit déjà des couleurs **oklch(...)** prêtes à l’emploi (v4). Vous pouvez mixer les deux approches : utiliser les couleurs Tailwind pour du rapide et vos tokens pour la cohérence brand.

---

## 5) Règles & checklists (à donner à Codex)

### 5.1 Couleurs & contrastes
- **Neutres** : construire 3 (ou 4) nuances d’un même ton (ex. gris/bleu-gris).  
  - `bg-dark` (fond de page), `bg` (sections), `bg-light` (cartes/boutons/éléments élevés).  
- **Textes** : `text` (fort contraste), `text-muted` (plus doux pour le bruit visuel).  
- **Accent** : un seul hue principal ; décliner **plus sombre en light** et **plus clair en dark**.  
- **Sémantique** : red/green/yellow/blue pour états – gardez la saturation mesurée.  
- **OKLCH prioritaire** (uniformité perceptuelle) + **fallback HSL** si nécessaire.

### 5.2 Profondeur & hiérarchie
- **Layering de couleur avant les ombres** : la hiérarchie doit déjà se lire **sans** ombre.  
- **Lumière venant d’en haut** :  
  - Dégradé **top → bottom** (top + clair).  
  - **Highlight** au bord supérieur (border claire ou `inset 0 1px 0`).  
- **Ombres** : toujours **2 couches** (courte & foncée + longue & claire).  
- **Hover** : augmenter légèrement ombre + contraste du dégradé (élément “monte”).  
- **Pressed** : réduire l’ombre (élément “descend”), possible **inset** pour *sunken*.  

### 5.3 Light vs Dark
- **Dark-first** → inversion pour light, puis **tweak** :  
  - en light, **true highlight = quasi blanc** ; masquer les borders en les égalant à la surface.  
  - en dark, privilégier **highlight** (les ombres pures se lisent moins).  
- Vérifier **contrast ratio** des textes et des actions primaires/secondaires dans les 2 thèmes.

### 5.4 Micro-détails
- Éviter les **borders sombres** trop visibles en light : préférez un ton ≈ fond + highlight.  
- **Rayons** généreux (10–14px) sur cartes/onglets → aspect premium.  
- **Espacement** : donner de l’air aux éléments *élevés* (padding + marge).  
- **Icônes** dans options/boutons → ancrer la signification et ajouter de la “matière”.  

---

## 6) Exemples d’implémentation (React/Next + CSS Modules)

```tsx
// components/Card.tsx
import styles from "./Card.module.css";
export function Card({ children }: { children: React.ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}
```
```css
/* components/Card.module.css */
.card {
  background: var(--bg-light);
  background-image: linear-gradient(to bottom, color-mix(in oklab, var(--bg-light), white 6%), var(--bg-light));
  border: 1px solid var(--border);
  box-shadow:
    inset 0 1px 0 var(--highlight),
    var(--shadow-sm-1), var(--shadow-sm-2);
  border-radius: 12px;
  padding: 16px;
}
```

```tsx
// components/PrimaryButton.tsx
import styles from "./PrimaryButton.module.css";
export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={styles.button} />;
}
```
```css
/* components/PrimaryButton.module.css */
.button {
  color: var(--bg-light);
  background: linear-gradient(to bottom, color-mix(in oklab, var(--accent), white 8%), var(--accent));
  border: 1px solid color-mix(in oklab, var(--accent), black 10%);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--accent), white 30%),
    0 2px 4px rgba(0,0,0,.18), 0 8px 16px rgba(0,0,0,.10);
  border-radius: 10px;
  padding: .625rem .9rem;
  font-weight: 600;
}
.button:hover { transform: translateY(-1px); }
.button:active { transform: translateY(0); }
```

---

## 7) Notes & personnalisation

- **Valeurs indicatives** : ajustez `lightness/chroma` (OKLCH) ou `saturation/lightness` (HSL) selon votre brand.  
- **Delta de couches** : un pas de ~**+8 à +12%** de lightness (HSL) ou **+0.04 à +0.07** (OKLCH L) entre `bg-dark` → `bg` → `bg-light` est un bon départ.  
- **Dégradés** : commencez *ultra subtil* (5–8% de mix vers blanc), puis augmentez un peu au hover.  
- **Compatibilité** : `oklch()` est bien supporté par les navigateurs modernes — gardez un **fallback** HSL si vous ciblez des environnements plus anciens.

---

## 8) Références (sources originales)

- Sajid — **UI Colors** (Contrast, Gradients, Highlight, Shadows + code) : https://www.iamsajid.com/ui-colors/  
- Sajid — **Color Generator** (4 couleurs : primaire, secondaire, accent, optionnelle tertiaire) : https://www.iamsajid.com/colors/  
- YouTube — **The Easy Way to Pick UI Colors** : https://www.youtube.com/watch?v=vvPklRN0Tco  
- YouTube — **The Easy Way to Fix Boring UIs** : https://www.youtube.com/watch?v=wcZ6jSlZqDc  
- Tailwind CSS v4 — **Modernized P3/OKLCH palette (blog)** : https://tailwindcss.com/blog/tailwindcss-v4  
- Tailwind CSS v4 — **Docs / Customizing colors** (oklch dans la palette) : https://tailwindcss.com/docs/customizing-colors  
- Pourquoi **OKLCH** (Evil Martians) : https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl

---

## 9) Brief pour Codex (copiable)

- Utiliser les **variables CSS** ci-dessus (section 1) pour toutes les surfaces/texte/borders/accents.  
- Appliquer **3 couches neutres** :  
  - `:root` → `--bg-dark`, `--bg`, `--bg-light`.  
  - Page = `--bg-dark`; sections = `--bg`; cartes/boutons = `--bg-light`.  
- Tous les éléments élevés (cartes, onglets actifs, boutons) :  
  - **dégradé top→bottom** très subtil + **highlight top (inset 1px)** + **double ombre**.  
- Sélection/état actif (options/radios) : surface **plus claire** + ombre **sm** + `border: transparent`.  
- Light/dark : bascule via `data-theme="dark"`. En light, **highlight quasi blanc** et `--border` ≈ `--bg`.  
- Bouton primaire : background **accent** + gradient subtil + highlight + double ombre.  
- Table/zone “enfoncée” : `--bg-dark` + **inset dark top** + **inset highlight bottom**.

> **Objectif** : qu’on puisse lire la hiérarchie même sans ombres ; les ombres/highlights *renforcent* seulement l’illusion de profondeur.
