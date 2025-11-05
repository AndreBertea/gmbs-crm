#!/usr/bin/env python3
"""
Script d'extraction automatique de données depuis des devis d'intervention
Utilise le dataset train.jsonl pour few-shot learning avec un LLM

Usage:
    python extract-from-devis.py --image path/to/devis.jpg
    python extract-from-devis.py --text "Texte OCR déjà extrait..."
    python extract-from-devis.py --batch path/to/folder/
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional

# Ajouter le chemin racine au PYTHONPATH
script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent.parent.parent
sys.path.insert(0, str(project_root))

# Configuration
DATASET_PATH = project_root / "data" / "samples" / "intervention_docs" / "train.jsonl"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Import conditionnel des dépendances (si disponibles)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  OpenAI package non installé. Installez avec: pip install openai")

try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️  Tesseract non disponible. Installez avec: pip install pytesseract pillow")


class DevisExtractor:
    """Extracteur de données de devis utilisant un LLM"""
    
    def __init__(self, dataset_path: Path, api_key: Optional[str] = None):
        self.dataset_path = dataset_path
        self.examples = self._load_examples()
        self.api_key = api_key or OPENAI_API_KEY
        
        if self.api_key and OPENAI_AVAILABLE:
            openai.api_key = self.api_key
    
    def _load_examples(self) -> list:
        """Charge les exemples depuis le dataset"""
        if not self.dataset_path.exists():
            print(f"⚠️  Dataset non trouvé: {self.dataset_path}")
            return []
        
        examples = []
        with open(self.dataset_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    examples.append(json.loads(line))
        
        print(f"✅ {len(examples)} exemples chargés depuis {self.dataset_path.name}")
        return examples
    
    def _build_system_prompt(self) -> str:
        """Construit le prompt système avec few-shot examples"""
        base_prompt = """Tu es un assistant spécialisé dans l'extraction de données de demandes de devis d'intervention.

À partir du texte OCR d'un document, tu dois extraire :
- Le métier concerné (Plomberie, Électricité, Chauffage, Serrurerie, Bricolage, etc.)
- Les informations du locataire/client (tenant)
- Les informations du propriétaire (owner) si mentionné
- Les détails de l'intervention

IMPORTANT :
- Si une information n'est pas présente, utilise null
- Pour l'urgence, cherche des mots comme "urgent", "immédiat", "rapide"
- Nettoie les numéros de téléphone (enlever espaces/points)
- Normalise les emails en minuscules

Retourne UNIQUEMENT un objet JSON valide (pas de texte avant/après) avec cette structure exacte :
{
  "metier": "...",
  "tenant": {
    "firstname": "...",
    "lastname": "...",
    "email": "...",
    "telephone": "...",
    "adresse": "...",
    "ville": "...",
    "code_postal": "..."
  },
  "owner": {
    "firstname": "...",
    "lastname": "...",
    "telephone": "...",
    "raison_sociale": "..."
  } ou null,
  "intervention": {
    "adresse": "...",
    "ville": "...",
    "code_postal": "...",
    "contexte": "...",
    "date_souhaitee": "YYYY-MM-DD" ou null,
    "urgence": true/false
  },
  "agence": "..." ou null
}

