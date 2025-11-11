# 📚 Index - Extraction de Demandes de Devis

## 🎯 Où Commencer ?

### Je veux commencer rapidement (5 minutes)
👉 **[QUICKSTART_DEMANDE_DEVIS.md](./QUICKSTART_DEMANDE_DEVIS.md)**
- Installation rapide
- Première extraction
- Commandes essentielles

### Je veux comprendre le système en français
👉 **[README_FR.md](./README_FR.md)**
- Vue d'ensemble en français
- Exemples pratiques
- Choix du provider
- Dépannage

### Je veux la documentation technique complète
👉 **[README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)**
- Installation détaillée
- Tous les cas d'usage
- Intégration dans un pipeline
- API REST
- Troubleshooting avancé

### Je veux voir ce qui a été créé
👉 **[NOUVEAU_SYSTEME_EXTRACTION.md](./NOUVEAU_SYSTEME_EXTRACTION.md)**
- Résumé du nouveau système
- Comparaison avec l'ancien
- Fonctionnalités clés
- Architecture

### Je veux voir l'historique
👉 **[CHANGELOG_DEMANDE_DEVIS.md](./CHANGELOG_DEMANDE_DEVIS.md)**
- Liste complète des fonctionnalités
- Fichiers créés
- Roadmap future
- Métriques

---

## 📂 Structure des Fichiers

### 🚀 Scripts Principaux

| Fichier | Description |
|---------|-------------|
| **extract_demande_devis.py** | Script principal d'extraction |
| **test_extraction.py** | Tests automatisés |
| **example_usage.py** | Exemples interactifs |

### 🔧 Installation

| Fichier | Description |
|---------|-------------|
| **install.sh** | Installation Linux/macOS |
| **install.ps1** | Installation Windows |
| **requirements.txt** | Dépendances Python |

### 📚 Documentation

| Fichier | Niveau | Langue | Description |
|---------|--------|--------|-------------|
| **README_FR.md** | Débutant | 🇫🇷 FR | Guide complet en français |
| **QUICKSTART_DEMANDE_DEVIS.md** | Débutant | 🇬🇧 EN | Démarrage rapide |
| **README_DEMANDE_DEVIS.md** | Avancé | 🇬🇧 EN | Documentation technique |
| **NOUVEAU_SYSTEME_EXTRACTION.md** | Vue d'ensemble | 🇬🇧 EN | Présentation système |
| **CHANGELOG_DEMANDE_DEVIS.md** | Référence | 🇬🇧 EN | Historique complet |
| **INDEX.md** | Navigation | 🇬🇧 EN | Ce fichier |

### ⚙️ Configuration

| Fichier | Description |
|---------|-------------|
| **config_example.yaml** | Exemple de configuration |
| **prompts/prompt_demande_de_devis.yaml** | Prompt YAML principal |

---

## 🎯 Par Cas d'Usage

### Installation

| Système | Fichier à utiliser |
|---------|-------------------|
| Windows | `install.ps1` |
| Linux/macOS | `install.sh` |
| Manuel | [QUICKSTART_DEMANDE_DEVIS.md](./QUICKSTART_DEMANDE_DEVIS.md) |

### Utilisation

