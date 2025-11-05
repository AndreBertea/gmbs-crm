# Documentation - Ajout d'interventions de test

## Objectif
Ajouter des données de test dans la table `interventions` pour tester les fonctionnalités de l'onglet Market et les vues utilisateur de Badr.

## Données ajoutées

### 📊 **Résumé des ajouts**
- **10 interventions Market** : Sans gestionnaire, status "DEMANDE" (pour l'onglet Market)
- **20 interventions Badr** : Réparties sur différents statuts
  - 5 × Status "ACCEPTE"
  - 5 × Status "VISITE_TECHNIQUE" 
  - 5 × Status "DEMANDE"
  - 5 × Status "INTER_EN_COURS"
- **Total** : 30 nouvelles interventions

### 🎯 **Interventions Market (onglet Market)**
Ces interventions sont **sans gestionnaire** (`assigned_user_id = NULL`) et en status "DEMANDE" :
- `INT-MARKET-001` à `INT-MARKET-010`
- Métiers variés : Plomberie, Électricité, Chauffage, Vitrerie, Bricolage, Volet-Store
- Agences diverses : OQORO, IMODIRECT, AFEDIM, FLATLOOKER, HOMEPILOT
- Adresses à Paris et Lyon

### 👤 **Interventions Badr (vues utilisateur)**
Ces interventions sont **assignées à Badr** (`assigned_user_id = badr`) avec différents statuts :

#### **Status "ACCEPTE" (5 interventions)**
- Interventions acceptées par les clients
- Prêtes à être exécutées
- `INT-BADR-001` à `INT-BADR-005`

#### **Status "VISITE_TECHNIQUE" (5 interventions)**
- Visites techniques programmées
- Diagnostic et devis en cours
- `INT-BADR-006` à `INT-BADR-010`

#### **Status "DEMANDE" (5 interventions)**
- Nouvelles demandes en attente
- En cours d'évaluation
- `INT-BADR-011` à `INT-BADR-015`

#### **Status "INTER_EN_COURS" (5 interventions)**
- Interventions en cours d'exécution
- Pourcentage d'avancement variable (60% à 90%)
- `INT-BADR-016` à `INT-BADR-020`

## 🚀 **Procédure d'import**

### **Méthode recommandée : Supabase Dashboard**

1. **Accéder au SQL Editor**
   - Ouvrir le dashboard Supabase
   - Aller dans l'onglet "SQL Editor"

2. **Importer le script**
   - Copier le contenu du fichier `ajout_interventions_test.sql`
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run" pour exécuter

3. **Vérification**
   - Vérifier que 30 nouvelles lignes ont été ajoutées
   - Contrôler que les interventions Market n'ont pas de gestionnaire
   - Vérifier que les interventions Badr sont bien assignées

### **Méthode alternative : CLI Supabase**

```bash
# Se placer dans le dossier du projet
cd /Users/andrebertea/Projects/GMBS/CRM_template

# Exécuter le script SQL
supabase db reset --linked
# OU pour un ajout direct :
psql -h [host] -p [port] -U [user] -d [database] -f supabase/seeds/ajout_interventions_test.sql
```

## 🧪 **Tests de validation**

### **Test de l'onglet Market**
1. Se connecter avec n'importe quel utilisateur
2. Aller sur la page Interventions
3. Cliquer sur l'onglet "Market"
4. **Résultat attendu** : 10 interventions visibles (sans gestionnaire, status DEMANDE)

### **Test des vues Badr**
1. Se connecter avec le compte Badr
2. Vérifier les différents onglets :
   - **"Mes demandes"** : 5 interventions (status DEMANDE)
   - **"Ma liste en cours"** : 5 interventions (status INTER_EN_COURS)
   - **"Mes visites technique"** : 5 interventions (status VISITE_TECHNIQUE)
3. **Résultat attendu** : Chaque vue affiche les bonnes interventions

### **Test de la vue "Liste générale"**
1. Se connecter avec n'importe quel utilisateur
2. Aller sur l'onglet "Liste générale"
3. **Résultat attendu** : Toutes les interventions visibles (y compris les 30 nouvelles)

## 📋 **Structure des données**

### **Champs utilisés dans le script**
- `id` : UUID généré automatiquement
- `id_inter` : Identifiant métier (INT-MARKET-XXX, INT-BADR-XXX)
- `agence_id` : Référence vers la table agencies
- `client_id` : Référence vers la table clients existants
- `assigned_user_id` : NULL pour Market, Badr pour les autres
- `statut_id` : Référence vers intervention_statuses
- `metier_id` : Référence vers metiers
- `date` : Date de création de l'intervention
- `date_prevue` : Date prévue d'intervention
- `due_date` : Date limite
- `contexte_intervention` : Description du problème
- `consigne_intervention` : Instructions pour l'artisan
- `adresse`, `code_postal`, `ville` : Localisation
- `latitude`, `longitude` : Coordonnées GPS
- `numero_sst` : Numéro SST unique
- `pourcentage_sst` : Pourcentage d'avancement (100% par défaut, variable pour INTER_EN_COURS)

### **Références utilisées**
- **Agences** : OQORO, IMODIRECT, AFEDIM, FLATLOOKER, HOMEPILOT
- **Clients** : CLI-2025-001 à CLI-2025-020 (existants dans seed_mockup.sql)
- **Statuts** : DEMANDE, ACCEPTE, VISITE_TECHNIQUE, INTER_EN_COURS
- **Métiers** : PLOMBERIE, ELECTRICITE, CHAUFFAGE, VITRERIE, BRICOLAGE, VOLET-STORE
- **Utilisateur** : badr (existant)

## ⚠️ **Précautions importantes**

1. **Pas de reset** : Ce script est un **ajout**, il ne supprime aucune donnée existante
2. **Dépendances** : Le script utilise des références vers des données existantes (agences, clients, utilisateurs)
3. **Unicité** : Les identifiants `id_inter` et `numero_sst` sont uniques
4. **Dates** : Les dates sont cohérentes et dans le futur proche
5. **Test** : Toujours tester sur un environnement de développement avant la production

## 🔄 **Rollback (si nécessaire)**

Pour supprimer les données ajoutées :

```sql
-- Supprimer les interventions ajoutées
DELETE FROM public.interventions 
WHERE id_inter LIKE 'INT-MARKET-%' 
   OR id_inter LIKE 'INT-BADR-%';
```

## 📈 **Impact sur l'interface**

Après l'import, l'interface devrait afficher :
- **Onglet Market** : 10 nouvelles interventions disponibles
- **Vues Badr** : Répartition équilibrée sur les différents statuts
- **Liste générale** : +30 interventions au total
- **Filtres** : Fonctionnement normal avec les nouveaux statuts

---

**Date de création** : 16 janvier 2025  
**Auteur** : Assistant IA  
**Version** : 1.0





