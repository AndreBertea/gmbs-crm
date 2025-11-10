# 🎉 Nouveau Système d'Extraction de Demandes de Devis

## 📋 Résumé

J'ai créé un **système complet d'extraction de demandes de devis** avec support multi-LLM (Ollama, Groq, Hugging Face, OpenAI, **Anthropic**).

---

## ✨ Ce qui a été créé

### 🚀 Script Principal

**`extract_demande_devis.py`** - Le cœur du système
- ✅ Support de 5 providers LLM (dont **Anthropic Claude**)
- ✅ Extraction de **40+ champs** structurés
- ✅ Validation avec schéma Pydantic
- ✅ Modes : image, texte, batch
- ✅ Normalisation automatique (dates, téléphones, etc.)

### 🎯 Prompt Optimisé

**`prompts/prompt_demande_de_devis.yaml`** - Configuration du prompt
- ✅ Prompt système détaillé avec contexte métier
- ✅ 7 catégories d'informations (gestionnaire, bien, intervention, etc.)
- ✅ Règles d'extraction et de normalisation
- ✅ Exemples few-shot pour améliorer la précision
- ✅ Schéma JSON complet

### 📚 Documentation Complète

1. **`README_DEMANDE_DEVIS.md`** (100+ lignes)
   - Installation détaillée
   - Configuration des clés API
   - Exemples d'usage
   - Comparaison des providers
   - Dépannage

2. **`QUICKSTART_DEMANDE_DEVIS.md`**
   - Guide de démarrage en 5 minutes
   - Commandes essentielles
   - Dépannage express

3. **`CHANGELOG_DEMANDE_DEVIS.md`**
   - Liste complète des fonctionnalités
   - Comparaison avec l'ancien script
   - Roadmap future

### 🧪 Tests et Exemples

1. **`test_extraction.py`**
   - Tests automatisés
   - Vérification de l'installation

2. **`example_usage.py`**
   - 5 exemples interactifs
   - Menu de démonstration

### ⚙️ Installation Automatique

1. **`install.sh`** (Linux/macOS)
2. **`install.ps1`** (Windows)
3. **`config_example.yaml`** (Configuration)
4. **`requirements.txt`** (Mis à jour avec Anthropic et YAML)

---

## 🚀 Démarrage Rapide

### Option 1 : Groq (API Gratuite - Recommandé)

```bash
# 1. Obtenir une clé API gratuite
# https://console.groq.com

# 2. Configurer
export GROQ_API_KEY="gsk_..."

# 3. Installer (Windows)
cd scripts\ai\ocr
.\install.ps1 groq

# 4. Tester
python extract_demande_devis.py -i ..\..\data\samples\intervention_docs\demande_devis\demande_de_devis_travaux_multiples_2.jpeg --provider groq
```

### Option 2 : Ollama (Local, Gratuit)

```bash
# 1. Télécharger Ollama
# https://ollama.ai/download

# 2. Installer
cd scripts\ai\ocr
.\install.ps1 ollama

# 3. Tester
python extract_demande_devis.py -i exemple.jpg --provider ollama
```

---

## 🎯 Fonctionnalités Clés

### Support Multi-LLM

| Provider | Gratuit | Vitesse | Qualité | Setup |
|----------|---------|---------|---------|-------|
| **Groq** | ✅ | 🟢 Ultra-rapide | 🟢 Excellent | 2 min |
| **Ollama** | ✅ | 🟡 Moyen | 🟡 Bon | 5 min |
| **Anthropic** | ❌ | 🟢 Rapide | 🟢 Excellent | 2 min |
| **OpenAI** | ❌ | 🟢 Rapide | 🟢 Excellent | 2 min |
| **HuggingFace** | ✅ | 🔴 Lent | 🟡 Bon | 2 min |

### Extraction Structurée

Le système extrait automatiquement :