| Besoin | Fichier à consulter |
|--------|---------------------|
| Première extraction | [README_FR.md](./README_FR.md#-démarrage-en-3-étapes) |
| Ligne de commande | [QUICKSTART_DEMANDE_DEVIS.md](./QUICKSTART_DEMANDE_DEVIS.md#-commandes-essentielles) |
| Python (code) | [README_FR.md](./README_FR.md#-utilisation-en-python) |
| Batch | [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md#mode-batch-plusieurs-images) |

### Configuration

| Besoin | Fichier à consulter |
|--------|---------------------|
| Clés API | [README_FR.md](./README_FR.md#-quel-provider-choisir-) |
| Personnaliser prompt | [README_FR.md](./README_FR.md#️-personnalisation-du-prompt) |
| Options avancées | `config_example.yaml` |

### Dépannage

| Problème | Solution |
|----------|----------|
| Tesseract | [README_FR.md](./README_FR.md#problème--tesseract-not-found) |
| Clés API | [README_FR.md](./README_FR.md#problème--groq_api_key-non-défini) |
| Qualité | [README_FR.md](./README_FR.md#problème--qualité-dextraction-faible) |
| Autres | [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md#dépannage) |

---

## 🎨 Par Niveau

### 🟢 Débutant - Je découvre

1. **Commencer** : [QUICKSTART_DEMANDE_DEVIS.md](./QUICKSTART_DEMANDE_DEVIS.md)
2. **Installer** : `.\install.ps1 groq` (Windows) ou `./install.sh groq` (Linux/macOS)
3. **Tester** : `python test_extraction.py`
4. **Premier essai** : [README_FR.md](./README_FR.md#-démarrage-en-3-étapes)

### 🟡 Intermédiaire - J'utilise

1. **Guide français** : [README_FR.md](./README_FR.md)
2. **Exemples** : `python example_usage.py`
3. **Batch** : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md#mode-batch-plusieurs-images)
4. **Intégration** : [README_FR.md](./README_FR.md#-utilisation-en-python)

### 🔴 Avancé - Je personnalise

1. **Doc technique** : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)
2. **Prompt custom** : `prompts/prompt_demande_de_devis.yaml`
3. **API REST** : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md#api-rest-exemple-avec-fastapi)
4. **Pipeline** : [NOUVEAU_SYSTEME_EXTRACTION.md](./NOUVEAU_SYSTEME_EXTRACTION.md#3-intégration-dans-un-pipeline)

---

## 🔍 Recherche Rapide

### Commandes

```bash
# Lister providers
python extract_demande_devis.py --list-providers

# Extraire
python extract_demande_devis.py -i devis.jpg --provider groq

# Batch
python extract_demande_devis.py -b dossier/ --provider groq -o results.json

# Tests
python test_extraction.py

# Exemples
python example_usage.py
```

### Liens Utiles

| Besoin | Lien |
|--------|------|
| Groq (gratuit) | https://console.groq.com |
| Ollama (local) | https://ollama.ai/download |
| Anthropic | https://console.anthropic.com |
| OpenAI | https://platform.openai.com |
| Tesseract | https://github.com/UB-Mannheim/tesseract/wiki |

---

## 💡 Recommandations

| Profil | Provider | Documentation |
|--------|----------|---------------|
| **Débutant** | Ollama | [README_FR.md](./README_FR.md) |
| **Production (gratuit)** | Groq | [QUICKSTART](./QUICKSTART_DEMANDE_DEVIS.md) |
| **Production (payant)** | Anthropic | [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md) |
| **Développeur** | Tous | [NOUVEAU_SYSTEME](./NOUVEAU_SYSTEME_EXTRACTION.md) |

---

## 🆘 Aide Rapide

### J'ai une erreur

1. **Lire le message d'erreur**
2. **Consulter** : [README_FR.md - Dépannage](./README_FR.md#-dépannage)
3. **Tester** : `python test_extraction.py`
4. **Mode verbeux** : `--verbose`

### Je veux personnaliser

1. **Prompt** : Éditer `prompts/prompt_demande_de_devis.yaml`
2. **Config** : Copier `config_example.yaml`
3. **Code** : Voir [README_FR.md - Utilisation Python](./README_FR.md#-utilisation-en-python)

### Je veux comprendre

1. **Vue d'ensemble** : [NOUVEAU_SYSTEME_EXTRACTION.md](./NOUVEAU_SYSTEME_EXTRACTION.md)
2. **Architecture** : [CHANGELOG_DEMANDE_DEVIS.md](./CHANGELOG_DEMANDE_DEVIS.md)
3. **Prompt** : `prompts/prompt_demande_de_devis.yaml`

---

## 📞 Support

| Type | Ressource |
|------|-----------|
| **Documentation** | Lire les fichiers ci-dessus |
| **Tests** | `python test_extraction.py` |
| **Exemples** | `python example_usage.py` |
| **Providers** | `python extract_demande_devis.py --list-providers` |

---

## 🎯 Démarrage Recommandé

### Pour 99% des utilisateurs :

1. **Lire** : [README_FR.md](./README_FR.md) (10 min)
2. **Installer** : `.\install.ps1 groq` (2 min)
3. **Configurer** : Clé API Groq gratuite (1 min)
4. **Tester** : Première extraction (1 min)
5. **Explorer** : `python example_usage.py`

**Total : 15 minutes pour être opérationnel !**

---

## 🎉 Bon Démarrage !

Choisissez le fichier qui correspond à votre besoin et lancez-vous !

**Fichier recommandé pour commencer** : **[README_FR.md](./README_FR.md)** 🇫🇷

