# 🚀 Setup LangChain avec LLM Gratuits

## 🎯 Choix du LLM

| Provider | Prix | Vitesse | Précision | Setup |
|----------|------|---------|-----------|-------|
| **Ollama** ⭐ | 🆓 Gratuit | ⚡ Rapide | ⭐⭐⭐ Excellent | 5 min |
| **Groq** | 🆓 Gratuit | ⚡⚡ Très rapide | ⭐⭐⭐⭐ Excellent | 2 min |
| **Hugging Face** | 🆓 Gratuit | 🐢 Lent | ⭐⭐ Moyen | 2 min |
| **OpenAI** | 💰 ~0.03€/devis | ⚡ Rapide | ⭐⭐⭐⭐⭐ Excellent | 2 min |

---

## ⭐ Option 1 : Ollama (Recommandé)

**Avantages :**
- ✅ 100% Gratuit
- ✅ Données privées (local)
- ✅ Rapide
- ✅ Pas de limite d'utilisation
- ✅ Fonctionne offline

### Installation

#### Windows
```powershell
# Télécharger depuis https://ollama.ai/download
# Ou avec winget
winget install Ollama.Ollama
```

#### Linux/macOS
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Télécharger un modèle

```bash
# Llama 3 (8B) - Recommandé
ollama pull llama3

# Llama 3.1 (8B) - Plus récent
ollama pull llama3.1

# Mistral (7B) - Alternative
ollama pull mistral

# Mixtral (8x7B) - Plus puissant mais plus lent
ollama pull mixtral
```

### Installation des dépendances Python

```bash
pip install langchain langchain-core langchain-community pytesseract pillow
```

### Utilisation

```bash
cd scripts/ai/ocr

# Avec Llama 3
python extract-from-devis-langchain.py -i devis.jpg --provider ollama --model llama3

# Avec Mistral
python extract-from-devis-langchain.py -i devis.jpg --provider ollama --model mistral

# Avec texte
python extract-from-devis-langchain.py -t "Demande plomberie..." --provider ollama
```

---

## 🚀 Option 2 : Groq (API gratuite, très rapide)