```json
{
  "numero_demande": "250923180018907",
  "date_demande": "2025-09-23",
  "date_reponse_souhaitee": "2025-09-24",
  
  "gestionnaire": {
    "nom_complet": "MME Nadege MARAUD",
    "prenom": "Nadege",
    "nom": "MARAUD",
    "telephone": "0251775356",
    "email": null,
    "agence": null
  },
  
  "mandat": {
    "numero": "038349",
    "proprietaire_nom": "M GUARTA TEODORO MME NICAUD MAURICETTE"
  },
  
  "bien": {
    "ensemble_immobilier": "N°E0005981 CASTELIN",
    "numero_lot": "A224",
    "etage": "2nd",
    "adresse_complete": "BAT - 2ND - APT A224 LE CASTELIN 133 avenue de la Republique 93150 LE BLANC MESNIL",
    "adresse": "133 avenue de la Republique",
    "code_postal": "93150",
    "ville": "LE BLANC MESNIL",
    "date_achevement_travaux": "2022-05-31",
    "taux_tva_applicable": "10%"
  },
  
  "contact": {
    "type": "occupant",
    "nom_complet": "Mme Nadege MARAUD",
    "prenom": "Nadege",
    "nom": "MARAUD",
    "telephone": null,
    "email": null
  },
  
  "intervention": {
    "objet": "DEMANDE DE DEVIS SUITE DEPOT DE GARANTIE",
    "description": "NETTOYAGE ENTREE Murs, traces noires...",
    "urgence": true,
    "depot_garantie": true,
    "metiers": ["Nettoyage", "Plomberie", "Électricité"],
    "pieces_concernees": ["Entrée", "Salle de bain", "Cuisine"],
    "logement_vacant": true
  },
  
  "agence": {
    "nom": "ORPI ST DENIS",
    "adresse": "193 AVENUE DU PRESIDENT WILSON - 93210 ST DENIS",
    "email": "orpi.loc@gmail.com",
    "telephone": "0155992229"
  }
}
```

---

## 📝 Commandes Essentielles

```bash
# Lister les providers
python extract_demande_devis.py --list-providers

# Extraire depuis une image
python extract_demande_devis.py -i devis.jpg --provider groq

# Batch (plusieurs images)
python extract_demande_devis.py -b dossier_devis/ --provider groq -o results.json

# Mode verbeux
python extract_demande_devis.py -i devis.jpg --provider groq --verbose

# Prompt personnalisé
python extract_demande_devis.py -i devis.jpg --provider groq --prompt custom.yaml

# Tests
python test_extraction.py

# Exemples interactifs
python example_usage.py
```

---

## 🎨 Utilisation en Python

```python
from pathlib import Path
from extract_demande_devis import DemandeDevisExtractor

# Initialiser
extractor = DemandeDevisExtractor(
    provider="groq",
    model="llama-3.3-70b-versatile"
)

# Extraire depuis une image
result = extractor.extract_from_image(Path("devis.jpg"))

# Extraire depuis du texte
result = extractor.extract_from_text(ocr_text)

# Accéder aux données
print(f"Numéro: {result['numero_demande']}")
print(f"Urgence: {result['intervention']['urgence']}")
print(f"Métiers: {result['intervention']['metiers']}")
```

---

## 🔧 Personnalisation du Prompt

Le prompt est défini dans `prompts/prompt_demande_de_devis.yaml` :

```yaml
version: "1.0"
name: "Extraction de Demande de Devis"

model_config:
  temperature: 0.1
  max_tokens: 2000

system_prompt: |
  Tu es un assistant IA spécialisé...

user_prompt_template: |
  Voici le texte OCR:
  {ocr_text}

examples:
  - input: "..."
    output: "..."
```

Pour personnaliser :
1. Copier le fichier YAML
2. Modifier selon vos besoins
3. Utiliser avec `--prompt mon_prompt.yaml`

---

## 📊 Synthèse des Prompts

Le nouveau prompt a été construit en analysant :
- Les besoins métier spécifiques aux demandes de devis
- L'exemple de document fourni (image JPEG)
- Les patterns d'extraction réussis

### Améliorations par rapport à l'ancien système :

| Aspect | Ancien | Nouveau |
|--------|--------|---------|
| **Contexte métier** | Basique | Détaillé et explicite |
| **Champs extraits** | 15-20 | 40+ |
| **Instructions** | Générales | Spécifiques avec exemples |
| **Normalisation** | Manuelle | Automatique avec règles |
| **Validation** | Limitée | Complète avec Pydantic |
| **Flexibilité** | Hard-codé | Fichier YAML externe |
| **Exemples** | 3 exemples simples | Exemples détaillés + patterns |

---

## 🎯 Cas d'Usage

