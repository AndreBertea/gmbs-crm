# 🔍 Tests de Qualité d'Import

Ce dossier contient les outils pour vérifier la qualité des données importées.

## 📋 Fichiers

### `check-import-quality.js`
Script TypeScript/JavaScript pour exécuter les vérifications depuis la ligne de commande.

**Utilise directement** : `src/lib/supabase-client.ts` (client centralisé)

### `check-import-quality.sql`
Fichier SQL contenant toutes les requêtes d'analyse de qualité (8 sections).

## 🚀 Usage

### Méthode 1 : Script Node.js (Rapide) ⚡

```bash
# Vérification standard
npx tsx scripts/tests/check-import-quality.js

# Mode verbose (plus de détails)
npx tsx scripts/tests/check-import-quality.js --verbose
```

**Avantages** :
- ✅ Rapide et facile
- ✅ Résumé visuel clair
- ✅ Exemples d'interventions problématiques

**Sortie** :
```
🔍 VÉRIFICATION QUALITÉ DE L'IMPORT

✅ Connexion à Supabase OK

================================================================================
📈 RÉSUMÉ GLOBAL
================================================================================

  Interventions: 500
  Artisans: 150
  Locataires: 200
  Propriétaires: 100
  Coûts: 1200
  Assignations artisans: 450

================================================================================
📊 INTERVENTIONS - STATUTS
================================================================================

  Total interventions: 500
  ✅ Avec statut: 485 (97.00%)
  ❌ Sans statut: 15 (3.00%)

================================================================================
📊 INTERVENTIONS - COÛTS
================================================================================

  Total interventions: 500
  ✅ Avec coûts: 450 (90.00%)
  ❌ Sans coûts: 50 (10.00%)

================================================================================
📊 INTERVENTIONS - ARTISANS
================================================================================

  Total interventions: 500
  ✅ Avec artisans: 450 (90.00%)
  ❌ Sans artisans: 50 (10.00%)
```

### Méthode 2 : SQL Direct (Détaillé) 📊

**Option A : Dashboard Supabase**
1. Aller sur le dashboard Supabase
2. Ouvrir l'éditeur SQL
3. Copier/coller les requêtes de `check-import-quality.sql`
4. Exécuter section par section

**Option B : Ligne de commande (psql)**
```bash
# Si vous utilisez Supabase local
psql postgresql://postgres:postgres@localhost:54322/postgres -f scripts/tests/check-import-quality.sql
```

## 🎯 Workflow Complet

```bash
# 1. Lancer l'import
npx tsx scripts/imports/google-sheets-import-clean-v2.js

# 2. Vérifier la qualité immédiatement
npx tsx scripts/tests/check-import-quality.js

# 3. Consulter les rapports détaillés générés
cat data/imports/reports/invalid-interventions-*.json
cat data/imports/reports/unmapped-artisans-*.json

# 4. Si besoin d'analyses SQL poussées
# → Ouvrir scripts/tests/check-import-quality.sql dans l'éditeur Supabase
```

## 📊 Sections SQL Disponibles

Le fichier `check-import-quality.sql` contient **8 sections** :

1. **Interventions avec/sans statut** - Détecte les interventions invalides
2. **Interventions avec/sans coûts** - Vérifie l'insertion des coûts
3. **Interventions avec/sans artisans** - Vérifie l'assignation des artisans
4. **Résumé complet** - Vue d'ensemble rapide
5. **Qualité par métrique** - Pourcentages de complétude
6. **Interventions problématiques** - Score de qualité sur 6
7. **Top interventions à corriger** - Priorités d'action
8. **Statistiques par statut** - Répartition et analyse

## 📈 Métriques Clés

| Métrique | Objectif | Critique |
|----------|----------|----------|
| Interventions avec statut | > 95% | < 90% |
| Interventions avec coûts | > 80% | < 60% |
| Interventions avec artisan | > 85% | < 70% |
| Score qualité moyen | > 4/6 | < 3/6 |

## 🔧 Configuration

Le script utilise automatiquement le client Supabase centralisé défini dans `src/lib/supabase-client.ts`.

**Variables d'environnement requises** (`.env.local`) :
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🐛 Troubleshooting

### Erreur : "Cannot find module"

```bash
# Vérifier que tsx est installé
npm install -D tsx

# Ou utiliser npx
npx tsx scripts/tests/check-import-quality.js
```

### Erreur de connexion Supabase

```bash
# Vérifier les variables d'environnement
cat .env.local

# Vérifier que Supabase local est lancé
supabase status
```

### Le script ne trouve pas les données

```bash
# Vérifier qu'il y a des données
npx tsx -e "import {supabaseAdmin} from './src/lib/supabase-admin.js'; \
  supabaseAdmin.from('interventions').select('count').then(console.log)"
```

## 💡 Exemples de Requêtes Utiles

### Trouver les interventions sans statut

```sql
SELECT id, id_inter, date, adresse
FROM interventions
WHERE statut_id IS NULL AND is_active = true
ORDER BY created_at DESC
LIMIT 10;
```

### Interventions par statut

```sql
SELECT s.label, COUNT(*) as nombre
FROM interventions i
JOIN intervention_statuses s ON i.statut_id = s.id
WHERE i.is_active = true
GROUP BY s.label
ORDER BY nombre DESC;
```

### Artisans les plus assignés

```sql
SELECT 
  a.prenom || ' ' || a.nom as artisan,
  COUNT(*) as nb_interventions
FROM intervention_artisans ia
JOIN artisans a ON ia.artisan_id = a.id
GROUP BY a.id, a.prenom, a.nom
ORDER BY COUNT(*) DESC
LIMIT 10;
```

## 📚 Ressources

- [Documentation Import](../imports/README.md)
- [Guide AGENTS.md](../../AGENTS.md)
- [API V2](../../src/lib/api/v2/)

---

**Dernière mise à jour** : 2025-10-18