EXEMPLES D'EXTRACTION :
"""
        
        # Ajouter 3-5 exemples du dataset
        few_shot = []
        for i, example in enumerate(self.examples[:5], 1):
            ocr_text = example.get("ocr_text", "")
            extracted = example.get("extracted_data", {})
            few_shot.append(
                f"\n--- EXEMPLE {i} ---\n"
                f"TEXTE OCR:\n{ocr_text}\n\n"
                f"RÉSULTAT JSON:\n{json.dumps(extracted, ensure_ascii=False, indent=2)}\n"
            )
        
        return base_prompt + "\n".join(few_shot)
    
    def extract_with_llm(self, ocr_text: str, model: str = "gpt-4") -> Dict:
        """Extrait les données avec un LLM (GPT-4, GPT-3.5, etc.)"""
        if not OPENAI_AVAILABLE:
            raise RuntimeError("OpenAI package non disponible")
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY non défini")
        
        print(f"🤖 Extraction avec {model}...")
        
        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": self._build_system_prompt()},
                    {"role": "user", "content": f"Extrait les données de ce devis:\n\n{ocr_text}"}
                ],
                temperature=0.1,  # Peu de créativité, plus de précision
                max_tokens=1000
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Nettoyer le résultat (enlever markdown si présent)
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            
            result_text = result_text.strip()
            
            # Parser le JSON
            extracted_data = json.loads(result_text)
            
            print("✅ Extraction réussie")
            return extracted_data
            
        except json.JSONDecodeError as e:
            print(f"❌ Erreur de parsing JSON: {e}")
            print(f"Réponse brute: {result_text[:500]}")
            raise
        except Exception as e:
            print(f"❌ Erreur lors de l'extraction: {e}")
            raise
    
    def extract_from_image(self, image_path: Path) -> Dict:
        """Extrait depuis une image (OCR + LLM)"""
        if not OCR_AVAILABLE:
            raise RuntimeError("Tesseract non disponible")
        
        print(f"📷 Lecture de l'image: {image_path}")
        image = Image.open(image_path)
        
        print("🔍 Extraction OCR...")
        ocr_text = pytesseract.image_to_string(image, lang='fra')
        
        print(f"📄 Texte OCR extrait ({len(ocr_text)} caractères)")
        print(f"Aperçu: {ocr_text[:200]}...\n")
        
        return self.extract_with_llm(ocr_text)
    
    def extract_with_regex(self, text: str) -> Dict:
        """Extraction simple par regex (fallback si pas de LLM)"""
        import re
        
        print("🔧 Extraction par regex (mode fallback)...")
        
        data = {
            "metier": None,
            "tenant": {
                "firstname": None,
                "lastname": None,
                "email": None,
                "telephone": None,
                "adresse": None,
                "ville": None,
                "code_postal": None
            },
            "owner": None,
            "intervention": {
                "adresse": None,
                "ville": None,
                "code_postal": None,
                "contexte": None,
                "date_souhaitee": None,
                "urgence": False
            },
            "agence": None
        }
        
        # Métier
        metiers = ["Plomberie", "Électricité", "Chauffage", "Serrurerie", "Bricolage", "Menuiserie", "Peinture"]
        for metier in metiers:
            if re.search(metier, text, re.IGNORECASE):
                data["metier"] = metier
                break
        
        # Téléphone
        tel_matches = re.findall(r'0[1-9](?:[\s.]?\d{2}){4}', text)
        if tel_matches:
            data["tenant"]["telephone"] = tel_matches[0].replace(' ', '').replace('.', '')
        
        # Email
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        if email_match:
            data["tenant"]["email"] = email_match.group(0).lower()
        
        # Code postal + ville
        postal_match = re.search(r'(\d{5})\s+([A-ZÀ-Ÿ][a-zà-ÿ\s-]+)', text)
        if postal_match:
            code_postal = postal_match.group(1)
            ville = postal_match.group(2).strip()
            data["tenant"]["code_postal"] = code_postal
            data["tenant"]["ville"] = ville
            data["intervention"]["code_postal"] = code_postal
            data["intervention"]["ville"] = ville
        
        # Urgence
        data["intervention"]["urgence"] = bool(re.search(r'urgent|immédiat|rapide', text, re.IGNORECASE))
        
        # Contexte (prendre les 200 premiers caractères après "Description:" ou "Problème:")
        context_match = re.search(r'(?:Description|Problème|Contexte)\s*:\s*(.{50,200})', text, re.IGNORECASE)
        if context_match:
            data["intervention"]["contexte"] = context_match.group(1).strip()
        
        print("⚠️  Extraction regex limitée (données partielles)")
        return data


def main():
    parser = argparse.ArgumentParser(description="Extraction de données depuis des devis")
    parser.add_argument("--image", "-i", type=Path, help="Chemin vers une image de devis")
    parser.add_argument("--text", "-t", type=str, help="Texte OCR déjà extrait")
    parser.add_argument("--batch", "-b", type=Path, help="Dossier contenant plusieurs images")
    parser.add_argument("--model", "-m", default="gpt-4", help="Modèle LLM à utiliser (gpt-4, gpt-3.5-turbo)")
    parser.add_argument("--output", "-o", type=Path, help="Fichier de sortie JSON")
    parser.add_argument("--no-llm", action="store_true", help="Utiliser regex au lieu de LLM")
    
    args = parser.parse_args()
    
    # Initialiser l'extracteur
    extractor = DevisExtractor(DATASET_PATH)
    
    # Traitement
    results = []
    
    try:
        if args.text:
            # Mode texte direct
            if args.no_llm:
                result = extractor.extract_with_regex(args.text)
            else:
                result = extractor.extract_with_llm(args.text, model=args.model)
            results.append({"text": args.text[:100], "extracted": result})
        
        elif args.image:
            # Mode image unique
            if args.no_llm:
                raise ValueError("Mode --no-llm non compatible avec --image (OCR requis)")
            result = extractor.extract_from_image(args.image)
            results.append({"image": str(args.image), "extracted": result})
        
        elif args.batch:
            # Mode batch
            if not args.batch.is_dir():
                print(f"❌ {args.batch} n'est pas un dossier")
                return 1
            
            images = list(args.batch.glob("*.jpg")) + list(args.batch.glob("*.jpeg")) + list(args.batch.glob("*.png"))
            print(f"📁 {len(images)} images trouvées dans {args.batch}")
            
            for i, img_path in enumerate(images, 1):
                print(f"\n--- [{i}/{len(images)}] {img_path.name} ---")
                try:
                    result = extractor.extract_from_image(img_path)
                    results.append({"image": str(img_path), "extracted": result})
                except Exception as e:
                    print(f"❌ Erreur: {e}")
                    results.append({"image": str(img_path), "error": str(e)})
        
        else:
            parser.print_help()
            return 1
        
        # Afficher résultats
        print("\n" + "="*80)
        print("📊 RÉSULTATS")
        print("="*80)
        print(json.dumps(results, ensure_ascii=False, indent=2))
        
        # Sauvegarder si demandé
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Résultats sauvegardés dans {args.output}")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Erreur fatale: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())









