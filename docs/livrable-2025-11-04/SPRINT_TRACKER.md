# 📋 Suivi des Sprints - Livrable Interventions & Artisans

**Date de début** : 6 novembre 2025  
**Durée estimée totale** : 7-8 semaines (5 sprints)  
**Statut** : 🟡 En cours - Sprint 1

---

## 🎯 Vue d'ensemble

| Sprint | Durée | Tâches | Statut | Dates |
|--------|-------|--------|--------|-------|
| **Sprint 1** | 7j | 5 tâches | 🟡 En cours | 06/11 - 14/11 |
| **Sprint 2** | 16.5j | 6 tâches | ⏸️ À venir | 15/11 - 06/12 |
| **Sprint 3** | 4.5j | 2 tâches | ⏸️ À venir | 09/12 - 13/12 |
| **Sprint 4** | 10j | 8 tâches | ⏸️ À venir | 16/12 - 30/12 |
| **Sprint 5** | 5j | Tests & QA | ⏸️ À venir | 02/01 - 08/01 |

**Légende** :
- ⏸️ À venir
- 🟡 En cours
- ✅ Terminé
- 🔴 Bloqué
- ⚠️ Attention requise

---

## 📊 Sprint 1 : Fondations BDD (Semaines 1-2)

**Objectif** : Implémenter les modifications BDD simples et validations de base  
**Durée** : 7 jours  
**Dates** : 06/11/2025 - 14/11/2025

### Tâches

#### 1. AGN-001 : Référence agence obligatoire
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 1-2j  
**Complexité** : 🟡 Moyenne

**Description** :
- Ajouter le champ `reference_agence` dans la table `interventions`
- Créer une table de configuration `agency_config`
- Validation conditionnelle pour ImoDirect, AFEDIM, Locoro

**Checklist** :
- [ ] Migration BDD : Ajouter `reference_agence TEXT` à `interventions`
- [ ] Migration BDD : Créer table `agency_config` avec `requires_reference`
- [ ] Peupler `agency_config` pour les 3 agences
- [ ] Validation backend (Zod) dans `/api/interventions/route.ts`
- [ ] Validation frontend dans `NewInterventionModalContent.tsx`
- [ ] Tests unitaires pour la validation conditionnelle
- [ ] Documentation mise à jour

**Règle métier associée** : BR-AGN-001

**Fichiers impactés** :
- `supabase/migrations/[date]_add_reference_agence.sql`
- `src/types/intervention.ts`
- `app/api/interventions/route.ts`
- `src/components/modals/NewInterventionModalContent.tsx`

**Bloquants** : Aucun

---

#### 2. INT-001 : Champs obligatoires à la création
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 0.5j  
**Complexité** : 🟢 Faible

**Description** :
- Validation des 5 champs obligatoires : Adresse, Contexte, Métier, Statut, Agence
- Contraintes NOT NULL en BDD
- Validation frontend et backend

**Checklist** :
- [ ] Migration BDD : Contraintes NOT NULL sur les 5 champs
- [ ] Validation Zod backend
- [ ] Validation React Hook Form frontend
- [ ] Messages d'erreur clairs
- [ ] Tests unitaires

**Règle métier associée** : BR-INT-001

**Fichiers impactés** :
- `supabase/migrations/[date]_add_not_null_constraints.sql`
- `app/api/interventions/route.ts`
- `src/components/modals/NewInterventionModalContent.tsx`

**Bloquants** : Aucun

---

#### 3. INT-003 : Droits d'édition du champ Contexte
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 0.5j  
**Complexité** : 🟢 Faible

**Description** :
- Contexte modifiable uniquement à la création
- Lecture seule après création (sauf pour les admins)
- Gestion des permissions

**Checklist** :
- [ ] Logique de permission dans `InterventionModalContent.tsx`
- [ ] Hook `useUserRole()` ou équivalent
- [ ] Champ en readonly si non-admin et non-création
- [ ] Tests de permissions
- [ ] Documentation

**Règle métier associée** : BR-INT-002

**Fichiers impactés** :
- `src/components/modals/InterventionModalContent.tsx`
- `src/components/modals/NewInterventionModalContent.tsx`
- `src/hooks/useUserRole.ts` (si existe)

**Bloquants** : Aucun

---

#### 4. DEVI-001 : ID devis pré-requis pour "Devis envoyé"
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 1-2j  
**Complexité** : 🟡 Moyenne

