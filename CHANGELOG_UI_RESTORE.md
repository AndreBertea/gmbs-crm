GMBS_TEST_LOGIN_FIXED — UI/UX Restore (GMBS parity)

Summary
- Restored theme class-effect handling and persisted UI settings.
- Re-implemented responsive, hover-expandable sidebar with multiple modes.
- Added Topbar avatar with mocked status chip and dropdown menu.
- Reintroduced Dashboard route and domain terminology mapping.

Changes
- src/stores/settings.ts: New Zustand store with sidebarMode, theme, classEffect, statusMock + hydration.
- src/components/layout/settings-provider.tsx: Applies class-effect (dark class) to <html>, hydrates/persists settings.
- src/components/layout/app-sidebar.tsx: Sidebar now reads settings, supports data-mode variants (collapsed/icons/hybrid/expanded) with smooth width transition and label visibility logic; uses domain mapping for labels.
- src/components/layout/topbar.tsx: Integrated AvatarStatus component.
- src/components/layout/topbar.tsx: Adds glass-panel when themeMode = glass.
- src/components/layout/avatar-status.tsx: New avatar with Online/Offline/Syncing chip and menu.
- src/config/domain.ts: DOMAIN map and helper t() for labels (Deals→Interventions, Contacts→Artisans, dashboard label).
- app/layout.tsx: Wrapped app with SettingsProvider; tightened layout overflow.
- app/dashboard/page.tsx: New dashboard page with metrics, chart, and links.
- app/settings/interface/page.tsx: Dedicated Interface settings route for Sidebar, Theme, and Class effect.
 - src/features/settings/SettingsNav.tsx + PrefetchSettingsTabs: Link-based tabs with hover/idle prefetch for instant switching.
 - app/globals.css: Adds optimized `.theme-glass` and `.glass-panel` styles; respects reduced motion and provides fallback when backdrop-filter is unsupported.
 - src/components/layout/app-sidebar.tsx: Applies glass-panel to the sidebar body only; no full-screen blur.

Performance notes (Glass)
- Scope blur to topbar/sidebar only; no nested or full-screen blurs.
- Removed animated shader backgrounds; use static background based on `--glass-bg`.
- Limited backdrop blur radius (10–12px) to reduce GPU load.
- Added reduced motion safeguards and minimized overdraw.

Notes
- Tailwind darkMode remains 'class'; SettingsProvider controls only the 'dark' class to avoid disrupting existing theme classes.
- Existing tabs-based Settings page remains; the new route focuses on Interface-only controls per acceptance criteria.
- Chat sidebar hover overlay preserved; hybrid mode expands on hover/focus.

## 2025-10-23 - Nettoyage Interface

### Supprimé
- Bouton "Demander à l'IA" dans la topbar
- Section "Tâches" et raccourcis chat dans la sidebar
- Routes `/chat`, `/chat-4`, `/chat-5`, `/tasks`, `/ia` et API associées
- Features `src/features/ai/` et `src/features/chat/` avec leurs tests
- Providers `AIProvider`, composant `AIQuickModal` et raccourcis IA

### Navigation finale
- Dashboard → /dashboard
- Interventions → /interventions
- Artisans → /artisans
- Paramètres → /settings
