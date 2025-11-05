#!/usr/bin/env python3
"""
Script d'extraction automatique avec LangChain et LLM gratuits
Supporte : Ollama (local), Groq (API), Hugging Face (API), OpenAI

Usage:
    # Avec Ollama (local, gratuit)
    python extract-from-devis-langchain.py -i devis.jpg --provider ollama --model llama3
    
    # Avec Groq (API gratuite)
    python extract-from-devis-langchain.py -i devis.jpg --provider groq --model llama3-70b-8192
    
    # Avec Hugging Face
    python extract-from-devis-langchain.py -i devis.jpg --provider huggingface --model mistralai/Mixtral-8x7B-Instruct-v0.1
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional, List

# Ajouter le chemin racine au PYTHONPATH
script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent.parent.parent
sys.path.insert(0, str(project_root))

# Configuration
DATASET_PATH = project_root / "data" / "samples" / "intervention_docs" / "train.jsonl"
CONFIG_PATH = project_root / "data" / "samples" / "intervention_docs" / "config.json"

# Import conditionnel des dépendances
try:
    from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    from langchain_core.pydantic_v1 import BaseModel, Field
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("⚠️  LangChain non installé. Installez avec: pip install langchain langchain-core")

try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️  Tesseract non disponible. Installez avec: pip install pytesseract pillow")


# ========================================
# Modèles Pydantic pour validation
# ========================================

class TenantInfo(BaseModel):
    """Informations du locataire/client"""
    firstname: Optional[str] = Field(None, description="Prénom du client")
    lastname: Optional[str] = Field(None, description="Nom du client")
    email: Optional[str] = Field(None, description="Email du client")
    telephone: Optional[str] = Field(None, description="Téléphone du client")
    adresse: Optional[str] = Field(None, description="Adresse du client")
    ville: Optional[str] = Field(None, description="Ville du client")
    code_postal: Optional[str] = Field(None, description="Code postal du client")


class OwnerInfo(BaseModel):
    """Informations du propriétaire"""
    firstname: Optional[str] = Field(None, description="Prénom du propriétaire")
    lastname: Optional[str] = Field(None, description="Nom du propriétaire")
    telephone: Optional[str] = Field(None, description="Téléphone du propriétaire")
    raison_sociale: Optional[str] = Field(None, description="Raison sociale (entreprise)")


class InterventionInfo(BaseModel):
    """Informations de l'intervention"""
    adresse: Optional[str] = Field(None, description="Adresse de l'intervention")
    ville: Optional[str] = Field(None, description="Ville de l'intervention")
    code_postal: Optional[str] = Field(None, description="Code postal de l'intervention")
    contexte: Optional[str] = Field(None, description="Description du problème")
    date_souhaitee: Optional[str] = Field(None, description="Date souhaitée (YYYY-MM-DD)")
    urgence: bool = Field(False, description="Intervention urgente ?")


class DevisExtractedData(BaseModel):
    """Structure complète des données extraites"""
    metier: Optional[str] = Field(None, description="Métier concerné (Plomberie, Électricité, etc.)")
    tenant: Optional[TenantInfo] = Field(None, description="Informations du locataire/client")
    owner: Optional[OwnerInfo] = Field(None, description="Informations du propriétaire")
    intervention: InterventionInfo = Field(..., description="Informations de l'intervention")
    agence: Optional[str] = Field(None, description="Nom de l'agence")


# ========================================
# Classe principale
# ========================================

