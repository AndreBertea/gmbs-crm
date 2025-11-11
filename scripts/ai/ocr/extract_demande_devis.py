#!/usr/bin/env python3
"""
Script d'extraction de demandes de devis avec support multi-LLM
Supporte : Ollama, Groq, Hugging Face, OpenAI, Anthropic

Usage:
    # Avec Ollama (local, gratuit)
    python extract_demande_devis.py -i devis.jpg --provider ollama --model llama3

    # Avec Groq (API gratuite)
    python extract_demande_devis.py -i devis.jpg --provider groq --model llama3-70b-8192

    # Avec Anthropic (Claude)
    python extract_demande_devis.py -i devis.jpg --provider anthropic --model claude-3-5-sonnet-20241022

    # Avec OpenAI
    python extract_demande_devis.py -i devis.jpg --provider openai --model gpt-4o

Configuration:
    Le prompt est défini dans: scripts/ai/ocr/prompts/prompt_demande_de_devis.yaml
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional, List, Any
import yaml

# Ajouter le chemin racine au PYTHONPATH
script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent.parent.parent
sys.path.insert(0, str(project_root))

# Configuration
PROMPT_PATH = script_dir / "prompts" / "prompt_demande_de_devis.yaml"

# Import conditionnel des dépendances
try:
    from langchain_core.prompts import ChatPromptTemplate
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

class GestionnaireInfo(BaseModel):
    """Informations du gestionnaire référent"""
    nom_complet: Optional[str] = Field(None, description="Nom complet du gestionnaire")
    prenom: Optional[str] = Field(None, description="Prénom")
    nom: Optional[str] = Field(None, description="Nom de famille")
    telephone: Optional[str] = Field(None, description="Téléphone (format normalisé)")
    email: Optional[str] = Field(None, description="Email")
    agence: Optional[str] = Field(None, description="Nom de l'agence")


class MandatInfo(BaseModel):
    """Informations du mandat"""
    numero: Optional[str] = Field(None, description="Numéro de mandat")
    proprietaire_nom: Optional[str] = Field(None, description="Nom du propriétaire")


class BienInfo(BaseModel):
    """Informations du bien immobilier"""
    ensemble_immobilier: Optional[str] = Field(None, description="Ensemble immobilier")
    numero_lot: Optional[str] = Field(None, description="Numéro de lot")
    etage: Optional[str] = Field(None, description="Étage")
    adresse_complete: Optional[str] = Field(None, description="Adresse complète")
    adresse: Optional[str] = Field(None, description="Rue")
    code_postal: Optional[str] = Field(None, description="Code postal")
    ville: Optional[str] = Field(None, description="Ville")
    date_achevement_travaux: Optional[str] = Field(None, description="Date d'achèvement")
    taux_tva_applicable: Optional[str] = Field(None, description="Taux de TVA")


class ContactInfo(BaseModel):
    """Informations du contact/occupant"""
    type: Optional[str] = Field(None, description="Type de contact")
    nom_complet: Optional[str] = Field(None, description="Nom complet")
    prenom: Optional[str] = Field(None, description="Prénom")
    nom: Optional[str] = Field(None, description="Nom de famille")
    telephone: Optional[str] = Field(None, description="Téléphone")
    email: Optional[str] = Field(None, description="Email")


class InterventionInfo(BaseModel):
    """Informations de l'intervention"""
    objet: Optional[str] = Field(None, description="Objet de la demande")
    description: str = Field(..., description="Description détaillée des travaux")
    urgence: bool = Field(False, description="Intervention urgente ?")
    depot_garantie: bool = Field(False, description="Lié à un dépôt de garantie ?")
    metiers: List[str] = Field(default_factory=list, description="Métiers concernés")
    pieces_concernees: List[str] = Field(default_factory=list, description="Pièces concernées")
    logement_vacant: bool = Field(False, description="Logement vacant ?")


class AgenceInfo(BaseModel):
    """Informations de l'agence destinataire"""
    nom: Optional[str] = Field(None, description="Nom de l'agence")
    adresse: Optional[str] = Field(None, description="Adresse")
    email: Optional[str] = Field(None, description="Email")
    telephone: Optional[str] = Field(None, description="Téléphone")


