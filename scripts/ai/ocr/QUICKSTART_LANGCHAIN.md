# ⚡ Démarrage Rapide - LangChain avec LLM Gratuits

## 🎯 En 10 minutes avec Ollama (100% gratuit)

### 1. Installation (5 min)

#### Windows
```powershell
# Télécharger Ollama
winget install Ollama.Ollama

# OU télécharger depuis https://ollama.ai/download
```

#### Linux/macOS
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Télécharger un modèle (2 min)

```bash
# Llama 3 (8B) - Recommandé, ~4.7GB
ollama pull llama3

# OU Mistral (7B) - Plus léger, ~4.1GB
ollama pull mistral
```

### 3. Installer les dépendances Python (1 min)

```bash
cd scripts/ai/ocr
pip install -r requirements.txt
```

### 4. Tester (2 min)

```bash
# Test simple
python extract-from-devis-langchain.py \
  --text "Demande plomberie, M. Dupont Jean, 0612345678, 59000 Lille, Fuite urgente" \
  --provider ollama \
  --output test.json

# Voir le résultat
cat test.json
```

### 5. Utiliser avec vos images

```bash
# Extraire depuis une image
python extract-from-devis-langchain.py \
  -i /chemin/vers/devis.jpg \
  --provider ollama \
  -o extracted.json

# Importer dans le CRM
node import-extracted-devis.js -i extracted.json
```

---

## 🚀 Alternative : Groq (API gratuite, plus rapide)

Si vous préférez une API plutôt qu'une installation locale :

### 1. Obtenir une clé API (2 min)

1. Aller sur https://console.groq.com
2. Créer un compte gratuit
3. Créer une clé API

### 2. Installer les dépendances (1 min)

```bash
pip install langchain langchain-groq pytesseract pillow
```

### 3. Configurer et utiliser (1 min)

```bash
# Définir la clé API
export GROQ_API_KEY="votre-clé-ici"

# Utiliser
python extract-from-devis-langchain.py \
  -i devis.jpg \
  --provider groq \
  --model llama3-70b-8192 \
  -o extracted.json
```

---

## 📊 Comparaison rapide

| Critère | Ollama | Groq |
|---------|--------|------|
| **Prix** | 🆓 Gratuit | 🆓 Gratuit (14k req/jour) |
| **Installation** | Local (5 min) | Aucune |
| **Vitesse** | ⚡ Rapide | ⚡⚡ Très rapide |
| **Offline** | ✅ Oui | ❌ Non |
| **Données** | 🔒 Privées | ☁️ Cloud |
| **Limites** | ❌ Aucune | ✅ 14k req/jour |

**Recommandation :**
- **Ollama** si vous voulez la confidentialité et pas de limites
- **Groq** si vous voulez la vitesse et la simplicité

---

## 🎓 Exemples d'utilisation

### Exemple 1 : Un seul devis

```bash
# Avec Ollama
python extract-from-devis-langchain.py \
  -i mon_devis.jpg \
  --provider ollama \
  -o resultat.json

# Avec Groq
python extract-from-devis-langchain.py \
  -i mon_devis.jpg \
  --provider groq \
  -o resultat.json
```

### Exemple 2 : Plusieurs devis (batch)

```bash
# Créer un dossier avec vos devis
mkdir mes_devis
cp *.jpg mes_devis/

# Extraire tous les devis
python extract-from-devis-langchain.py \
  --batch mes_devis/ \
  --provider ollama \
  -o batch_resultat.json

# Importer tous dans le CRM
node import-extracted-devis.js -i batch_resultat.json
```

### Exemple 3 : Depuis du texte (pas d'OCR)

```bash
python extract-from-devis-langchain.py \
  --text "DEVIS PLOMBERIE
  Client: M. Martin Paul
  Tel: 06 12 34 56 78
  Adresse: 123 Rue Test, 59000 Lille
  Problème: Fuite importante, URGENT" \
  --provider ollama \
  -o extracted.json
```

---

## 🐛 Dépannage rapide

### "Connection refused" (Ollama)

```bash
# Vérifier qu'Ollama est lancé
ollama list

# Si pas de réponse, démarrer Ollama
ollama serve
```

### "Model not found" (Ollama)

```bash
# Télécharger le modèle
ollama pull llama3

# Vérifier les modèles installés
ollama list
```

### "API key invalid" (Groq)

```bash
# Vérifier la clé
echo $GROQ_API_KEY

# Redéfinir
export GROQ_API_KEY="votre-clé-ici"
```

### "LangChain not found"

```bash
pip install --upgrade -r requirements.txt
```

---

## 💡 Astuces

### Changer de modèle Ollama

```bash
# Essayer différents modèles
ollama pull mistral
ollama pull mixtral
ollama pull codellama

# Utiliser
python extract-from-devis-langchain.py -i devis.jpg --provider ollama --model mistral
```

### Lister les providers disponibles

```bash
python extract-from-devis-langchain.py --list-providers
```

### Voir l'aide

```bash
python extract-from-devis-langchain.py --help
```

---

## 📚 Pour aller plus loin

Consultez **[SETUP_LANGCHAIN.md](SETUP_LANGCHAIN.md)** pour :
- Configuration avancée
- Comparaison détaillée des providers
- Optimisation des performances
- Autres LLM (Hugging Face, OpenAI, etc.)

---

## ✅ Checklist de vérification

Avant de commencer :

- [ ] Ollama installé (ou clé API Groq obtenue)
- [ ] Modèle téléchargé (`ollama pull llama3`)
- [ ] Dépendances Python installées (`pip install -r requirements.txt`)
- [ ] Tesseract installé (pour OCR depuis images)
- [ ] Test simple réussi

Vous êtes prêt ! 🚀

---

**Coût total : 🆓 0€**  
**Temps de setup : ⏱️ 10 minutes**  
**Qualité : ⭐⭐⭐⭐ Excellente**