class DevisExtractorLangChain:
    """Extracteur de données avec LangChain et LLM gratuits"""
    
    PROVIDERS = {
        "ollama": {
            "name": "Ollama (Local)",
            "free": True,
            "default_model": "llama3",
            "install": "https://ollama.ai/download"
        },
        "groq": {
            "name": "Groq (API)",
            "free": True,
            "default_model": "llama3-70b-8192",
            "api_key_env": "GROQ_API_KEY"
        },
        "huggingface": {
            "name": "Hugging Face (API)",
            "free": True,
            "default_model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "api_key_env": "HUGGINGFACE_API_KEY"
        },
        "openai": {
            "name": "OpenAI (Payant)",
            "free": False,
            "default_model": "gpt-4",
            "api_key_env": "OPENAI_API_KEY"
        }
    }
    
    def __init__(self, provider: str = "ollama", model: Optional[str] = None, 
                 dataset_path: Path = DATASET_PATH):
        if not LANGCHAIN_AVAILABLE:
            raise RuntimeError("LangChain non disponible. Installez avec: pip install langchain langchain-core")
        
        self.provider = provider.lower()
        self.model_name = model or self.PROVIDERS[self.provider]["default_model"]
        self.dataset_path = dataset_path
        self.examples = self._load_examples()
        self.llm = self._init_llm()
        self.parser = JsonOutputParser(pydantic_object=DevisExtractedData)
    
    def _load_examples(self) -> List[Dict]:
        """Charge les exemples depuis le dataset"""
        if not self.dataset_path.exists():
            print(f"⚠️  Dataset non trouvé: {self.dataset_path}")
            return []
        
        examples = []
        with open(self.dataset_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Split par ligne vide (format JSON indenté)
            json_objects = []
            current_obj = ""
            brace_count = 0
            
            for line in content.split('\n'):
                if line.strip():
                    current_obj += line + '\n'
                    brace_count += line.count('{') - line.count('}')
                    
                    if brace_count == 0 and current_obj.strip():
                        try:
                            json_objects.append(json.loads(current_obj))
                            current_obj = ""
                        except json.JSONDecodeError:
                            pass
        
        print(f"✅ {len(json_objects)} exemples chargés depuis {self.dataset_path.name}")
        return json_objects
    
    def _init_llm(self):
        """Initialise le LLM selon le provider"""
        print(f"🤖 Initialisation de {self.PROVIDERS[self.provider]['name']} avec modèle {self.model_name}...")
        
        if self.provider == "ollama":
            try:
                from langchain_community.llms import Ollama
                return Ollama(model=self.model_name, temperature=0.1)
            except ImportError:
                raise RuntimeError("Ollama LangChain non disponible. Installez avec: pip install langchain-community")
        
        elif self.provider == "groq":
            try:
                from langchain_groq import ChatGroq
                api_key = os.environ.get("GROQ_API_KEY")
                if not api_key:
                    raise ValueError("GROQ_API_KEY non défini. Obtenez-en une sur https://console.groq.com")
                return ChatGroq(model_name=self.model_name, temperature=0.1, groq_api_key=api_key)
            except ImportError:
                raise RuntimeError("Groq LangChain non disponible. Installez avec: pip install langchain-groq")
        
        elif self.provider == "huggingface":
            try:
                from langchain_community.llms import HuggingFaceHub
                api_key = os.environ.get("HUGGINGFACE_API_KEY")
                if not api_key:
                    raise ValueError("HUGGINGFACE_API_KEY non défini. Obtenez-en une sur https://huggingface.co/settings/tokens")
                return HuggingFaceHub(
                    repo_id=self.model_name, 
                    huggingfacehub_api_token=api_key,
                    model_kwargs={"temperature": 0.1, "max_new_tokens": 1000}
                )
            except ImportError:
                raise RuntimeError("Hugging Face LangChain non disponible. Installez avec: pip install langchain-community huggingface_hub")
        
        elif self.provider == "openai":
            try:
                from langchain_openai import ChatOpenAI
                api_key = os.environ.get("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY non défini")
                return ChatOpenAI(model=self.model_name, temperature=0.1, openai_api_key=api_key)
            except ImportError:
                raise RuntimeError("OpenAI LangChain non disponible. Installez avec: pip install langchain-openai")
        
        else:
            raise ValueError(f"Provider '{self.provider}' non supporté. Utilisez: {', '.join(self.PROVIDERS.keys())}")
    
    def _build_prompt_template(self) -> ChatPromptTemplate:
        """Construit le prompt template avec few-shot learning"""
        
        # Exemples pour few-shot learning
        few_shot_examples = []
        for ex in self.examples[:3]:  # 3 premiers exemples
            few_shot_examples.append({
                "input": ex.get("ocr_text", ""),
                "output": json.dumps(ex.get("extracted_data", {}), ensure_ascii=False, indent=2)
            })
        
        # Template pour chaque exemple
        example_prompt = ChatPromptTemplate.from_messages([
            ("human", "Texte OCR:\n{input}"),
            ("ai", "Données extraites:\n{output}")
        ])
        
        # Few-shot prompt
        few_shot_prompt = FewShotChatMessagePromptTemplate(
            example_prompt=example_prompt,
            examples=few_shot_examples,
        )
        
        # Prompt final
        final_prompt = ChatPromptTemplate.from_messages([
            ("system", """Tu es un assistant spécialisé dans l'extraction de données de demandes de devis d'intervention.

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

{format_instructions}

Voici quelques exemples :"""),
            few_shot_prompt,
            ("human", "Maintenant, extrait les données de ce devis:\n\n{input}")
        ])
        
        return final_prompt
    
    def extract_with_llm(self, ocr_text: str) -> Dict:
        """Extrait les données avec LangChain + LLM"""
        print(f"🤖 Extraction avec {self.provider}/{self.model_name}...")
        
        try:
            # Construire la chaîne LangChain
            prompt = self._build_prompt_template()
            chain = prompt | self.llm | self.parser
            
            # Exécuter
            result = chain.invoke({
                "input": ocr_text,
                "format_instructions": self.parser.get_format_instructions()
            })
            
            print("✅ Extraction réussie")
            return result
            
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
    
    @classmethod
    def list_providers(cls):
        """Affiche la liste des providers disponibles"""
        print("\n📋 Providers disponibles :\n")
        for key, info in cls.PROVIDERS.items():
            free_badge = "🆓 GRATUIT" if info["free"] else "💰 PAYANT"
            print(f"  {key:15} - {info['name']:20} {free_badge}")
            print(f"                  Modèle par défaut: {info['default_model']}")
            if "api_key_env" in info:
                print(f"                  Variable env: {info['api_key_env']}")
            if "install" in info:
                print(f"                  Installation: {info['install']}")
            print()


def main():
    parser = argparse.ArgumentParser(
        description="Extraction de données avec LangChain et LLM gratuits",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:

  # Ollama (local, gratuit) - Recommandé
  python extract-from-devis-langchain.py -i devis.jpg --provider ollama --model llama3

  # Groq (API gratuite, rapide)
  export GROQ_API_KEY="votre-clé"
  python extract-from-devis-langchain.py -i devis.jpg --provider groq

  # Hugging Face (API gratuite)
  export HUGGINGFACE_API_KEY="votre-clé"
  python extract-from-devis-langchain.py -i devis.jpg --provider huggingface

  # Liste des providers
  python extract-from-devis-langchain.py --list-providers
        """
    )
    
    parser.add_argument("--image", "-i", type=Path, help="Chemin vers une image de devis")
    parser.add_argument("--text", "-t", type=str, help="Texte OCR déjà extrait")
    parser.add_argument("--batch", "-b", type=Path, help="Dossier contenant plusieurs images")
    parser.add_argument("--provider", "-p", default="ollama", 
                       choices=["ollama", "groq", "huggingface", "openai"],
                       help="Provider LLM à utiliser (défaut: ollama)")
    parser.add_argument("--model", "-m", help="Modèle LLM spécifique à utiliser")
    parser.add_argument("--output", "-o", type=Path, help="Fichier de sortie JSON")
    parser.add_argument("--list-providers", action="store_true", help="Lister les providers disponibles")
    
    args = parser.parse_args()
    
    # Liste des providers
    if args.list_providers:
        DevisExtractorLangChain.list_providers()
        return 0
    
    # Initialiser l'extracteur
    try:
        extractor = DevisExtractorLangChain(provider=args.provider, model=args.model)
    except Exception as e:
        print(f"❌ Erreur d'initialisation: {e}")
        return 1
    
    # Traitement
    results = []
    
    try:
        if args.text:
            # Mode texte direct
            result = extractor.extract_with_llm(args.text)
            results.append({"text": args.text[:100], "extracted": result})
        
        elif args.image:
            # Mode image unique
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









