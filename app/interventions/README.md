Interventions — QA Checklist

- Hover des boutons: variants, icônes, transitions (duration-150 ease-out) identiques à A
- Focus ring: couleur/épaisseur/offset visibles (Shadcn defaults, primary)
- Calendar popover: largeur, spacing, chevrons, 2 mois visibles, animations OK
- Disposition filtres: ordre (search, user, date range, tri), wrappers et densité OK
- Badges statuts: couleurs/rounded/padding OK; parité via tokens.css et classes `status-*`
- Skeletons: hauteurs/arrondis/marges identiques (16px rows, rounded)
- Panneau latéral: largeur 384px (`w-96`), transitions/scroll OK
- Scroll horizontal: seuil 100px, progression visible, auto-snap gauche/droite
- Navigation clavier: ↑/↓ liste, ←/→ actions ou statuts, Tab ouvre sidebar, Esc reset
- Back mismatch: si champ manquant Supabase, contrôle non rendu et TODO comment en code

Preview et tests

- Prévisualiser: `/previews/interventions-card` (6 états: default, hover, focus, due-soon, overdue, blocked)
- Test visuel: `pnpm test:e2e` (snapshot avec seuil ≤ 1%)