class DemandeDevisData(BaseModel):
    """Structure complète des données extraites d'une demande de devis"""
    numero_demande: Optional[str] = Field(None, description="Numéro de la demande")
    date_demande: Optional[str] = Field(None, description="Date de la demande")
    date_reponse_souhaitee: Optional[str] = Field(None, description="Date de réponse souhaitée")
    date_document: Optional[str] = Field(None, description="Date du document")
    reference_intervention: Optional[str] = Field(None, description="Référence intervention")
    gestionnaire: Optional[GestionnaireInfo] = Field(None, description="Gestionnaire")
    mandat: Optional[MandatInfo] = Field(None, description="Mandat")
    bien: Optional[BienInfo] = Field(None, description="Bien immobilier")
    contact: Optional[ContactInfo] = Field(None, description="Contact/Occupant")
    intervention: InterventionInfo = Field(..., description="Intervention")
    agence: Optional[AgenceInfo] = Field(None, description="Agence destinataire")


# ========================================
# Configuration des providers
# ========================================

PROVIDERS_CONFIG = {
    "ollama": {
        "name": "Ollama (Local)",
        "free": True,
        "default_model": "llama3.2",
        "install": "https://ollama.ai/download",
        "supports_vision": False
    },
    "groq": {
        "name": "Groq (API)",
        "free": True,
        "default_model": "llama-3.3-70b-versatile",
        "api_key_env": "GROQ_API_KEY",
        "get_key": "https://console.groq.com",
        "supports_vision": False
    },
    "huggingface": {
        "name": "Hugging Face (API)",
        "free": True,
        "default_model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "api_key_env": "HUGGINGFACE_API_KEY",
        "get_key": "https://huggingface.co/settings/tokens",
        "supports_vision": False
    },
    "openai": {
        "name": "OpenAI (Payant)",
        "free": False,
        "default_model": "gpt-4o",
        "api_key_env": "OPENAI_API_KEY",
        "get_key": "https://platform.openai.com/api-keys",
        "supports_vision": True
    },
    "anthropic": {
        "name": "Anthropic Claude (Payant)",
        "free": False,
        "default_model": "claude-3-5-sonnet-20241022",
        "api_key_env": "ANTHROPIC_API_KEY",
        "get_key": "https://console.anthropic.com/settings/keys",
        "supports_vision": True
    }
}


# ========================================
# Classe principale
# ========================================