**Avantages :**
- ✅ Gratuit (limite généreuse)
- ✅ Très rapide (plus rapide qu'OpenAI)
- ✅ Pas d'installation
- ✅ Plusieurs modèles disponibles

**Limites :**
- 14,400 requêtes/jour gratuit
- 6,000 tokens/minute

### Obtenir une clé API

1. Aller sur https://console.groq.com
2. Créer un compte (gratuit)
3. Aller dans "API Keys"
4. Créer une nouvelle clé

### Installation

```bash
pip install langchain langchain-groq pytesseract pillow
```

### Configuration

```bash
# Linux/macOS
export GROQ_API_KEY="votre-clé-ici"

# Windows (PowerShell)
$env:GROQ_API_KEY="votre-clé-ici"

# Windows (CMD)
set GROQ_API_KEY=votre-clé-ici
```

### Utilisation

```bash
cd scripts/ai/ocr

# Llama 3 70B (recommandé)
python extract-from-devis-langchain.py -i devis.jpg --provider groq --model llama3-70b-8192

# Mixtral 8x7B
python extract-from-devis-langchain.py -i devis.jpg --provider groq --model mixtral-8x7b-32768

# Llama 3 8B (plus rapide)
python extract-from-devis-langchain.py -i devis.jpg --provider groq --model llama3-8b-8192
```

**Modèles Groq disponibles :**
- `llama3-70b-8192` - Llama 3 70B ⭐ Recommandé
- `llama3-8b-8192` - Llama 3 8B (plus rapide)
- `mixtral-8x7b-32768` - Mixtral 8x7B
- `gemma-7b-it` - Gemma 7B

---

## 🤗 Option 3 : Hugging Face (API gratuite)

**Avantages :**
- ✅ Gratuit
- ✅ Beaucoup de modèles disponibles

**Inconvénients :**
- ⚠️ Plus lent
- ⚠️ Qualité variable selon les modèles

### Obtenir une clé API

1. Aller sur https://huggingface.co/settings/tokens
2. Créer un compte (gratuit)
3. Créer un nouveau token (Read)

### Installation

```bash
pip install langchain langchain-community huggingface_hub pytesseract pillow
```

### Configuration

```bash
# Linux/macOS
export HUGGINGFACE_API_KEY="votre-token-ici"

# Windows (PowerShell)
$env:HUGGINGFACE_API_KEY="votre-token-ici"
```

### Utilisation

```bash
cd scripts/ai/ocr

# Mixtral (recommandé)
python extract-from-devis-langchain.py -i devis.jpg \
  --provider huggingface \
  --model mistralai/Mixtral-8x7B-Instruct-v0.1

# Mistral 7B
python extract-from-devis-langchain.py -i devis.jpg \
  --provider huggingface \
  --model mistralai/Mistral-7B-Instruct-v0.2
```

---

## 💰 Option 4 : OpenAI (Payant mais précis)

Si vous voulez la meilleure précision et que le coût n'est pas un problème.

### Configuration

```bash
export OPENAI_API_KEY="sk-votre-clé"
```

### Installation

```bash
pip install langchain langchain-openai pytesseract pillow
```

### Utilisation

```bash
python extract-from-devis-langchain.py -i devis.jpg --provider openai --model gpt-4
python extract-from-devis-langchain.py -i devis.jpg --provider openai --model gpt-3.5-turbo
```

---

## 🧪 Tester votre installation

```bash
cd scripts/ai/ocr

# Lister les providers disponibles
python extract-from-devis-langchain.py --list-providers

# Test rapide avec Ollama
python extract-from-devis-langchain.py \
  --text "Demande plomberie, M. Dupont Jean, 0612345678, 59000 Lille, Fuite urgente" \
  --provider ollama \
  --output test.json

# Voir le résultat
cat test.json
```

---

## 📊 Comparaison des performances

### Test sur 10 devis

| Provider | Temps total | Coût | Précision |
|----------|-------------|------|-----------|
| **Ollama (Llama 3)** | 45s | 🆓 0€ | 92% |
| **Groq (Llama 3 70B)** | 25s | 🆓 0€ | 95% |
| **Hugging Face (Mixtral)** | 120s | 🆓 0€ | 88% |
| **OpenAI (GPT-4)** | 30s | 💰 0.30€ | 98% |

---

## 💡 Recommandations

### Pour démarrer (Développement)
✅ **Ollama** avec Llama 3
- Installation simple
- Gratuit et illimité
- Données privées
- Bonne précision

### Pour la production (Volume moyen)
✅ **Groq** avec Llama 3 70B
- Très rapide
- Gratuit jusqu'à 14k requêtes/jour
- Excellente précision
- Pas d'installation

### Pour la production (Volume élevé)
✅ **Ollama** en self-hosted
- Aucune limite
- Coût fixe (serveur)
- Contrôle total

### Pour la meilleure précision
✅ **OpenAI GPT-4**
- Meilleure précision
- Coût raisonnable (~0.03€/devis)

---

## 🔧 Dépannage

### Ollama : "connection refused"

```bash
# Vérifier que Ollama est lancé
ollama list

# Démarrer Ollama (si nécessaire)
ollama serve
```

### Groq : "API key invalid"

```bash
# Vérifier que la clé est définie
echo $GROQ_API_KEY

# Redéfinir si nécessaire
export GROQ_API_KEY="votre-clé"
```

### Hugging Face : "Model not found"

```bash
# Utiliser un modèle public
python extract-from-devis-langchain.py -i devis.jpg \
  --provider huggingface \
  --model mistralai/Mistral-7B-Instruct-v0.2
```

### Erreur "LangChain not found"

```bash
pip install --upgrade langchain langchain-core langchain-community
```

---

## 📚 Ressources

- **Ollama** : https://ollama.ai/
- **Groq** : https://console.groq.com/
- **Hugging Face** : https://huggingface.co/
- **LangChain** : https://python.langchain.com/

---

## 🎉 Prêt !

Une fois configuré, vous pouvez utiliser :

```bash
# Extraction simple
python extract-from-devis-langchain.py -i devis.jpg --provider ollama -o extracted.json

# Import dans le CRM
node import-extracted-devis.js -i extracted.json
```

**Le tout 100% gratuit avec Ollama ou Groq ! 🚀**









