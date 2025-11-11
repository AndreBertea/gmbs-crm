# Extraction de Demandes de Devis - Documentation

## Vue d'ensemble

Le script `extract_demande_devis.py` permet d'extraire automatiquement les informations structurées à partir de demandes de devis d'intervention immobilière.

### Fonctionnalités principales

✅ **Support multi-LLM** : Ollama, Groq, Hugging Face, OpenAI, Anthropic
✅ **Prompt optimisé** : Configuration YAML avec prompt soigné et documenté
✅ **Extraction structurée** : Plus de 40 champs extraits automatiquement
✅ **Mode batch** : Traitement de plusieurs images en une seule commande
✅ **Validation** : Schéma Pydantic pour garantir la cohérence des données
✅ **Normalisation** : Dates, téléphones, emails normalisés automatiquement

---

## Installation

### Prérequis

1. **Python 3.8+**

2. **Tesseract OCR** (pour l'extraction de texte depuis images)

```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# macOS
brew install tesseract tesseract-lang

# Windows
# Téléchargez depuis: https://github.com/UB-Mannheim/tesseract/wiki
```

3. **Dépendances Python**

```bash
cd scripts/ai/ocr
pip install -r requirements.txt

# Ou avec uv (recommandé)
uv pip install -r requirements.txt
```

### Packages spécifiques par provider

```bash
# Pour Ollama (local, gratuit)
pip install langchain-community
# Installer Ollama: https://ollama.ai/download

# Pour Groq (API gratuite)
pip install langchain-groq

# Pour Anthropic Claude
pip install langchain-anthropic

# Pour OpenAI
pip install langchain-openai

# Pour Hugging Face
pip install langchain-community huggingface_hub
```

---

## Configuration des Clés API

### Groq (Recommandé - Gratuit & Rapide)

```bash
# 1. Créer un compte sur https://console.groq.com
# 2. Générer une clé API
# 3. Configurer la variable d'environnement
export GROQ_API_KEY="gsk_..."

# Windows (PowerShell)
$env:GROQ_API_KEY="gsk_..."

# Windows (CMD)
set GROQ_API_KEY=gsk_...
```

### Anthropic Claude

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### OpenAI

```bash
export OPENAI_API_KEY="sk-..."
```

### Hugging Face

```bash
export HUGGINGFACE_API_KEY="hf_..."
```

---

## Usage

### Lister les providers disponibles

```bash
python extract_demande_devis.py --list-providers
```

### Extraire depuis une image

```bash
# Avec Ollama (local, gratuit)
python extract_demande_devis.py \
  -i data/samples/intervention_docs/demande_devis/demande_de_devis_travaux_multiples_2.jpeg \
  --provider ollama \
  --model llama3.2

# Avec Groq (API gratuite, très rapide)
python extract_demande_devis.py \
  -i devis.jpg \
  --provider groq \
  --model llama-3.3-70b-versatile

# Avec Anthropic Claude (payant, très performant)
python extract_demande_devis.py \
  -i devis.jpg \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022

# Avec OpenAI GPT-4
python extract_demande_devis.py \
  -i devis.jpg \
  --provider openai \
  --model gpt-4o
```

### Extraire depuis un texte déjà extrait

```bash
python extract_demande_devis.py \
  -t "Objet : Demande de devis N° 250923180018907..." \
  --provider groq
```

### Mode batch (plusieurs images)

```bash
python extract_demande_devis.py \
  -b data/samples/intervention_docs/demande_devis/ \
  --provider groq \
  -o results.json \
  --verbose
```

---

## Structure des Données Extraites

Le script extrait les informations suivantes :

### 1. Informations Administratives
- `numero_demande` : Numéro unique de la demande
- `date_demande` : Date de création (format ISO)
- `date_reponse_souhaitee` : Date limite de réponse
- `date_document` : Date du document
- `reference_intervention` : Référence interne

### 2. Gestionnaire
```json
{
  "gestionnaire": {
    "nom_complet": "MME Nadege MARAUD",
    "prenom": "Nadege",
    "nom": "MARAUD",
    "telephone": "0251775356",
    "email": "n.maraud@agence.fr",
    "agence": "Agence Immobilière XYZ"
  }
}
```

### 3. Mandat / Propriétaire
```json
{
  "mandat": {
    "numero": "038349",
    "proprietaire_nom": "M GUARTA TEODORO MME NICAUD MAURICETTE"
  }
}
```

### 4. Bien Immobilier
```json
{
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
  }
}
```

### 5. Contact / Occupant
```json
{
  "contact": {
    "type": "occupant",
    "nom_complet": "Mme Nadege MARAUD",
    "prenom": "Nadege",
    "nom": "MARAUD",
    "telephone": "0612345678",
    "email": "contact@email.fr"
  }
}
```

### 6. Intervention
```json
{
  "intervention": {
    "objet": "DEMANDE DE DEVIS SUITE DEPOT DE GARANTIE",
    "description": "NETTOYAGE ENTREE Murs, traces noires sur 9m²...",
    "urgence": true,
    "depot_garantie": true,
    "metiers": ["Nettoyage", "Plomberie"],
    "pieces_concernees": ["Entrée", "Salle de bain", "Cuisine"],
    "logement_vacant": true
  }
}
```

### 7. Agence Destinataire
```json
{
  "agence": {
    "nom": "ORPI ST DENIS",
    "adresse": "193 AVENUE DU PRESIDENT WILSON - 93210 ST DENIS",
    "email": "orpi.loc@gmail.com",
    "telephone": "0155992229"
  }
}
```

---

## Personnalisation du Prompt

Le prompt est défini dans le fichier YAML :
```
scripts/ai/ocr/prompts/prompt_demande_de_devis.yaml
```

### Structure du fichier YAML

```yaml
version: "1.0"
name: "Extraction de Demande de Devis"

# Configuration du modèle
model_config:
  temperature: 0.1
  max_tokens: 2000
  top_p: 0.9

# Prompt système
system_prompt: |
  Tu es un assistant IA spécialisé...

# Template utilisateur
user_prompt_template: |
  Voici le texte OCR:
  {ocr_text}

# Schéma JSON attendu
expected_schema:
  type: object
  properties:
    ...

# Exemples few-shot
examples:
  - input: "..."
    output: "..."
```

### Utiliser un prompt personnalisé

```bash
python extract_demande_devis.py \
  -i devis.jpg \
  --provider groq \
  --prompt ./mon_prompt_custom.yaml
```

---

## Comparaison des Providers

| Provider | Gratuit | Vitesse | Qualité | Vision | Recommandation |
|----------|---------|---------|---------|--------|----------------|
| **Ollama** | ✅ Oui | 🟡 Moyen | 🟡 Bon | ❌ Non | Idéal pour débuter |
| **Groq** | ✅ Oui | 🟢 Très rapide | 🟢 Excellent | ❌ Non | **Recommandé** |
| **Anthropic** | ❌ Payant | 🟢 Rapide | 🟢 Excellent | ✅ Oui | Production |
| **OpenAI** | ❌ Payant | 🟢 Rapide | 🟢 Excellent | ✅ Oui | Production |
| **HuggingFace** | ✅ Oui | 🔴 Lent | 🟡 Bon | ❌ Non | Tests |

### Coûts estimés (pour 1000 extractions)

- **Ollama** : 0€ (local)
- **Groq** : 0€ (gratuit)
- **Anthropic Claude** : ~5-10€
- **OpenAI GPT-4** : ~10-15€
- **HuggingFace** : 0€ (gratuit avec limites)

---

## Exemples Complets

### Exemple 1 : Extraction simple avec Ollama

```bash
# 1. Installer Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Télécharger le modèle
ollama pull llama3.2

# 3. Extraire
python extract_demande_devis.py \
  -i devis.jpg \
  --provider ollama \
  -o resultat.json
```

### Exemple 2 : Batch avec Groq

```bash
# 1. Configurer la clé API
export GROQ_API_KEY="gsk_..."

# 2. Traiter tous les devis
python extract_demande_devis.py \
  -b ./dossier_devis/ \
  --provider groq \
  --model llama-3.3-70b-versatile \
  -o extractions_batch.json \
  --verbose
```

### Exemple 3 : Production avec Claude

```bash
# 1. Configurer la clé API
export ANTHROPIC_API_KEY="sk-ant-..."

# 2. Extraction haute qualité
python extract_demande_devis.py \
  -i devis_important.jpg \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022 \
  -o resultat_claude.json
```

---

## Intégration dans un Pipeline

### Script Python

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
```

### API REST (exemple avec FastAPI)

```python
from fastapi import FastAPI, UploadFile
from extract_demande_devis import DemandeDevisExtractor

app = FastAPI()
extractor = DemandeDevisExtractor(provider="groq")

@app.post("/extract-devis")
async def extract_devis(file: UploadFile):
    # Sauvegarder temporairement
    temp_path = Path(f"/tmp/{file.filename}")
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    
    # Extraire
    result = extractor.extract_from_image(temp_path)
    
    # Nettoyer
    temp_path.unlink()
    
    return result
```

---

## Dépannage

### Tesseract non trouvé

```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# macOS
brew install tesseract

# Windows
# Télécharger depuis: https://github.com/UB-Mannheim/tesseract/wiki
# Puis ajouter au PATH
```

### Clé API invalide

```bash
# Vérifier que la variable est définie
echo $GROQ_API_KEY

# Recharger la configuration
source ~/.bashrc  # ou ~/.zshrc
```

### Erreur de mémoire avec Ollama

```bash
# Utiliser un modèle plus léger
ollama pull llama3.2:7b

# Ou
python extract_demande_devis.py -i devis.jpg --provider ollama --model llama3.2:7b
```

### Qualité d'extraction faible

1. **Améliorer l'OCR** : Utiliser une image de meilleure qualité
2. **Changer de modèle** : Essayer Claude ou GPT-4
3. **Ajuster le prompt** : Modifier `prompt_demande_de_devis.yaml`
4. **Ajouter des exemples** : Enrichir la section `examples` du YAML

---

## Roadmap

- [ ] Support de vision directe (sans OCR) pour Claude et GPT-4
- [ ] Interface web (Streamlit/Gradio)
- [ ] Export vers bases de données (PostgreSQL, MongoDB)
- [ ] Validation avancée avec règles métier
- [ ] Support de documents multi-pages
- [ ] Détection automatique du type de document

---

## Contribution

Pour contribuer :

1. Améliorer le prompt dans `prompt_demande_de_devis.yaml`
2. Ajouter de nouveaux providers LLM
3. Enrichir les exemples few-shot
4. Améliorer la validation Pydantic

---

## Support

Pour toute question ou problème :

1. Vérifier la documentation
2. Lister les providers : `python extract_demande_devis.py --list-providers`
3. Mode verbeux : `--verbose` pour plus de détails

---

## Licence

Ce script fait partie du projet GMBS CRM.

