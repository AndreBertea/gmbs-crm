# 🇫🇷 Système d'Extraction de Demandes de Devis

## 🎯 Mission Accomplie !

J'ai créé un **système complet d'extraction automatique** pour vos demandes de devis d'intervention, avec support de **5 LLMs différents** dont **Anthropic Claude**.

---

## ✨ Qu'est-ce qui a été créé ?

### 1. Script Principal : `extract_demande_devis.py`

Un script Python professionnel qui :
- 🤖 Supporte **5 providers LLM** : Ollama, Groq, Hugging Face, OpenAI, **Anthropic**
- 📊 Extrait **40+ champs structurés** automatiquement
- 🔄 Normalise les données (dates ISO, téléphones, emails, etc.)
- 📦 Traite des images uniques ou par lot (batch)
- ✅ Valide les résultats avec Pydantic

### 2. Prompt YAML : `prompts/prompt_demande_de_devis.yaml`

Un prompt soigneusement conçu avec :
- 📝 Instructions détaillées et contexte métier
- 🎯 7 catégories d'informations à extraire
- 📚 Exemples few-shot pour améliorer la précision
- 🔍 Règles de normalisation et validation
- 📋 Schéma JSON complet

### 3. Documentation Complète (700+ lignes)

- **README_DEMANDE_DEVIS.md** : Documentation technique complète
- **QUICKSTART_DEMANDE_DEVIS.md** : Guide de démarrage rapide (5 min)
- **CHANGELOG_DEMANDE_DEVIS.md** : Liste des fonctionnalités
- **NOUVEAU_SYSTEME_EXTRACTION.md** : Vue d'ensemble du système

### 4. Outils et Tests

- **test_extraction.py** : Tests automatisés
- **example_usage.py** : 5 exemples interactifs
- **install.sh** : Installation automatique (Linux/macOS)
- **install.ps1** : Installation automatique (Windows)
- **config_example.yaml** : Configuration exemple

---

## 🚀 Démarrage en 3 Étapes

### Étape 1 : Installation (2 minutes)

```powershell
# Windows PowerShell
cd scripts\ai\ocr
.\install.ps1 groq
```

### Étape 2 : Configuration (1 minute)

```powershell
# Obtenir une clé API GRATUITE sur https://console.groq.com
$env:GROQ_API_KEY="gsk_votre_cle_ici"
```

### Étape 3 : Première Extraction (1 minute)

```powershell
python extract_demande_devis.py -i ..\..\data\samples\intervention_docs\demande_devis\demande_de_devis_travaux_multiples_2.jpeg --provider groq
```

**C'est tout ! 🎉**

---

## 📊 Données Extraites

Le système extrait automatiquement :

### 📋 Informations Administratives
- Numéro de demande
- Dates (demande, réponse souhaitée, document)
- Référence intervention

### 👤 Gestionnaire
- Nom complet, prénom, nom
- Téléphone (normalisé)
- Email (normalisé)
- Agence

### 🏢 Mandat & Propriétaire
- Numéro de mandat
- Nom du propriétaire

### 🏠 Bien Immobilier
- Ensemble immobilier, lot, étage
- Adresse complète
- Code postal, ville (en majuscules)
- Date d'achèvement
- Taux de TVA applicable

### 📞 Contact / Occupant
- Type de contact
- Coordonnées complètes

### 🔧 Intervention
- Objet et description détaillée
- Urgence (Oui/Non)
- Dépôt de garantie (Oui/Non)
- **Métiers détectés** (Plomberie, Électricité, etc.)
- **Pièces concernées** (Cuisine, Salle de bain, etc.)
- Logement vacant (Oui/Non)

### 🏢 Agence Destinataire
- Nom, adresse
- Email, téléphone

**Total : 40+ champs !**

---

## 💡 Quel Provider Choisir ?

### 🆓 Solutions Gratuites

#### Groq (⭐ Recommandé)
```powershell
# ✅ Gratuit
# ✅ Ultra-rapide (le plus rapide du marché)
# ✅ Excellente qualité
# ⚙️ Setup : 2 minutes

# Configuration
$env:GROQ_API_KEY="gsk_..."
python extract_demande_devis.py -i devis.jpg --provider groq
```

#### Ollama (Local)
```powershell
# ✅ Gratuit
# ✅ 100% local (pas besoin d'internet)
# ✅ Aucune clé API nécessaire
# ⏱️ Plus lent que Groq
# ⚙️ Setup : 5 minutes

# Installation : https://ollama.ai/download
python extract_demande_devis.py -i devis.jpg --provider ollama
```

### 💰 Solutions Payantes (Haute Qualité)

