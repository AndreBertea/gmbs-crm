# 🔍 Scripts OCR - Extraction automatique de devis

## 📁 Contenu

Ce dossier contient les scripts d'extraction automatique de données depuis des demandes de devis d'intervention.

### Fichiers

- **`extract-from-devis-langchain.py`** ⭐ - Script avec LangChain + LLM gratuits (NOUVEAU)
- **`extract-from-devis.py`** - Script Python d'extraction OCR + OpenAI (original)
- **`import-extracted-devis.js`** - Script Node.js d'import dans le CRM
- **`requirements.txt`** - Dépendances Python
- **`SETUP_LANGCHAIN.md`** - Guide complet LangChain
- **`README.md`** - Ce fichier

## 🚀 Usage rapide

### ⭐ Avec LangChain + LLM Gratuits (NOUVEAU)

```bash
# Ollama (local, gratuit) - Recommandé
python extract-from-devis-langchain.py -i devis.jpg --provider ollama --model llama3

# Groq (API gratuite, rapide)
export GROQ_API_KEY="votre-clé"
python extract-from-devis-langchain.py -i devis.jpg --provider groq

# Liste des providers disponibles
python extract-from-devis-langchain.py --list-providers
```

### Avec OpenAI (original)

```bash
# Extraction depuis une image
python extract-from-devis.py -i /chemin/vers/devis.jpg -o extracted.json

# Extraction depuis du texte
python extract-from-devis.py -t "Demande plomberie..." -o extracted.json
```

### Import dans le CRM

```bash
# Simulation
node import-extracted-devis.js -i extracted.json --dry-run

# Import réel
node import-extracted-devis.js -i extracted.json
```

## 📚 Documentation complète

Pour plus de détails, consultez :

- **[QUICKSTART.md](../../../data/samples/intervention_docs/QUICKSTART.md)** - Démarrage rapide
- **[WORKFLOW_EXTRACTION_DEVIS.md](../../../docs/guide/WORKFLOW_EXTRACTION_DEVIS.md)** - Documentation complète
- **[README.md](../../../data/samples/intervention_docs/README.md)** - Guide du dataset

## 🔧 Prérequis

### Pour LangChain (LLM gratuits)

```bash
# Installation des dépendances
pip install -r requirements.txt

# Option 1: Ollama (local, gratuit) - Recommandé
# Télécharger: https://ollama.ai/download
ollama pull llama3

# Option 2: Groq (API gratuite)
export GROQ_API_KEY="votre-clé"  # Obtenez-en une sur console.groq.com

# Option 3: Hugging Face (API gratuite)
export HUGGINGFACE_API_KEY="votre-token"
```

### Pour OpenAI (original)

```bash
# Python
pip install openai pillow pytesseract

# Variables d'environnement
export OPENAI_API_KEY="sk-your-key"
```

### Tesseract OCR (requis pour les deux)

```bash
# Linux
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# macOS
brew install tesseract tesseract-lang

# Windows
# https://github.com/UB-Mannheim/tesseract/wiki
```

### 📖 Guide complet

Consultez **[SETUP_LANGCHAIN.md](SETUP_LANGCHAIN.md)** pour un guide détaillé avec tous les providers LLM gratuits.

## 🎯 Workflow

```
Image de devis  →  OCR (Tesseract)  →  LLM (GPT-4)  →  JSON structuré  →  Import CRM
```

## 💡 Exemples

### Exemple 1 : Extraction simple avec Ollama (gratuit)

```bash
cd scripts/ai/ocr

# Installer Ollama et télécharger le modèle
ollama pull llama3

# Extraire
python extract-from-devis-langchain.py \
  --text "Demande plomberie, M. Dupont Jean, 0612345678, 59000 Lille" \
  --provider ollama \
  --output test.json
```

### Exemple 2 : Extraction avec Groq (gratuit, rapide)

```bash
# Obtenir une clé sur console.groq.com
export GROQ_API_KEY="votre-clé"

# Extraire
python extract-from-devis-langchain.py \
  -i devis.jpg \
  --provider groq \
  --model llama3-70b-8192 \
  -o extracted.json
```

### Exemple 3 : Batch processing

```bash
python extract-from-devis-langchain.py \
  --batch ../../../data/devis_entrants/ \
  --provider ollama \
  --output batch_extracted.json
```

### Exemple 4 : Workflow complet

```bash
# 1. Extraire avec Ollama (gratuit)
python extract-from-devis-langchain.py -i devis.jpg --provider ollama -o extracted.json

# 2. Vérifier le JSON
cat extracted.json | python -m json.tool

# 3. Tester en dry-run
node import-extracted-devis.js -i extracted.json --dry-run

# 4. Importer pour de vrai
node import-extracted-devis.js -i extracted.json
```

## 🆘 Support

Pour toute question, consultez la documentation dans `data/samples/intervention_docs/`

