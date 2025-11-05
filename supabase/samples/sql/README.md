# 📊 Requêtes SQL pour Supabase Studio

Ce dossier contient des requêtes SQL prêtes à utiliser dans Supabase Studio pour diagnostiquer et analyser les données des artisans.

## 📁 Fichiers disponibles

### 🔢 `count_artisans.sql`
- Compter le nombre total d'artisans
- Statistiques actifs/inactifs
- Statistiques complètes (emails, téléphones, etc.)

### 🔍 `search_artisan_by_email.sql`
- Rechercher un artisan par email exact
- Recherche par email partiel
- Recherche multiple d'emails spécifiques
- Recherche par nom/prénom

### ⚠️ `check_email_duplicates.sql`
- Trouver les emails en double
- Vérifier les emails vides/NULL
- Lister tous les emails
- Vérifier les emails problématiques spécifiques

### 📋 `sample_artisans.sql`
- Échantillons d'artisans avec jointures complètes (gestionnaire, métiers, statut, zones, documents)
- Artisans avec email et informations complètes
- Statistiques par département avec gestionnaires
- Recherche par téléphone avec informations complètes

### 📄 `check_documents.sql`
- Artisans avec documents Drive
- Statistiques des documents par type
- Artisans sans documents
- Documents Drive spécifiquement
- Vérification des URLs Drive valides

### 🐛 `debug_import_errors.sql`
- Diagnostic des erreurs d'import
- Vérification des emails problématiques
- Contraintes uniques
- Derniers artisans créés
- Recherche par noms similaires

## 🚀 Comment utiliser

1. **Ouvrir Supabase Studio**
2. **Aller dans SQL Editor**
3. **Copier-coller une requête** depuis ces fichiers
4. **Cliquer sur Run**

## 🎯 Ordre recommandé pour diagnostiquer l'import

1. `count_artisans.sql` - Vérifier le nombre total
2. `check_email_duplicates.sql` - Vérifier les doublons d'emails
3. `debug_import_errors.sql` - Diagnostic spécifique des erreurs
4. `search_artisan_by_email.sql` - Rechercher les emails problématiques

## 📝 Notes

- Toutes les requêtes sont compatibles avec PostgreSQL/Supabase
- Les requêtes peuvent être exécutées individuellement
- Certaines requêtes contiennent plusieurs versions (commentées/décommentées)
- Les emails problématiques sont spécifiques à l'erreur d'import actuelle

## 🔧 Personnalisation

Pour adapter les requêtes à vos besoins :
- Modifiez les emails dans `search_artisan_by_email.sql`
- Ajustez les limites (LIMIT) selon vos besoins
- Ajoutez des filtres supplémentaires si nécessaire