#### Anthropic Claude
```powershell
# 💰 Payant (~5-10€ pour 1000 extractions)
# ✅ Excellente qualité
# ✅ Très fiable
# ⚙️ Setup : 2 minutes

$env:ANTHROPIC_API_KEY="sk-ant-..."
python extract_demande_devis.py -i devis.jpg --provider anthropic
```

#### OpenAI GPT-4
```powershell
# 💰 Payant (~10-15€ pour 1000 extractions)
# ✅ Référence du marché
# ✅ Excellente qualité
# ⚙️ Setup : 2 minutes

$env:OPENAI_API_KEY="sk-..."
python extract_demande_devis.py -i devis.jpg --provider openai
```

---

## 📝 Commandes Principales

```powershell
# Lister tous les providers disponibles
python extract_demande_devis.py --list-providers

# Extraire depuis une image
python extract_demande_devis.py -i devis.jpg --provider groq

# Extraire et sauvegarder en JSON
python extract_demande_devis.py -i devis.jpg --provider groq -o resultat.json

# Traiter plusieurs images (batch)
python extract_demande_devis.py -b dossier_devis\ --provider groq -o batch.json

# Mode verbeux (debug)
python extract_demande_devis.py -i devis.jpg --provider groq --verbose

# Utiliser un prompt personnalisé
python extract_demande_devis.py -i devis.jpg --provider groq --prompt mon_prompt.yaml

# Exécuter les tests
python test_extraction.py

# Voir les exemples interactifs
python example_usage.py
```

---

## 🎨 Utilisation en Python

```python
from pathlib import Path
from extract_demande_devis import DemandeDevisExtractor

# 1. Initialiser l'extracteur
extractor = DemandeDevisExtractor(
    provider="groq",  # ou "ollama", "anthropic", "openai"
    model="llama-3.3-70b-versatile"  # optionnel
)

# 2. Extraire depuis une image
result = extractor.extract_from_image(Path("devis.jpg"))

# 3. Accéder aux données
print(f"Numéro de demande : {result['numero_demande']}")
print(f"Date : {result['date_demande']}")
print(f"Urgent : {result['intervention']['urgence']}")
print(f"Ville : {result['bien']['ville']}")
print(f"Métiers : {', '.join(result['intervention']['metiers'])}")

# 4. Sauvegarder
import json
with open("resultat.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
```

---

## ⚙️ Personnalisation du Prompt

Le prompt se trouve dans : `prompts/prompt_demande_de_devis.yaml`

Pour le personnaliser :

1. **Copier le fichier**
```powershell
copy prompts\prompt_demande_de_devis.yaml mon_prompt.yaml
```

2. **Éditer selon vos besoins**
```yaml
system_prompt: |
  Votre prompt personnalisé ici...

examples:
  - input: "Votre exemple..."
    output: "Votre résultat..."
```

3. **Utiliser votre prompt**
```powershell
python extract_demande_devis.py -i devis.jpg --provider groq --prompt mon_prompt.yaml
```

---

## 🔍 Synthèse des Prompts

Le nouveau prompt a été créé en analysant :

1. **Le document exemple** : `demande_de_devis_travaux_multiples_2.jpeg`
2. **Les besoins métier** : Gestion immobilière, interventions, devis
3. **Les patterns d'extraction** : Ce qui fonctionne le mieux avec les LLMs

### Points Clés du Prompt

- ✅ **Contexte métier clair** : Le LLM comprend qu'il s'agit de gestion immobilière
- ✅ **Instructions précises** : 40+ champs à extraire avec descriptions
- ✅ **Règles de normalisation** : Dates ISO, téléphones sans espaces, etc.
- ✅ **Déduction intelligente** : Détection d'urgence, métiers, pièces
- ✅ **Exemples concrets** : Few-shot learning pour améliorer la précision
- ✅ **Validation** : Schéma JSON pour garantir la cohérence

---

## 📦 Fichiers Créés

```
scripts/ai/ocr/
│
├── 🚀 SCRIPTS
│   ├── extract_demande_devis.py        # Script principal (500+ lignes)
│   ├── test_extraction.py               # Tests automatisés
│   └── example_usage.py                 # Exemples interactifs
│
├── 🔧 INSTALLATION
│   ├── install.sh                       # Installation Linux/macOS
│   ├── install.ps1                      # Installation Windows
│   └── requirements.txt                 # Dépendances (mis à jour)
│
├── 📚 DOCUMENTATION
│   ├── README_DEMANDE_DEVIS.md          # Doc technique complète
│   ├── QUICKSTART_DEMANDE_DEVIS.md      # Guide rapide
│   ├── CHANGELOG_DEMANDE_DEVIS.md       # Changelog détaillé
│   ├── NOUVEAU_SYSTEME_EXTRACTION.md    # Vue d'ensemble
│   └── README_FR.md                     # Ce fichier
│
├── ⚙️ CONFIGURATION
│   └── config_example.yaml              # Configuration exemple
│
└── 🎯 PROMPTS
    └── prompt_demande_de_devis.yaml     # Prompt YAML (300+ lignes)
```