class DemandeDevisExtractor:
    """Extracteur de demandes de devis avec support multi-LLM"""

    def __init__(self, provider: str = "ollama", model: Optional[str] = None,
                 prompt_path: Path = PROMPT_PATH):
        if not LANGCHAIN_AVAILABLE:
            raise RuntimeError("LangChain non disponible. Installez avec: pip install langchain langchain-core")

        self.provider = provider.lower()
        if self.provider not in PROVIDERS_CONFIG:
            raise ValueError(f"Provider '{self.provider}' non supporté. Utilisez: {', '.join(PROVIDERS_CONFIG.keys())}")

        self.provider_info = PROVIDERS_CONFIG[self.provider]
        self.model_name = model or self.provider_info["default_model"]
        self.prompt_path = prompt_path
        self.prompt_config = self._load_prompt_config()
        self.llm = self._init_llm()
        self.parser = JsonOutputParser(pydantic_object=DemandeDevisData)

    def _load_prompt_config(self) -> Dict:
        """Charge la configuration du prompt depuis le fichier YAML"""
        if not self.prompt_path.exists():
            raise FileNotFoundError(f"Fichier de prompt non trouvé: {self.prompt_path}")

        with open(self.prompt_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        print(f"✅ Prompt chargé: {config.get('name', 'N/A')} (v{config.get('version', 'N/A')})")
        return config

    def _init_llm(self):
        """Initialise le LLM selon le provider"""
        print(f"🤖 Initialisation de {self.provider_info['name']} avec modèle {self.model_name}...")

        if self.provider == "ollama":
            try:
                from langchain_community.llms import Ollama
                return Ollama(
                    model=self.model_name,
                    temperature=self.prompt_config.get('model_config', {}).get('temperature', 0.1)
                )
            except ImportError:
                raise RuntimeError("Ollama non disponible. Installez avec: pip install langchain-community")

        elif self.provider == "groq":
            try:
                from langchain_groq import ChatGroq
                api_key = os.environ.get("GROQ_API_KEY")
                if not api_key:
                    raise ValueError(f"GROQ_API_KEY non défini. Obtenez-en une sur {self.provider_info['get_key']}")
                return ChatGroq(
                    model_name=self.model_name,
                    temperature=self.prompt_config.get('model_config', {}).get('temperature', 0.1),
                    groq_api_key=api_key
                )
            except ImportError:
                raise RuntimeError("Groq non disponible. Installez avec: pip install langchain-groq")

        elif self.provider == "huggingface":
            try:
                from langchain_community.llms import HuggingFaceHub
                api_key = os.environ.get("HUGGINGFACE_API_KEY")
                if not api_key:
                    raise ValueError(f"HUGGINGFACE_API_KEY non défini. Obtenez-en une sur {self.provider_info['get_key']}")
                return HuggingFaceHub(
                    repo_id=self.model_name,
                    huggingfacehub_api_token=api_key,
                    model_kwargs={
                        "temperature": self.prompt_config.get('model_config', {}).get('temperature', 0.1),
                        "max_new_tokens": self.prompt_config.get('model_config', {}).get('max_tokens', 2000)
                    }
                )
            except ImportError:
                raise RuntimeError("Hugging Face non disponible. Installez avec: pip install langchain-community huggingface_hub")

        elif self.provider == "openai":
            try:
                from langchain_openai import ChatOpenAI
                api_key = os.environ.get("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError(f"OPENAI_API_KEY non défini. Obtenez-en une sur {self.provider_info['get_key']}")
                return ChatOpenAI(
                    model=self.model_name,
                    temperature=self.prompt_config.get('model_config', {}).get('temperature', 0.1),
                    openai_api_key=api_key
                )
            except ImportError:
                raise RuntimeError("OpenAI non disponible. Installez avec: pip install langchain-openai")

        elif self.provider == "anthropic":
            try:
                from langchain_anthropic import ChatAnthropic
                api_key = os.environ.get("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError(f"ANTHROPIC_API_KEY non défini. Obtenez-en une sur {self.provider_info['get_key']}")
                return ChatAnthropic(
                    model_name=self.model_name,
                    temperature=self.prompt_config.get('model_config', {}).get('temperature', 0.1),
                    anthropic_api_key=api_key,
                    max_tokens=self.prompt_config.get('model_config', {}).get('max_tokens', 2000)
                )
            except ImportError:
                raise RuntimeError("Anthropic non disponible. Installez avec: pip install langchain-anthropic")

        else:
            raise ValueError(f"Provider '{self.provider}' non implémenté")

    def _build_prompt_template(self) -> ChatPromptTemplate:
        """Construit le prompt template depuis la configuration YAML"""
        system_prompt = self.prompt_config.get('system_prompt', '')
        user_prompt_template = self.prompt_config.get('user_prompt_template', '{ocr_text}')

        # Ajouter les instructions de format
        system_prompt += "\n\n{format_instructions}"

        # Ajouter des exemples few-shot si disponibles
        examples = self.prompt_config.get('examples', [])
        if examples:
            system_prompt += "\n\n## EXEMPLES\n"
            for i, example in enumerate(examples[:2], 1):  # Limiter à 2 exemples
                system_prompt += f"\n### Exemple {i}\n"
                system_prompt += f"**Input:**\n{example['input']}\n\n"
                system_prompt += f"**Output:**\n{example['output']}\n"

        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", user_prompt_template)
        ])

    def extract_with_llm(self, ocr_text: str) -> Dict:
        """Extrait les données avec LangChain + LLM"""
        print(f"🤖 Extraction avec {self.provider}/{self.model_name}...")

        try:
            # Construire la chaîne LangChain
            prompt = self._build_prompt_template()
            chain = prompt | self.llm | self.parser

            # Exécuter
            result = chain.invoke({
                "ocr_text": ocr_text,
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
            raise RuntimeError("Tesseract non disponible. Installez avec: pip install pytesseract pillow")

        print(f"📷 Lecture de l'image: {image_path}")
        image = Image.open(image_path)

        print("🔍 Extraction OCR avec Tesseract...")
        ocr_text = pytesseract.image_to_string(image, lang='fra')

        print(f"📄 Texte OCR extrait ({len(ocr_text)} caractères)")
        if len(ocr_text) < 50:
            print("⚠️  Attention: Texte OCR très court, vérifiez que Tesseract est correctement configuré")

        return self.extract_with_llm(ocr_text)

    def extract_from_text(self, text: str) -> Dict:
        """Extrait depuis un texte déjà extrait"""
        return self.extract_with_llm(text)

    @classmethod
    def list_providers(cls):
        """Affiche la liste des providers disponibles"""
        print("\n" + "="*80)
        print("📋 PROVIDERS LLM DISPONIBLES")
        print("="*80)

        for key, info in PROVIDERS_CONFIG.items():
            free_badge = "🆓 GRATUIT" if info["free"] else "💰 PAYANT"
            vision_badge = "👁️  Vision" if info.get("supports_vision", False) else ""

            print(f"\n  {key.upper()}")
            print(f"    Nom:            {info['name']}")
            print(f"    Prix:           {free_badge}")
            print(f"    Modèle défaut:  {info['default_model']}")
            if vision_badge:
                print(f"    Capacités:      {vision_badge}")
            if "api_key_env" in info:
                print(f"    Variable env:   {info['api_key_env']}")
                print(f"    Obtenir clé:    {info['get_key']}")
            if "install" in info:
                print(f"    Installation:   {info['install']}")

        print("\n" + "="*80)


def main():
    parser = argparse.ArgumentParser(
        description="Extraction de demandes de devis avec support multi-LLM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:

  # Ollama (local, gratuit) - Recommandé pour débuter
  python extract_demande_devis.py -i devis.jpg --provider ollama --model llama3.2

  # Groq (API gratuite, rapide)
  export GROQ_API_KEY="votre-clé"
  python extract_demande_devis.py -i devis.jpg --provider groq

  # Anthropic Claude (payant, très performant)
  export ANTHROPIC_API_KEY="votre-clé"
  python extract_demande_devis.py -i devis.jpg --provider anthropic

  # OpenAI GPT-4 (payant)
  export OPENAI_API_KEY="votre-clé"
  python extract_demande_devis.py -i devis.jpg --provider openai --model gpt-4o

  # Traitement par lot
  python extract_demande_devis.py -b ./dossier_devis/ --provider groq -o results.json

  # Liste des providers
  python extract_demande_devis.py --list-providers
        """
    )

    parser.add_argument("--image", "-i", type=Path, help="Chemin vers une image de devis")
    parser.add_argument("--text", "-t", type=str, help="Texte OCR déjà extrait")
    parser.add_argument("--batch", "-b", type=Path, help="Dossier contenant plusieurs images")
    parser.add_argument("--provider", "-p", default="ollama",
                       choices=list(PROVIDERS_CONFIG.keys()),
                       help="Provider LLM à utiliser (défaut: ollama)")
    parser.add_argument("--model", "-m", help="Modèle LLM spécifique à utiliser")
    parser.add_argument("--output", "-o", type=Path, help="Fichier de sortie JSON")
    parser.add_argument("--prompt", type=Path, help="Fichier de prompt YAML personnalisé")
    parser.add_argument("--list-providers", action="store_true", help="Lister les providers disponibles")
    parser.add_argument("--verbose", "-v", action="store_true", help="Mode verbeux")

    args = parser.parse_args()

    # Liste des providers
    if args.list_providers:
        DemandeDevisExtractor.list_providers()
        return 0

    # Validation des arguments
    if not any([args.text, args.image, args.batch]):
        parser.print_help()
        print("\n❌ Erreur: Vous devez spécifier --image, --text ou --batch")
        return 1

    # Initialiser l'extracteur
    try:
        prompt_path = args.prompt or PROMPT_PATH
        extractor = DemandeDevisExtractor(
            provider=args.provider,
            model=args.model,
            prompt_path=prompt_path
        )
    except Exception as e:
        print(f"❌ Erreur d'initialisation: {e}")
        return 1

    # Traitement
    results = []

    try:
        if args.text:
            # Mode texte direct
            result = extractor.extract_from_text(args.text)
            results.append({"source": "text", "extracted": result})

        elif args.image:
            # Mode image unique
            result = extractor.extract_from_image(args.image)
            results.append({"source": str(args.image), "extracted": result})

        elif args.batch:
            # Mode batch
            if not args.batch.is_dir():
                print(f"❌ {args.batch} n'est pas un dossier")
                return 1

            images = list(args.batch.glob("*.jpg")) + \
                    list(args.batch.glob("*.jpeg")) + \
                    list(args.batch.glob("*.png"))

            print(f"\n📁 {len(images)} images trouvées dans {args.batch}\n")

            for i, img_path in enumerate(images, 1):
                print(f"\n{'='*80}")
                print(f"[{i}/{len(images)}] {img_path.name}")
                print(f"{'='*80}")
                try:
                    result = extractor.extract_from_image(img_path)
                    results.append({"source": str(img_path), "extracted": result})
                except Exception as e:
                    print(f"❌ Erreur: {e}")
                    results.append({"source": str(img_path), "error": str(e)})

        # Afficher résultats
        print("\n" + "="*80)
        print("📊 RÉSULTATS D'EXTRACTION")
        print("="*80)

        for result in results:
            if "error" in result:
                print(f"\n❌ {result['source']}: ERREUR")
                print(f"   {result['error']}")
            else:
                print(f"\n✅ {result['source']}: SUCCÈS")
                if args.verbose:
                    print(json.dumps(result['extracted'], ensure_ascii=False, indent=2))

        print("\n" + "="*80)
        print(f"📈 Résumé: {len([r for r in results if 'error' not in r])}/{len(results)} réussis")
        print("="*80)

        # Sauvegarder si demandé
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Résultats sauvegardés dans {args.output}")

        return 0

    except Exception as e:
        print(f"\n❌ Erreur fatale: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

