# 🚀 Quick Start - Extraction de Demandes de Devis

Guide de démarrage rapide pour extraire les informations des demandes de devis en 5 minutes.

---

## ⚡ Installation Rapide

### Option 1: Ollama (Local, Gratuit, Recommandé pour débuter)

```bash
# 1. Installer Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Télécharger un modèle
ollama pull llama3.2

# 3. Installer les dépendances Python
cd scripts/ai/ocr
pip install langchain langchain-core langchain-community pydantic pytesseract pillow pyyaml

# 4. Installer Tesseract OCR
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# macOS:
brew install tesseract tesseract-lang

# Windows: Télécharger depuis https://github.com/UB-Mannheim/tesseract/wiki
```

### Option 2: Groq (API Gratuite, Très Rapide, Recommandé pour production)

```bash
# 1. Obtenir une clé API gratuite sur https://console.groq.com
# 2. Configurer la clé
export GROQ_API_KEY="gsk_..."

# 3. Installer les dépendances
pip install langchain langchain-core langchain-groq pydantic pytesseract pillow pyyaml

# 4. Installer Tesseract (voir ci-dessus)
```

---

## 🎯 Première Extraction (2 minutes)

### Test avec l'image d'exemple

```bash
cd scripts/ai/ocr

# Avec Ollama (local)
python extract_demande_devis.py \
  -i ../../data/samples/intervention_docs/demande_devis/demande_de_devis_travaux_multiples_2.jpeg \
  --provider ollama

# Avec Groq (API gratuite)
python extract_demande_devis.py \
  -i ../../data/samples/intervention_docs/demande_devis/demande_de_devis_travaux_multiples_2.jpeg \
  --provider groq
```

### Résultat attendu

```json
{
  "numero_demande": "250923180018907",
  "date_demande": "2025-09-23",
  "date_reponse_souhaitee": "2025-09-24",
  "gestionnaire": {
    "nom_complet": "MME Nadege MARAUD",
    "telephone": "0251775356"
  },
  "bien": {
    "adresse": "133 avenue de la Republique",
    "code_postal": "93150",
    "ville": "LE BLANC MESNIL"
  },
  "intervention": {
    "urgence": true,
    "metiers": ["Nettoyage", "Plomberie", "Électricité"],
    "pieces_concernees": ["Entrée", "Salle de bain", "Cuisine"]
  }
}
```

---

## 📋 Commandes Essentielles

### Lister les providers disponibles

```bash
python extract_demande_devis.py --list-providers
```

### Extraire depuis une image

```bash
python extract_demande_devis.py -i chemin/vers/devis.jpg --provider groq
```

### Extraire et sauvegarder en JSON

```bash
python extract_demande_devis.py -i devis.jpg --provider groq -o resultat.json
```

### Traiter plusieurs images (batch)

```bash
python extract_demande_devis.py -b dossier_devis/ --provider groq -o batch_results.json
```

### Mode verbeux (pour debugging)

```bash
python extract_demande_devis.py -i devis.jpg --provider groq --verbose
```

---

## 🔑 Configuration des Clés API

### Groq (Gratuit ✅)

```bash
# 1. Créer un compte: https://console.groq.com
# 2. Créer une API key
# 3. Configurer
export GROQ_API_KEY="gsk_..."

# Windows PowerShell:
$env:GROQ_API_KEY="gsk_..."
```

### Anthropic Claude (Payant 💰)

```bash
# 1. Créer un compte: https://console.anthropic.com
# 2. Créer une API key: https://console.anthropic.com/settings/keys
# 3. Configurer
export ANTHROPIC_API_KEY="sk-ant-..."
```

### OpenAI (Payant 💰)

```bash
# 1. Créer un compte: https://platform.openai.com
# 2. Créer une API key: https://platform.openai.com/api-keys
# 3. Configurer
export OPENAI_API_KEY="sk-..."
```

---

## 🎨 Exemples d'Usage

### Exemple 1: Extraction Simple

```bash
python extract_demande_devis.py \
  -i mon_devis.jpg \
  --provider groq \
  -o resultat.json
```

### Exemple 2: Batch avec Ollama

```bash
python extract_demande_devis.py \
  -b ./mes_devis/ \
  --provider ollama \
  --model llama3.2 \
  -o extractions.json
```

### Exemple 3: Haute Qualité avec Claude

