# 📝 Changelog - Extraction de Demandes de Devis

## 🎉 Version 1.0.0 - Novembre 2024

### ✨ Nouveautés

#### 🚀 Script Principal
- **`extract_demande_devis.py`** : Script d'extraction complet avec support multi-LLM
  - Support de 5 providers : Ollama, Groq, Hugging Face, OpenAI, Anthropic
  - Extraction structurée de plus de 40 champs
  - Mode image unique, texte, et batch
  - Validation avec schéma Pydantic
  - Normalisation automatique (dates, téléphones, emails)

#### 🎯 Prompt Optimisé
- **`prompts/prompt_demande_de_devis.yaml`** : Prompt YAML structuré
  - Prompt système détaillé avec contexte métier
  - 7 catégories d'informations à extraire
  - Règles d'extraction et de normalisation
  - Exemples few-shot pour améliorer la précision
  - Schéma JSON complet pour validation

#### 📚 Documentation
- **`README_DEMANDE_DEVIS.md`** : Documentation complète (100+ lignes)
  - Guide d'installation détaillé
  - Configuration des clés API
  - Exemples d'usage complets
  - Comparaison des providers
  - Dépannage et troubleshooting
  - Roadmap et contribution

- **`QUICKSTART_DEMANDE_DEVIS.md`** : Guide de démarrage rapide
  - Installation en 5 minutes
  - Première extraction en 2 minutes
  - Commandes essentielles
  - Exemples pratiques
  - Dépannage express

#### 🧪 Tests et Exemples
- **`test_extraction.py`** : Suite de tests automatisés
  - Test de chargement du prompt YAML
  - Test du schéma Pydantic
  - Test de disponibilité des providers
  - Test d'extraction avec texte exemple

- **`example_usage.py`** : Exemples interactifs
  - 5 exemples d'utilisation
  - Menu interactif
  - Cas d'usage réels
  - Intégration Python

#### ⚙️ Configuration
- **`config_example.yaml`** : Exemple de configuration
  - Configuration par défaut des providers
  - Modèles recommandés
  - Options OCR
  - Options de traitement et validation

#### 🔧 Installation
- **`install.sh`** : Script d'installation Linux/macOS
  - Installation automatique des dépendances
  - Support de tous les providers
  - Configuration de l'environnement virtuel
  - Vérification de Tesseract

- **`install.ps1`** : Script d'installation Windows
  - Équivalent PowerShell pour Windows
  - Installation guidée
  - Configuration automatique

- **`requirements.txt`** : Mise à jour
  - Ajout de `langchain-anthropic`
  - Ajout de `pyyaml`
  - Dépendances complètes pour tous les providers

---

## 📦 Fichiers Créés

```
scripts/ai/ocr/
├── extract_demande_devis.py           # ⭐ Script principal
├── test_extraction.py                  # 🧪 Tests
├── example_usage.py                    # 🎨 Exemples
├── install.sh                          # 🔧 Installation Linux/macOS
├── install.ps1                         # 🔧 Installation Windows
├── config_example.yaml                 # ⚙️ Configuration exemple
├── requirements.txt                    # 📦 Dépendances (mis à jour)
├── README_DEMANDE_DEVIS.md            # 📚 Documentation complète
├── QUICKSTART_DEMANDE_DEVIS.md        # 🚀 Guide rapide
├── CHANGELOG_DEMANDE_DEVIS.md         # 📝 Ce fichier
└── prompts/
    └── prompt_demande_de_devis.yaml   # 🎯 Prompt YAML
```

---

## 🆕 Fonctionnalités Principales

### Support Multi-LLM

```python
# Ollama (local, gratuit)
extractor = DemandeDevisExtractor(provider="ollama", model="llama3.2")

# Groq (API gratuite, rapide)
extractor = DemandeDevisExtractor(provider="groq", model="llama-3.3-70b-versatile")

# Anthropic Claude (payant, excellent)
extractor = DemandeDevisExtractor(provider="anthropic", model="claude-3-5-sonnet-20241022")

# OpenAI GPT-4 (payant, excellent)
extractor = DemandeDevisExtractor(provider="openai", model="gpt-4o")

# Hugging Face (gratuit avec limites)
extractor = DemandeDevisExtractor(provider="huggingface", model="mistralai/Mixtral-8x7B-Instruct-v0.1")
```

### Extraction Structurée

Le script extrait automatiquement :

1. **Informations Administratives**
   - Numéro de demande
   - Dates (demande, réponse souhaitée, document)
   - Référence intervention

2. **Gestionnaire**
   - Nom complet, prénom, nom
   - Téléphone, email
   - Agence

3. **Mandat / Propriétaire**
   - Numéro de mandat
   - Nom du propriétaire

4. **Bien Immobilier**
   - Ensemble immobilier, lot, étage
   - Adresse complète
   - Code postal, ville
   - Date d'achèvement
   - Taux de TVA