**Total : 12 fichiers, ~2500 lignes de code et documentation**

---

## 🎯 Exemples Pratiques

### Exemple 1 : Extraction Simple

```powershell
python extract_demande_devis.py `
  -i C:\devis\mon_devis.jpg `
  --provider groq `
  -o resultat.json
```

### Exemple 2 : Traitement par Lot

```powershell
# Traiter tous les devis d'un dossier
python extract_demande_devis.py `
  -b C:\devis\septembre_2024\ `
  --provider groq `
  -o extractions_septembre.json `
  --verbose
```

### Exemple 3 : Avec Anthropic Claude (haute qualité)

```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."

python extract_demande_devis.py `
  -i devis_important.jpg `
  --provider anthropic `
  --model claude-3-5-sonnet-20241022 `
  -o resultat_claude.json
```

---

## 🆘 Dépannage

### Problème : "Tesseract not found"

**Solution** :
1. Télécharger Tesseract : https://github.com/UB-Mannheim/tesseract/wiki
2. Installer
3. Ajouter au PATH système

### Problème : "GROQ_API_KEY non défini"

**Solution** :
```powershell
# Vérifier
echo $env:GROQ_API_KEY

# Configurer
$env:GROQ_API_KEY="gsk_..."

# Rendre permanent (ajouter à votre profil PowerShell)
echo '$env:GROQ_API_KEY="gsk_..."' >> $PROFILE
```

### Problème : "Erreur d'importation langchain"

**Solution** :
```powershell
cd scripts\ai\ocr
.\install.ps1 groq
```

### Problème : "Qualité d'extraction faible"

**Solutions** :
1. Utiliser une image de meilleure qualité
2. Changer de provider (essayer Claude ou GPT-4)
3. Ajuster le prompt dans le fichier YAML

---

## 📈 Performances

| Provider | Vitesse | Qualité | Coût | Recommandation |
|----------|---------|---------|------|----------------|
| **Groq** | ⚡⚡⚡ | 🌟🌟🌟 | 🆓 Gratuit | ⭐ **Recommandé** |
| **Ollama** | ⚡⚡ | 🌟🌟 | 🆓 Gratuit | Bon pour débuter |
| **Anthropic** | ⚡⚡⚡ | 🌟🌟🌟 | 💰 ~5€/1000 | Production |
| **OpenAI** | ⚡⚡⚡ | 🌟🌟🌟 | 💰 ~10€/1000 | Production |
| **HuggingFace** | ⚡ | 🌟🌟 | 🆓 Gratuit | Tests |

---

## 🎓 Pour Aller Plus Loin

1. **Lire la documentation complète** : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)
2. **Tester les exemples** : `python example_usage.py`
3. **Personnaliser le prompt** : Éditer `prompts/prompt_demande_de_devis.yaml`
4. **Intégrer dans votre code** : Voir les exemples Python ci-dessus

---

## 🤝 Contribution

Pour améliorer le système :

1. Enrichir le prompt YAML avec plus d'exemples
2. Ajouter de nouveaux champs à extraire
3. Améliorer les règles de normalisation
4. Tester avec différents types de documents

---

## 📞 Support

- 📖 **Doc complète** : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)
- 🚀 **Quick Start** : [QUICKSTART_DEMANDE_DEVIS.md](./QUICKSTART_DEMANDE_DEVIS.md)
- 🧪 **Tests** : `python test_extraction.py`
- 🎨 **Exemples** : `python example_usage.py`
- 📋 **Providers** : `python extract_demande_devis.py --list-providers`

---

## 🎉 Conclusion

Vous avez maintenant un **système professionnel et complet** pour extraire automatiquement les informations de vos demandes de devis !

**Caractéristiques principales :**
- ✅ 5 LLMs supportés (dont Anthropic)
- ✅ 40+ champs extraits automatiquement
- ✅ Prompt optimisé et personnalisable
- ✅ Documentation complète en français
- ✅ Tests et exemples fournis
- ✅ Installation automatique

**C'est parti ! 🚀**

---

**Commencez maintenant :**

```powershell
cd scripts\ai\ocr
.\install.ps1 groq
python extract_demande_devis.py -i votre_devis.jpg --provider groq
```

**Bon courage ! 💪**

