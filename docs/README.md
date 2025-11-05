# 📚 Documentation CRM GMBS

Bienvenue dans la documentation du CRM GMBS. Cette documentation couvre tous les aspects du système, de l'architecture technique aux guides d'utilisation.

---

## 🎯 Accès rapide

### 🔥 Nouveauté : Synchronisation Google Sheets

📖 **[Documentation complète de la synchronisation bidirectionnelle CRM ↔ Google Sheets](./INDEX_SYNC_GOOGLE_SHEETS.md)**

**Documents disponibles** :
- 🎯 [Résumé exécutif](./SYNC_GOOGLE_SHEETS_RESUME.md) - Vue d'ensemble et guide utilisateur
- 🏗️ [Conception technique détaillée](./CONCEPTION_SYNC_GOOGLE_SHEETS.md) - Architecture complète
- 📐 [Diagrammes d'architecture](./DIAGRAMME_SYNC_ARCHITECTURE.md) - 12 diagrammes Mermaid
- 🚀 [Guide de démarrage rapide](./QUICK_START_SYNC_IMPLEMENTATION.md) - Implémentation en 30 min

**Cas d'usage** :
- ✅ Backup automatique du CRM dans Google Sheets
- ✅ Édition en masse dans Google Sheets
- ✅ Synchronisation bidirectionnelle automatique
- ✅ Gestion intelligente des conflits

---

## 📁 Structure de la documentation

### 🏗️ Architecture et API

#### API v2
- **[Guidelines API v2](./guide/backend/GUIDELINES_API_V2.md)** - Standards et bonnes pratiques
- **[Quick Start API v2](./guide/backend/QUICK_START_API_V2.md)** - Démarrage rapide
- **[Migration API v2](./MIGRATION_API_V2.md)** - Guide de migration
- **[API CRM Complète](./API_CRM_COMPLETE.md)** - Documentation complète de l'API

#### Base de données
- **[Schéma DB (Mermaid)](./db/schema.mermaid)** - Diagramme ERD complet
- **[Schéma ancien](./db/schema_old.mermaid)** - Archive du schéma précédent

### 📊 Data Mapping

- **[Mapping Artisans](./data-mapping/artisans-mapping.md)** - Structure des données artisans
- **[Mapping Interventions](./data-mapping/interventions-mapping.md)** - Structure des interventions
- **[Mapping Google Sheets](./data-mapping/google-sheets-mapping.md)** - Correspondance Sheets ↔ DB
- **[Sheet → DB → Frontend](./data-mapping/sheet-db-frontend.md)** - Flux de données complet

### 🔧 Import de données

- **[Import Google Sheets - Résumé](./guide/import_sheets/IMPORT_GOOGLE_SHEETS_SUMMARY.md)** - Vue d'ensemble
- **[CSV Mapping Fixes](./guide/import_sheets/CSV_MAPPING_FIXES.md)** - Corrections des mappings
- **[Google Credentials Setup](./guide/google-credentials-setup.md)** - Configuration OAuth

### 🚀 Installation et démarrage

- **[Guide d'installation complet](./baz/guide-installation-complet.md)** - Installation de A à Z
- **[Guide d'installation](./guide/guide_installation.md)** - Version simplifiée
- **[Quick Start pour collaborateurs](./onboarding/QUICKSTART_FOR_COLLABORATORS.md)** - Onboarding rapide
- **[Delivery Checklist](./audit/DELIVERY_CHECKLIST.md)** - Checklist avant déploiement

### 🎨 Interface utilisateur

- **[UI Cleanup 2025](./UI_CLEANUP_2025.md)** - Nettoyage et modernisation de l'UI
- **[Flow des interventions](./baz/interventions-ui-flow-mermaid.md)** - Diagrammes de flux
- **[Design](./baz/design1-4.md)** - Spécifications de design

### 🐛 Diagnostics et fixes

#### Interventions
- **[Diagnostic interventions vides](./baz/DIAGNOSTIC_INTERVENTIONS_VIDES.md)**
- **[Diagnostic statuts interventions](./baz/DIAGNOSTIC_STATUTS_INTERVENTIONS.md)**
- **[Fix pastilles compteurs](./baz/FIX_PASTILLES_COMPTEURS_INTERVENTIONS.md)**
- **[Fix pastilles mapping statuts](./baz/FIX_PASTILLES_MAPPING_STATUTS.md)**
- **[Fix status UUID mapping](./baz/FIX_STATUS_UUID_MAPPING.md)**
- **[Résumé final fix pastilles](./baz/RESUME_FINAL_FIX_PASTILLES.md)**

#### Optimisations
- **[Optimisation scroll infini](./baz/OPTIMISATION_INTERVENTIONS_SCROLL_INFINI.md)**
- **[Optimisation sliding window](./baz/OPTIMISATION_SCROLL_INFINI_SLIDING_WINDOW.md)**
- **[Optimisation finale résumé](./baz/OPTIMISATION_FINALE_RESUME.md)**
- **[Amélioration rafraîchissement temps réel](./AMELIORATION_RAFRAICHISSEMENT_TEMPS_REEL.md)**
- **[Test rafraîchissement](./TEST_RAFRAICHISSEMENT.md)**

### 📝 Références rapides

- **[Quick Fix Reference](./baz/QUICK_FIX_REFERENCE.md)** - Résolution rapide des problèmes
- **[Quick Reference Status API v2](./baz/QUICK_REFERENCE_STATUS_API_V2.md)** - Statuts et API
- **[Corrections UUID Mapping](./baz/CORRECTIONS_FINALES_UUID_MAPPING.md)** - Fixes UUID

### 🔄 Workflows spécifiques

- **[Workflow extraction devis](./guide/WORKFLOW_EXTRACTION_DEVIS.md)** - Extraction automatique de devis
- **[Module IA](./baz/ia-module.md)** - Intégration de l'IA

### 🏢 Multi-tenancy

- **[Tenant Implementation](./TENANT_IMPLEMENTATION.md)** - Implémentation multi-tenant

### 📋 Modifications et changements

- **[Modifications Plain Nom](./MODIFICATIONS_PLAIN_NOM.md)** - Changements de nomenclature
- **[Validation migration statuts v2](./baz/VALIDATION_MIGRATION_STATUTS_V2.md)** - Validation des statuts
- **[Branche ORM démarrage](./baz/branche-orm-demarrage.md)** - Migration ORM

### 📝 TODO et planification

- **[TODO principal](./ToDo.md)** - Liste des tâches principales
- **[TODO détaillé](./todo/todo.txt)** - Liste détaillée des tâches

---

## 🗺️ Parcours recommandés

### 🆕 Nouveau collaborateur

```
1. Quick Start pour collaborateurs
   └─> /onboarding/QUICKSTART_FOR_COLLABORATORS.md

2. Guide d'installation
   └─> /guide/guide_installation.md

3. Architecture API v2
   └─> /guide/backend/QUICK_START_API_V2.md

4. Structure des données
   └─> /data-mapping/sheet-db-frontend.md
```

### 👨‍💻 Développeur Backend

```
1. Guidelines API v2
   └─> /guide/backend/GUIDELINES_API_V2.md

2. Schéma de base de données
   └─> /db/schema.mermaid

3. Data Mapping
   └─> /data-mapping/

4. Quick Fix Reference
   └─> /baz/QUICK_FIX_REFERENCE.md
```

### 🎨 Développeur Frontend

```
1. UI Cleanup 2025
   └─> /UI_CLEANUP_2025.md

2. Flow des interventions
   └─> /baz/interventions-ui-flow-mermaid.md

3. API CRM Complète
   └─> /API_CRM_COMPLETE.md

4. Optimisations scroll
   └─> /baz/OPTIMISATION_INTERVENTIONS_SCROLL_INFINI.md
```

### 🔧 DevOps / Déploiement

```
1. Delivery Checklist
   └─> /audit/DELIVERY_CHECKLIST.md

2. Guide d'installation complet
   └─> /baz/guide-installation-complet.md

3. Tenant Implementation
   └─> /TENANT_IMPLEMENTATION.md

4. Migration API v2
   └─> /MIGRATION_API_V2.md
```

### 📊 Product Owner / Manager

```
1. Synchronisation Google Sheets (Résumé)
   └─> /SYNC_GOOGLE_SHEETS_RESUME.md

2. TODO principal
   └─> /ToDo.md

3. UI Cleanup 2025
   └─> /UI_CLEANUP_2025.md

4. Workflow extraction devis
   └─> /guide/WORKFLOW_EXTRACTION_DEVIS.md
```

---

## 🔍 Recherche par sujet

### Authentification et OAuth
- [Google Credentials Setup](./guide/google-credentials-setup.md)
- [Synchronisation Google Sheets](./INDEX_SYNC_GOOGLE_SHEETS.md)

### Base de données
- [Schéma DB](./db/schema.mermaid)
- [Data Mapping](./data-mapping/)
- [Migration API v2](./MIGRATION_API_V2.md)

### Import/Export de données
- [Import Google Sheets](./guide/import_sheets/IMPORT_GOOGLE_SHEETS_SUMMARY.md)
- [Synchronisation bidirectionnelle](./CONCEPTION_SYNC_GOOGLE_SHEETS.md)
- [CSV Mapping](./guide/import_sheets/CSV_MAPPING_FIXES.md)

### Performance et optimisation
- [Optimisation scroll infini](./baz/OPTIMISATION_INTERVENTIONS_SCROLL_INFINI.md)
- [Sliding window](./baz/OPTIMISATION_SCROLL_INFINI_SLIDING_WINDOW.md)
- [Rafraîchissement temps réel](./AMELIORATION_RAFRAICHISSEMENT_TEMPS_REEL.md)

### Interventions
- [Mapping interventions](./data-mapping/interventions-mapping.md)
- [Flow UI](./baz/interventions-ui-flow-mermaid.md)
- [Diagnostics](./baz/DIAGNOSTIC_INTERVENTIONS_VIDES.md)

### Artisans
- [Mapping artisans](./data-mapping/artisans-mapping.md)

### Statuts
- [Fix status UUID](./baz/FIX_STATUS_UUID_MAPPING.md)
- [Quick Reference Status](./baz/QUICK_REFERENCE_STATUS_API_V2.md)
- [Validation migration](./baz/VALIDATION_MIGRATION_STATUTS_V2.md)

---

## 🛠️ Outils et ressources

### Visualisation
- **Mermaid Live Editor** : https://mermaid.live/
- Utilisez-le pour visualiser les fichiers `.mermaid`

### Base de données
- **Supabase Studio** : Interface de gestion
- **PostgreSQL docs** : https://www.postgresql.org/docs/

### API
- **Postman** : Tester les endpoints
- **Swagger** : Documentation interactive (à venir)

### Frontend
- **Next.js docs** : https://nextjs.org/docs
- **Shadcn/ui** : https://ui.shadcn.com/

---

## 📊 Statistiques de la documentation

- **Total de documents** : 50+
- **Diagrammes Mermaid** : 15+
- **Guides d'installation** : 4
- **Diagnostics et fixes** : 10+
- **Références API** : 5+

---

## 🤝 Contribution

### Ajouter de la documentation

1. Créer un fichier Markdown dans le dossier approprié
2. Suivre le format existant
3. Ajouter un lien dans ce README
4. Utiliser des diagrammes Mermaid si pertinent

### Standards de documentation

- **Format** : Markdown (.md)
- **Titres** : Utiliser des emojis pour la clarté
- **Code** : Blocs de code avec syntaxe highlighting
- **Diagrammes** : Mermaid quand possible
- **Liens** : Relatifs depuis docs/

---

## 📞 Support

### Questions fréquentes

**Où trouver la documentation de l'API ?**
→ [API_CRM_COMPLETE.md](./API_CRM_COMPLETE.md)

**Comment installer le projet ?**
→ [guide_installation.md](./guide/guide_installation.md)

**Comment importer des données depuis Google Sheets ?**
→ [IMPORT_GOOGLE_SHEETS_SUMMARY.md](./guide/import_sheets/IMPORT_GOOGLE_SHEETS_SUMMARY.md)

**Comment configurer la synchronisation bidirectionnelle ?**
→ [QUICK_START_SYNC_IMPLEMENTATION.md](./QUICK_START_SYNC_IMPLEMENTATION.md)

**Problème avec les interventions vides ?**
→ [DIAGNOSTIC_INTERVENTIONS_VIDES.md](./baz/DIAGNOSTIC_INTERVENTIONS_VIDES.md)

**Problème de performance ?**
→ [OPTIMISATION_INTERVENTIONS_SCROLL_INFINI.md](./baz/OPTIMISATION_INTERVENTIONS_SCROLL_INFINI.md)

---

## 🔄 Mises à jour récentes

### 30 octobre 2025
- ✨ **Ajout** : Documentation complète synchronisation Google Sheets
  - Résumé exécutif
  - Conception technique détaillée (80+ pages)
  - 12 diagrammes d'architecture
  - Guide de démarrage rapide (30 min)

### Précédentes mises à jour
- Voir les fichiers individuels pour l'historique détaillé

---

## 🎯 Prochaines documentations

- [ ] Tests E2E (Playwright)
- [ ] CI/CD Pipeline
- [ ] Monitoring et logs
- [ ] Sécurité et permissions
- [ ] Mobile responsive guide
- [ ] Accessibility (a11y) guidelines

---

**Dernière mise à jour** : 30 octobre 2025  
**Maintenu par** : L'équipe CRM GMBS

---

## 📚 Ressources externes

### Documentation officielle
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2)

### Tutoriels et guides
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

Bonne lecture ! 📖✨



