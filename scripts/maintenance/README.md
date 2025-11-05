# 🧹 Scripts de Maintenance

## 📋 Vue d'ensemble

Ce dossier contient les scripts de maintenance pour le CRM GMBS, principalement destinés à des opérations ponctuelles de nettoyage et de réparation des données.

---

## 🗑️ Scripts de Cleanup Obsolètes (Archivés)

### **Contexte historique**

Les scripts suivants ont été créés pour corriger des problèmes issus d'**anciens imports Google Sheets mal configurés** :

#### **1. `cleanup_duplicate_statuses.sql`** ❌ **OBSOLÈTE**

**Problème corrigé :**
- Les anciens imports créaient des statuts non-canoniques :
  - `ENCOURS` au lieu de `INTER_EN_COURS`
  - `TERMINEE` au lieu de `INTER_TERMINEE`
  - `INTERENCOU` (typos)

**Solution actuelle :**
- Le script d'import V2 (`scripts/imports/google-sheets-import-clean-v2.js`) utilise désormais un mapping robuste via `scripts/data-processing/mapping-constants.js`
- Tous les statuts sont automatiquement normalisés vers les codes canoniques
- **Ce script n'est plus nécessaire**

#### **2. `cleanup_duplicate_users.sql`** ❌ **OBSOLÈTE**

**Problème corrigé :**
- Les anciens imports créaient des users avec des usernames trop courts :
  - Username `B` au lieu de `badr`
  - Username `T` au lieu de `tom`

**Solution actuelle :**
- Le mapping `GESTIONNAIRE_CODE_MAP` dans `mapping-constants.js` résout automatiquement :
  - `B` → `badr`
  - `T` → `tom`
  - Etc.
- **Ce script n'est plus nécessaire**

---

## ✅ Solution Moderne

### **Mapping automatique dans le script d'import**

Le fichier `scripts/data-processing/mapping-constants.js` contient :

```javascript
// Mapping des statuts
const STATUS_LABEL_TO_CODE = {
  "ENCOURS": "INTER_EN_COURS",
  "TERMINEE": "INTER_TERMINEE",
  "En cours": "INTER_EN_COURS",
  // + 40 autres variations
};

// Mapping des gestionnaires
const GESTIONNAIRE_CODE_MAP = {
  "B": "badr",
  "T": "tom",
  "P": "paul",
  // etc.
};
```

### **Utilisation automatique**

Le `DataMapper` (`scripts/data-processing/data-mapper.js`) utilise ces mappings via :
- `getInterventionStatusIdNormalized()` - Normalise les statuts
- `getUserIdNormalized()` - Résout les gestionnaires

---

## 🎯 Workflow correct

### **Pour importer depuis Google Sheets :**

```bash
# 1. Reset la base (crée le schéma + users)
supabase db reset

# 2. Import Google Sheets avec mapping automatique
npm run import:all

# OU en mode test
npx tsx scripts/imports/google-sheets-import-clean-v2.js --dry-run --verbose
```

### **Résultat attendu :**
- ✅ Statuts canoniques (INTER_EN_COURS, INTER_TERMINEE)
- ✅ Users correctement résolus (badr, tom, paul)
- ✅ Aucun doublon créé
- ✅ **Pas besoin de cleanup !**

---

## 📦 Structure recommandée

```
scripts/
├── imports/                              ← Import Google Sheets (V2)
│   └── google-sheets-import-clean-v2.js
├── data-processing/                      ← Mapping & validation
│   ├── data-mapper.js
│   └── mapping-constants.js              ← 🔑 Clé du mapping
└── maintenance/                          ← Ce dossier
    ├── README.md                         ← Documentation
    └── archive/                          ← Scripts obsolètes
        ├── cleanup_duplicate_statuses.sql
        └── cleanup_duplicate_users.sql
```

---

## 🚨 Cas d'usage des scripts de cleanup

### **Quand les utiliser ?**

**Uniquement si** tu as une base de données **legacy** avec des données importées avant l'implémentation du mapping automatique.

### **Comment les utiliser ?**

```bash
# 1. Se connecter à la base
psql $DATABASE_URL

# 2. Exécuter le cleanup (si vraiment nécessaire)
\i scripts/maintenance/archive/cleanup_duplicate_statuses.sql
\i scripts/maintenance/archive/cleanup_duplicate_users.sql
```

### **⚠️ Attention**

Ces scripts sont **destructifs** et peuvent supprimer des données. À utiliser avec précaution et uniquement si tu sais ce que tu fais.

---

## 🎉 Conclusion

Avec le script d'import V2 et le mapping automatique, **tu n'as plus besoin de scripts de cleanup** pour les nouveaux imports !

Les données sont normalisées **dès l'import**, ce qui garantit :
- ✅ Cohérence des données
- ✅ Pas de doublons
- ✅ Maintenance simplifiée
- ✅ Pas de correction manuelle nécessaire

---

**Date de documentation :** 2025-10-28  
**Auteur :** Codex (IA) + André