```bash
export ANTHROPIC_API_KEY="sk-ant-..."

python extract_demande_devis.py \
  -i devis_important.jpg \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022 \
  -o resultat_claude.json \
  --verbose
```

### Exemple 4: Script Interactif

```bash
python example_usage.py
```

---

## 🧪 Test de l'Installation

```bash
# Exécuter les tests
python test_extraction.py
```

Résultat attendu:
```
✅ TOUS LES TESTS RÉUSSIS (4/4)
```

---

## 🛠️ Dépannage Express

### Erreur: "Tesseract not found"

```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# macOS
brew install tesseract

# Vérifier l'installation
tesseract --version
```

### Erreur: "GROQ_API_KEY non défini"

```bash
# Vérifier
echo $GROQ_API_KEY

# Si vide, configurer
export GROQ_API_KEY="votre-clé"

# Rendre permanent (Linux/Mac)
echo 'export GROQ_API_KEY="votre-clé"' >> ~/.bashrc
source ~/.bashrc
```

### Erreur: "Ollama connection refused"

```bash
# Vérifier qu'Ollama est lancé
ollama list

# Si pas de réponse, démarrer Ollama
ollama serve &

# Télécharger un modèle si nécessaire
ollama pull llama3.2
```

### Extraction de mauvaise qualité

1. **Améliorer l'image** : Utiliser une image haute résolution
2. **Changer de provider** : Essayer Claude ou GPT-4
3. **Ajuster le prompt** : Modifier `prompts/prompt_demande_de_devis.yaml`

---

## 📊 Comparaison Rapide des Providers

| Provider | Gratuit | Vitesse | Qualité | Setup |
|----------|---------|---------|---------|-------|
| **Ollama** | ✅ | 🟡 Moyen | 🟡 Bon | 5 min |
| **Groq** | ✅ | 🟢 Très rapide | 🟢 Excellent | 2 min |
| **Claude** | ❌ | 🟢 Rapide | 🟢 Excellent | 2 min |
| **GPT-4** | ❌ | 🟢 Rapide | 🟢 Excellent | 2 min |

### Recommandations

- **Débuter** : Ollama (local, gratuit, pas besoin de clé API)
- **Production** : Groq (gratuit, très rapide, excellent)
- **Qualité max** : Claude 3.5 Sonnet ou GPT-4o (payant mais excellent)

---

## 🔗 Liens Utiles

- **Documentation complète** : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)
- **Ollama** : https://ollama.ai
- **Groq** : https://console.groq.com
- **Anthropic** : https://console.anthropic.com
- **OpenAI** : https://platform.openai.com

---

## 💡 Pro Tips

### 1. Utiliser Groq pour la vitesse (gratuit)

```bash
export GROQ_API_KEY="gsk_..."
python extract_demande_devis.py -i devis.jpg --provider groq
```

### 2. Batch processing efficace

```bash
# Traiter tous les devis d'un dossier
python extract_demande_devis.py -b ./devis_septembre/ --provider groq -o septembre.json
```

### 3. Intégration dans un script

```python
from extract_demande_devis import DemandeDevisExtractor

extractor = DemandeDevisExtractor(provider="groq")
result = extractor.extract_from_image("devis.jpg")

print(f"Numéro: {result['numero_demande']}")
print(f"Urgence: {result['intervention']['urgence']}")
```

### 4. Personnaliser le prompt

```bash
# Copier le prompt par défaut
cp prompts/prompt_demande_de_devis.yaml mon_prompt.yaml

# Éditer mon_prompt.yaml selon vos besoins
# ...

# Utiliser votre prompt
python extract_demande_devis.py -i devis.jpg --provider groq --prompt mon_prompt.yaml
```

---

## 🎯 Prochain Niveau

Une fois à l'aise avec les bases :

1. 📖 Lire la [documentation complète](./README_DEMANDE_DEVIS.md)
2. 🎨 Personnaliser le [prompt YAML](./prompts/prompt_demande_de_devis.yaml)
3. 🔧 Intégrer dans votre pipeline Python
4. 🚀 Déployer en production avec Groq ou Claude

---

## ❓ Besoin d'Aide ?

1. Exécuter les tests : `python test_extraction.py`
2. Mode verbeux : `--verbose`
3. Lister les providers : `--list-providers`
4. Lire la doc complète : [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)

---

**🎉 Vous êtes prêt ! Bonne extraction !**