**Description** :
- Ajouter le champ `id_devis` si pas déjà existant
- Validation : impossible de passer à "Devis envoyé" sans ID devis
- Menu contextuel : masquer l'option si ID vide

**Checklist** :
- [ ] Migration BDD : Ajouter `id_devis TEXT` si nécessaire
- [ ] Validation backend changement de statut
- [ ] Logique menu contextuel (masquage conditionnel)
- [ ] Tests unitaires
- [ ] Documentation

**Règle métier associée** : BR-DEVI-001

**Fichiers impactés** :
- `supabase/migrations/[date]_add_id_devis.sql` (si nécessaire)
- `app/api/interventions/[id]/route.ts`
- Menu contextuel interventions (composant à identifier)

**Bloquants** : Aucun

---

#### 5. ARC-001 : Commentaire obligatoire à l'archivage
**Statut** : ⏸️ À démarrer  
**Priorité** : P2  
**Durée estimée** : 2j  
**Complexité** : 🟡 Moyenne

**Description** :
- Ajouter les champs d'archivage : `archived_at`, `archived_by`, `archived_reason`
- Pop-up modal avec commentaire obligatoire
- Validation bloquante

**Checklist** :
- [ ] Migration BDD : Ajouter 3 champs d'archivage à `interventions`
- [ ] Migration BDD : Ajouter 3 champs d'archivage à `artisans`
- [ ] Créer composant `ArchiveModal.tsx`
- [ ] API endpoint pour archivage
- [ ] Menu contextuel : option "Archiver"
- [ ] Tests unitaires
- [ ] Documentation

**Règle métier associée** : BR-ARC-001

**Fichiers impactés** :
- `supabase/migrations/[date]_add_archiving_fields.sql`
- `src/components/modals/ArchiveModal.tsx` (nouveau)
- `app/api/interventions/[id]/archive/route.ts` (nouveau)
- `app/api/artisans/[id]/archive/route.ts` (nouveau)

**Bloquants** : Aucun

---

### 📊 Progression Sprint 1

```
Total : 5 tâches
├── ⏸️ À démarrer : 5 (100%)
├── 🟡 En cours : 0 (0%)
├── ✅ Terminées : 0 (0%)
└── 🔴 Bloquées : 0 (0%)
```

**Temps consommé** : 0j / 7j  
**Temps restant** : 7j

---

## 📊 Sprint 2 : Fonctionnalités métier (Semaines 3-4)

**Objectif** : Logement vacant, workflow acomptes, duplication  
**Durée** : 16.5 jours  
**Dates** : 15/11/2025 - 06/12/2025  
**Statut** : ⏸️ À venir

### Tâches

#### 6. INT-002 : Logement vacant avec champs conditionnels
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 3-4j  
**Complexité** : 🔴 Haute

**Checklist** :
- [ ] Migration BDD : 4 nouveaux champs
- [ ] Logique conditionnelle UI
- [ ] Tests unitaires
- [ ] Documentation

**Règle métier associée** : BR-INT-003

---

#### 7. ACPT-001 : Workflow acomptes complet
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 4-5j  
**Complexité** : 🔴 Haute

**Checklist** :
- [ ] Migration BDD : 3 champs + 2 statuts
- [ ] Logique automatisation backend
- [ ] Tests unitaires
- [ ] Documentation

**Règles métier associées** : BR-ACPT-001, BR-ACPT-002, BR-ACPT-003

---

#### 8. ART-002 : Règle Incomplet → Novice → À compléter
**Statut** : ⏸️ À démarrer  
**Priorité** : P2  
**Durée estimée** : 1-2j  
**Complexité** : 🟡 Moyenne

**Checklist** :
- [ ] Trigger PostgreSQL ou logique applicative
- [ ] Tests unitaires
- [ ] Documentation

**Règle métier associée** : BR-ART-001

---

#### 9. DUP-001 : Duplication "Devis supp"
**Statut** : ⏸️ À démarrer  
**Priorité** : P2  
**Durée estimée** : 2-3j  
**Complexité** : 🟡 Moyenne

**Checklist** :
- [ ] API endpoint duplication
- [ ] Exclusion des champs (id, id_inter, contexte, consigne)
- [ ] Commentaire automatique
- [ ] Tests unitaires
- [ ] Documentation

**Règle métier associée** : BR-DUP-001

---

#### 10. UI-LV : UI Logement vacant
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 2j  
**Complexité** : 🟡 Moyenne

