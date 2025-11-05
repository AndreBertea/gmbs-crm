# 🏗️ Architecture d'Import GMBS CRM

## 📋 Vue d'ensemble

Cette architecture modulaire et robuste permet d'importer des données depuis Google Sheets vers la base de données Supabase en respectant les principes SOLID et en offrant une séparation claire des responsabilités.

## 🎯 Objectifs

- ✅ **Travail local d'abord** : Développement sans connexion internet
- ✅ **Mapping robuste** : Transformation fiable des données CSV vers SQL
- ✅ **Tests unitaires** : Validation automatique du mapping
- ✅ **Séparation des responsabilités** : Chaque module a une responsabilité claire
- ✅ **Réutilisation de l'API existante** : Utilise `supabase-api-v2.ts`

## 📁 Structure du projet

```
scripts/
├── 📁 data-processing/          # Traitement des données
│   ├── data-mapper.js              # Mapping CSV → SQL
│   └── data-validator.js           # Validation des données
├── 📁 database/                 # Base de données
│   └── database-manager.js         # Gestionnaire d'insertion
├── 📁 local/                    # Développement local
│   └── local-workflow.js           # Workflow sans internet
├── 📁 tests/                    # Tests unitaires
│   └── mapping.test.js             # Tests de mapping
└── import-main.js               # Script principal
```

## 🔧 Modules

### 1. **DataMapper** (`data-processing/data-mapper.js`)

**Responsabilité** : Transformation des données CSV vers le schéma de base de données

**Fonctionnalités** :
- Mapping des artisans depuis le CSV
- Mapping des interventions depuis le CSV
- Mapping des coûts d'intervention
- Mapping des clients
- Extraction et nettoyage des données (téléphones, emails, adresses)
- Gestion des références vers d'autres tables

**Exemple d'utilisation** :
```javascript
const mapper = new DataMapper();
const artisan = await mapper.mapArtisanFromCSV(csvRow);
const intervention = await mapper.mapInterventionFromCSV(csvRow);
```

### 2. **DataValidator** (`data-processing/data-validator.js`)

**Responsabilité** : Validation des données mappées avant insertion

**Fonctionnalités** :
- Validation selon le schéma de base de données
- Règles de validation spécifiques (email, téléphone, SIRET, etc.)
- Validation en lot
- Génération de rapports de validation

**Exemple d'utilisation** :
```javascript
const validator = new DataValidator();
const result = validator.validate(mappedData, 'artisan');
if (result.isValid) {
  // Procéder à l'insertion
}
```

### 3. **DatabaseManager** (`database/database-manager.js`)

**Responsabilité** : Insertion des données dans la base de données

**Fonctionnalités** :
- Insertion par lots optimisée
- Gestion des erreurs d'insertion
- Support du mode dry-run
- Statistiques d'insertion
- Utilisation de l'API Supabase existante

**Exemple d'utilisation** :
```javascript
const dbManager = new DatabaseManager({ dryRun: true });
const results = await dbManager.insertArtisans(mappedArtisans);
```

### 4. **LocalDevelopmentWorkflow** (`local/local-workflow.js`)

**Responsabilité** : Workflow de développement local sans connexion internet

**Fonctionnalités** :
- Chargement des données CSV locales
- Traitement complet des données
- Sauvegarde des résultats mappés
- Génération de rapports détaillés
- Mode dry-run intégré

**Exemple d'utilisation** :
```javascript
const workflow = new LocalDevelopmentWorkflow({
  dataPath: './data/samples/sheets',
  dryRun: true,
  verbose: true
});
const results = await workflow.run();
```

## 🚀 Utilisation

### 1. **Développement local** (recommandé pour commencer)

```bash
# Mode développement local avec affichage détaillé
node scripts/import-main.js --local --verbose

# Mode test sans écriture en base
node scripts/import-main.js --local --dry-run --verbose
```

### 2. **Tests unitaires**

```bash
# Lancer les tests de mapping
npm test scripts/tests/mapping.test.js
```

### 3. **Import sélectif**

```bash
# Import uniquement des artisans
node scripts/import-main.js --local --artisans-only --verbose

# Import uniquement des interventions
node scripts/import-main.js --local --interventions-only --verbose
```

## 📊 Mapping des données

### **Artisans** (`GMBS-BASEdeDONNÉE_SST_ARTISANS.csv`)