### 1. Extraction Simple

```bash
python extract_demande_devis.py -i devis.jpg --provider groq
```

### 2. Traitement par Lot

```bash
python extract_demande_devis.py -b ./mes_devis/ --provider groq -o resultats.json
```

### 3. Intégration dans un Pipeline

```python
from extract_demande_devis import DemandeDevisExtractor
import json

extractor = DemandeDevisExtractor(provider="groq")

# Traiter plusieurs fichiers
devis_files = Path("devis_folder").glob("*.jpg")
results = []

for devis_file in devis_files:
    result = extractor.extract_from_image(devis_file)
    results.append(result)

# Sauvegarder
with open("extractions.json", "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
```

### 4. API REST (FastAPI)

```python
from fastapi import FastAPI, UploadFile
from extract_demande_devis import DemandeDevisExtractor

app = FastAPI()
extractor = DemandeDevisExtractor(provider="groq")

@app.post("/extract-devis")
async def extract(file: UploadFile):
    temp_path = Path(f"/tmp/{file.filename}")
    temp_path.write_bytes(await file.read())
    result = extractor.extract_from_image(temp_path)
    temp_path.unlink()
    return result
```

---

## 📦 Fichiers Créés

```
scripts/ai/ocr/
├── 🚀 extract_demande_devis.py           # Script principal (500+ lignes)
├── 🧪 test_extraction.py                  # Tests automatisés
├── 🎨 example_usage.py                    # Exemples interactifs
├── 🔧 install.sh                          # Installation Linux/macOS
├── 🔧 install.ps1                         # Installation Windows
├── ⚙️  config_example.yaml                # Configuration exemple
├── 📦 requirements.txt                    # Dépendances (mis à jour)
├── 📚 README_DEMANDE_DEVIS.md            # Documentation (100+ lignes)
├── 🚀 QUICKSTART_DEMANDE_DEVIS.md        # Guide rapide
├── 📝 CHANGELOG_DEMANDE_DEVIS.md         # Changelog complet
├── 📋 NOUVEAU_SYSTEME_EXTRACTION.md      # Ce fichier
└── prompts/
    └── 🎯 prompt_demande_de_devis.yaml   # Prompt YAML (300+ lignes)
```

**Total** : 12 nouveaux fichiers, ~2000 lignes de code et documentation

---

## 🎓 Prochaines Étapes

1. **Installation** : Exécuter `.\install.ps1 groq` (Windows)
2. **Configuration** : Créer une clé API Groq (gratuit)
3. **Test** : Lancer `python test_extraction.py`
4. **Première extraction** : Utiliser l'image d'exemple
5. **Exploration** : Tester `python example_usage.py`
6. **Personnalisation** : Modifier le prompt YAML si nécessaire

---

## 💡 Recommandations

### Pour débuter (gratuit)
1. **Groq** : API gratuite, très rapide, excellent
   - Créer un compte sur https://console.groq.com
   - Générer une clé API
   - `export GROQ_API_KEY="gsk_..."`

2. **Ollama** : Local, gratuit, bon
   - Télécharger depuis https://ollama.ai/download
   - `ollama pull llama3.2`

### Pour la production
1. **Groq** : Gratuit, très rapide (limites généreuses)
2. **Anthropic Claude** : Payant, excellent, fiable
3. **OpenAI GPT-4** : Payant, référence du marché

---

## 🆘 Aide

- **Documentation** : Lire [README_DEMANDE_DEVIS.md](./README_DEMANDE_DEVIS.md)
- **Quick Start** : Lire [QUICKSTART_DEMANDE_DEVIS.md](./QUICKSTART_DEMANDE_DEVIS.md)
- **Tests** : Exécuter `python test_extraction.py`
- **Exemples** : Exécuter `python example_usage.py`
- **Providers** : `python extract_demande_devis.py --list-providers`

---

## 🎉 Conclusion

Vous disposez maintenant d'un **système complet et professionnel** d'extraction de demandes de devis avec :

✅ Support de 5 LLMs différents (dont Anthropic)
✅ Prompt optimisé et configurable (YAML)
✅ Extraction de 40+ champs structurés
✅ Documentation complète (700+ lignes)
✅ Tests et exemples
✅ Installation automatique

**Bonne extraction ! 🚀**