5. **Contact / Occupant**
   - Type de contact
   - Coordonnées complètes

6. **Intervention**
   - Objet et description
   - Urgence, dépôt de garantie
   - Métiers concernés
   - Pièces concernées
   - Logement vacant

7. **Agence Destinataire**
   - Nom, adresse
   - Email, téléphone

### Normalisation Automatique

- **Dates** : Conversion en format ISO (YYYY-MM-DD)
- **Téléphones** : Suppression des espaces, points, parenthèses
- **Emails** : Conversion en minuscules
- **Villes** : Conversion en MAJUSCULES
- **Codes postaux** : Validation 5 chiffres

### Modes d'Utilisation

```bash
# Image unique
python extract_demande_devis.py -i devis.jpg --provider groq

# Texte OCR déjà extrait
python extract_demande_devis.py -t "Texte OCR..." --provider groq

# Batch (plusieurs images)
python extract_demande_devis.py -b ./devis/ --provider groq -o results.json

# Prompt personnalisé
python extract_demande_devis.py -i devis.jpg --provider groq --prompt custom.yaml
```

---

## 🎯 Comparaison avec l'Ancien Script

| Fonctionnalité | extract-from-devis-langchain.py | extract_demande_devis.py (nouveau) |
|----------------|--------------------------------|-----------------------------------|
| Providers supportés | 4 (Ollama, Groq, HF, OpenAI) | 5 (+ Anthropic) |
| Prompt | Hard-codé dans le script | Fichier YAML externe |
| Champs extraits | 15-20 | 40+ |
| Normalisation | Basique | Avancée |
| Documentation | Commentaires | Docs complètes + guides |
| Tests | Non | Oui (test_extraction.py) |
| Exemples | Non | Oui (example_usage.py) |
| Installation | Manuelle | Scripts automatiques |
| Configuration | Code | Fichier YAML |

---

## 🚀 Quick Start

### Installation Rapide

```bash
# Linux/macOS
cd scripts/ai/ocr
chmod +x install.sh
./install.sh groq

# Windows
cd scripts\ai\ocr
.\install.ps1 groq
```

### Première Extraction

```bash
# Configurer la clé API Groq (gratuite)
export GROQ_API_KEY="gsk_..."

# Extraire
python extract_demande_devis.py \
  -i ../../data/samples/intervention_docs/demande_devis/demande_de_devis_travaux_multiples_2.jpeg \
  --provider groq
```

---

## 📊 Métriques

- **Lignes de code** : ~500 lignes (script principal)
- **Documentation** : 700+ lignes (3 fichiers)
- **Champs extraits** : 40+ champs structurés
- **Providers supportés** : 5 LLMs
- **Tests** : 4 suites de tests
- **Exemples** : 5 exemples complets

---

## 🔮 Roadmap Future

### Version 1.1.0 (Planifié)
- [ ] Support de vision directe (sans OCR) pour Claude et GPT-4
- [ ] Interface web avec Streamlit/Gradio
- [ ] Export vers bases de données (PostgreSQL, MongoDB)
- [ ] Cache des résultats pour éviter les appels API répétés

### Version 1.2.0 (Planifié)
- [ ] Validation avancée avec règles métier
- [ ] Support de documents multi-pages
- [ ] Détection automatique du type de document
- [ ] API REST avec FastAPI

### Version 2.0.0 (Vision)
- [ ] Fine-tuning de modèles spécialisés
- [ ] Pipeline complet d'automatisation
- [ ] Intégration CRM native
- [ ] Dashboard analytics

---

## 🤝 Contribution

Pour améliorer le système :

1. **Prompt** : Enrichir `prompts/prompt_demande_de_devis.yaml`
2. **Exemples** : Ajouter des exemples few-shot
3. **Validation** : Améliorer le schéma Pydantic
4. **Providers** : Ajouter de nouveaux LLMs
5. **Documentation** : Améliorer les guides

---

## 📞 Support

- **Documentation** : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)
- **Quick Start** : [QUICKSTART_DEMANDE_DEVIS.md](./QUICKSTART_DEMANDE_DEVIS.md)
- **Tests** : `python test_extraction.py`
- **Exemples** : `python example_usage.py`

---

## 🙏 Remerciements

Ce script a été développé pour améliorer l'efficacité de l'extraction de données à partir de demandes de devis d'intervention immobilière.

Technologies utilisées :
- **LangChain** : Framework d'orchestration LLM
- **Pydantic** : Validation de données
- **Tesseract OCR** : Extraction de texte depuis images
- **PyYAML** : Configuration flexible

Providers LLM supportés :
- **Ollama** : Modèles locaux
- **Groq** : API gratuite ultra-rapide
- **Anthropic** : Claude (haute qualité)
- **OpenAI** : GPT-4 (référence)
- **Hugging Face** : Modèles open-source

---

**Version actuelle** : 1.0.0
**Date de release** : Novembre 2024
**Statut** : Stable ✅