| Colonne CSV | Champ SQL | Transformation |
|-------------|-----------|----------------|
| `Nom Prénom` | `prenom`, `nom` | Séparation automatique |
| `Adresse Mail` | `email` | Validation email |
| `Numéro Téléphone` | `telephone`, `telephone2` | Nettoyage + séparation |
| `Raison Social` | `raison_sociale` | Nettoyage |
| `Siret` | `siret` | Validation 14 chiffres |
| `Adresse Postale` | `adresse_siege_social`, `ville_siege_social`, `code_postal_siege_social` | Extraction automatique |
| `STATUT` | `statut_id` | Référence vers `artisan_statuses` |
| `Gestionnaire` | `gestionnaire_id` | Référence vers `users` |
| `MÉTIER` | Relation `artisan_metiers` | Référence vers `metiers` |

### **Interventions** (`GMBS-SUIVI_INTER_GMBS_2025.csv`)

| Colonne CSV | Champ SQL | Transformation |
|-------------|-----------|----------------|
| `ID` | `id_inter` | Nettoyage |
| `Date` | `date` | Parsing date |
| `Agence` | `agence_id` | Référence vers `agencies` |
| `Adresse d'intervention` | `adresse`, `ville`, `code_postal` | Extraction automatique |
| `Statut` | `statut_id` | Référence vers `intervention_statuses` |
| `Métier` | `metier_id` | Référence vers `metiers` |
| `Gest.` | `assigned_user_id` | Référence vers `users` |
| `COUT SST` | Table `intervention_costs` | Séparation des coûts |
| `COÛT MATERIEL` | Table `intervention_costs` | Séparation des coûts |
| `COUT INTER` | Table `intervention_costs` | Séparation des coûts |
| `Locataire` | Table `clients` | Extraction client |

## 🧪 Tests

### **Tests de mapping**

Les tests valident :
- ✅ Extraction correcte des prénoms/noms
- ✅ Nettoyage des téléphones et emails
- ✅ Parsing des dates et nombres
- ✅ Mapping complet des artisans et interventions
- ✅ Validation des données mappées
- ✅ Gestion des cas d'erreur

### **Exécution des tests**

```bash
# Tests complets
npm test

# Tests spécifiques
npm test -- --testNamePattern="DataMapper"
npm test -- --testNamePattern="DataValidator"
```

## 📈 Workflow recommandé

### **Phase 1 : Développement local**
1. Lancer le workflow local : `node scripts/import-main.js --local --verbose`
2. Analyser les résultats dans `./data/processed/`
3. Corriger les erreurs de mapping si nécessaire
4. Relancer jusqu'à avoir un taux de succès acceptable

### **Phase 2 : Tests**
1. Lancer les tests unitaires : `npm test`
2. Vérifier que tous les tests passent
3. Ajouter des tests pour les cas d'erreur spécifiques

### **Phase 3 : Import réel**
1. Tester avec `--dry-run` en mode production
2. Vérifier les statistiques d'insertion
3. Lancer l'import réel quand tout est prêt

## 🔧 Configuration

### **Variables d'environnement**

```env
# Base de données Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Sheets (pour le mode production)
GOOGLE_SHEETS_ARTISANS_ID=your_sheet_id
GOOGLE_SHEETS_INTERVENTIONS_ID=your_sheet_id
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

### **Options du script principal**

- `--local` : Mode développement local
- `--dry-run` : Mode test sans écriture
- `--verbose` : Affichage détaillé
- `--artisans-only` : Import uniquement des artisans
- `--interventions-only` : Import uniquement des interventions
- `--batch-size=N` : Taille des lots d'insertion

## 🎯 Avantages de cette architecture

1. **Modularité** : Chaque module a une responsabilité claire
2. **Testabilité** : Tests unitaires complets
3. **Maintenabilité** : Code organisé et documenté
4. **Évolutivité** : Facile d'ajouter de nouveaux mappers
5. **Robustesse** : Gestion d'erreurs et validation
6. **Réutilisabilité** : Utilise l'API existante
7. **Flexibilité** : Mode local et production

## 🚨 Points d'attention

- **Références manquantes** : Les statuts, métiers, agences doivent exister en base
- **Données dupliquées** : Gérer les doublons potentiels
- **Performance** : Traitement par lots pour les gros volumes
- **Rollback** : Prévoir un mécanisme d'annulation en cas d'erreur

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs détaillés avec `--verbose`
2. Consultez les fichiers de résultats dans `./data/processed/`
3. Lancez les tests unitaires pour valider le mapping
4. Vérifiez la configuration de la base de données