**Checklist** :
- [ ] Checkbox + logique conditionnelle
- [ ] Tests UI
- [ ] Documentation

---

#### 11. UI-DUP : UI Menu "Devis supp"
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 0.5j  
**Complexité** : 🟢 Faible

**Checklist** :
- [ ] Option menu contextuel
- [ ] Tests
- [ ] Documentation

---

### 📊 Progression Sprint 2

```
Total : 6 tâches
└── ⏸️ À venir
```

---

## 📊 Sprint 3 : Automatisations (Semaine 5)

**Objectif** : Job cron due_date, validation IBAN  
**Durée** : 4.5 jours  
**Dates** : 09/12/2025 - 13/12/2025  
**Statut** : ⏸️ À venir

### ⚠️ BLOQUANT

**ART-001 : Validation IBAN à clarifier avec le client**

**Question** : Comment l'admin est-il informé qu'un IBAN a été ajouté ?
- Option A : 📧 Notification email
- Option B : 🔔 Notification in-app
- Option C : 📋 File d'attente avec badge

**Action requise** : Clarifier AVANT de démarrer ce sprint

### Tâches

#### 12. DAT-001 : Due date → Check automatique
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 3-4j  
**Complexité** : 🔴 Haute

**Checklist** :
- [ ] Migration BDD : `previous_statut_id`
- [ ] Edge Function Supabase (job quotidien)
- [ ] Tests unitaires
- [ ] Documentation

**Règles métier associées** : BR-STAT-001, BR-STAT-002, BR-STAT-003

---

#### 13. UI-DD : UI Due date VT/EC
**Statut** : ⏸️ À démarrer  
**Priorité** : P1  
**Durée estimée** : 0.5j  
**Complexité** : 🟢 Faible

**Checklist** :
- [ ] Validation conditionnelle
- [ ] Tests
- [ ] Documentation

---

## 📊 Sprint 4 : UI/UX (Semaines 6-7)

**Objectif** : Menus contextuels, notifications, templates  
**Durée** : 10 jours  
**Dates** : 16/12/2025 - 30/12/2025  
**Statut** : ⏸️ À venir

### Tâches (8 tâches)

- UI-001 : Menus contextuels (3-4j)
- MSG-001 : Prévisualisation messages (1j)
- TPL-001 : Templates emails/SMS (1j)
- NOT-001 : Pop-ups info (1j)
- ARC-002 : Pastille indisponible (1j)
- MAP-001 : Mapping Budget=SST (0.5j)
- UI-AGN : UI Référence agence (1j)
- UI-DEV : UI Devis envoyé (0.5j)

---

## 📊 Sprint 5 : Tests & QA (Semaine 8)

**Objectif** : Tests complets et corrections  
**Durée** : 5 jours  
**Dates** : 02/01/2026 - 08/01/2026  
**Statut** : ⏸️ À venir

### Activités

- [ ] Tests unitaires complémentaires (1j)
- [ ] Tests E2E - 5 scénarios critiques (2j)
- [ ] Tests d'intégration (1j)
- [ ] Corrections de bugs (1j)

---

## 📈 Métriques globales

### Progression totale
```
Total : 21 tâches
├── ⏸️ À démarrer : 21 (100%)
├── 🟡 En cours : 0 (0%)
├── ✅ Terminées : 0 (0%)
└── 🔴 Bloquées : 0 (0%)
```

### Par complexité
```
🔴 Haute : 3 tâches
🟡 Moyenne : 10 tâches
🟢 Faible : 8 tâches
```

### Temps
```
Temps total estimé : 43 jours
Temps consommé : 0 jours
Temps restant : 43 jours
```

---

## 📝 Notes et décisions

### 06/11/2025
- ✅ Documentation complète créée et organisée
- ✅ Sprint Tracker créé
- ⏸️ Sprint 1 prêt à démarrer
- ⚠️ ART-001 à clarifier avec le client

---

## 🔗 Liens utiles

- [README principal](README.md)
- [Résumé exécutif](RESUME_EXECUTIF_LIVRABLE_2025-11-04.md)
- [Règles métier](BUSINESS_RULES_2025-11-04.md)
- [Workflows](WORKFLOW_REGLES_METIER.md)
- [Tableau récapitulatif](TABLEAU_RECAPITULATIF_LIVRABLE.md)

---

**Dernière mise à jour** : 6 novembre 2025  
**Maintenu par** : Équipe Dev GMBS CRM

