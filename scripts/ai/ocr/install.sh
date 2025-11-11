#!/bin/bash
# Script d'installation pour l'extraction de demandes de devis
# Usage: ./install.sh [option]
# Options:
#   ollama    - Installation avec Ollama (local, gratuit)
#   groq      - Installation avec Groq (API gratuite)
#   anthropic - Installation avec Anthropic Claude
#   openai    - Installation avec OpenAI
#   all       - Installation de tous les providers

set -e  # Arrêter en cas d'erreur

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Installation - Extraction Demandes de Devis${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Déterminer l'option
INSTALL_TYPE="${1:-ollama}"

# 1. Vérifier Python
echo -e "${YELLOW}🐍 Vérification de Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 n'est pas installé${NC}"
    echo "   Installez Python 3.8+ depuis https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d ' ' -f 2)
echo -e "${GREEN}✅ Python $PYTHON_VERSION trouvé${NC}\n"

# 2. Créer un environnement virtuel (optionnel mais recommandé)
echo -e "${YELLOW}📦 Configuration de l'environnement...${NC}"
if [ ! -d "venv" ]; then
    echo "   Création d'un environnement virtuel..."
    python3 -m venv venv
    echo -e "${GREEN}✅ Environnement virtuel créé${NC}"
else
    echo -e "${GREEN}✅ Environnement virtuel existant${NC}"
fi

# Activer l'environnement virtuel
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✅ Environnement virtuel activé${NC}\n"
fi

# 3. Installer les dépendances de base
echo -e "${YELLOW}📥 Installation des dépendances de base...${NC}"
pip install -q --upgrade pip
pip install -q langchain langchain-core langchain-community pydantic pytesseract pillow pyyaml
echo -e "${GREEN}✅ Dépendances de base installées${NC}\n"

# 4. Installer le provider LLM selon l'option
case $INSTALL_TYPE in
    ollama)
        echo -e "${YELLOW}🤖 Installation pour Ollama (local)...${NC}"
        
        # Vérifier si Ollama est installé
        if ! command -v ollama &> /dev/null; then
            echo -e "${YELLOW}⚠️  Ollama n'est pas installé${NC}"
            echo "   Installation d'Ollama..."
            
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                curl -fsSL https://ollama.ai/install.sh | sh
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                echo "   Sur macOS, installez avec: brew install ollama"
                echo "   Ou téléchargez depuis: https://ollama.ai/download"
            else
                echo "   Téléchargez Ollama depuis: https://ollama.ai/download"
            fi
        else
            echo -e "${GREEN}✅ Ollama déjà installé${NC}"
        fi
        
        # Télécharger un modèle
        if command -v ollama &> /dev/null; then
            echo "   Téléchargement du modèle llama3.2..."
            ollama pull llama3.2
            echo -e "${GREEN}✅ Modèle llama3.2 installé${NC}"
        fi
        ;;
        
    groq)
        echo -e "${YELLOW}🚀 Installation pour Groq (API gratuite)...${NC}"
        pip install -q langchain-groq
        echo -e "${GREEN}✅ Package Groq installé${NC}"
        echo -e "${YELLOW}📝 N'oubliez pas de configurer votre clé API:${NC}"
        echo "   1. Créez un compte sur: https://console.groq.com"
        echo "   2. Générez une clé API"
        echo "   3. Exportez-la: export GROQ_API_KEY='votre-clé'"
        ;;
        
    anthropic)
        echo -e "${YELLOW}🧠 Installation pour Anthropic Claude...${NC}"
        pip install -q langchain-anthropic
        echo -e "${GREEN}✅ Package Anthropic installé${NC}"
        echo -e "${YELLOW}📝 N'oubliez pas de configurer votre clé API:${NC}"
        echo "   1. Créez un compte sur: https://console.anthropic.com"
        echo "   2. Générez une clé API sur: https://console.anthropic.com/settings/keys"
        echo "   3. Exportez-la: export ANTHROPIC_API_KEY='votre-clé'"
        ;;
        
    openai)
        echo -e "${YELLOW}🤖 Installation pour OpenAI...${NC}"
        pip install -q langchain-openai
        echo -e "${GREEN}✅ Package OpenAI installé${NC}"
        echo -e "${YELLOW}📝 N'oubliez pas de configurer votre clé API:${NC}"
        echo "   1. Créez un compte sur: https://platform.openai.com"
        echo "   2. Générez une clé API sur: https://platform.openai.com/api-keys"
        echo "   3. Exportez-la: export OPENAI_API_KEY='votre-clé'"
        ;;
        
    all)
        echo -e "${YELLOW}🌟 Installation de tous les providers...${NC}"
        pip install -q langchain-groq langchain-anthropic langchain-openai huggingface-hub
        echo -e "${GREEN}✅ Tous les packages installés${NC}"
        echo -e "${YELLOW}📝 Pour Ollama, exécutez: ./install.sh ollama${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Option invalide: $INSTALL_TYPE${NC}"
        echo "   Options valides: ollama, groq, anthropic, openai, all"
        exit 1
        ;;
esac

echo ""

# 5. Vérifier Tesseract OCR
echo -e "${YELLOW}🔍 Vérification de Tesseract OCR...${NC}"
if ! command -v tesseract &> /dev/null; then
    echo -e "${YELLOW}⚠️  Tesseract n'est pas installé${NC}"
    echo "   Installation de Tesseract..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-fra
        elif command -v yum &> /dev/null; then
            sudo yum install -y tesseract tesseract-langpack-fra
        else
            echo -e "${RED}❌ Impossible d'installer automatiquement Tesseract${NC}"
            echo "   Installez-le manuellement depuis: https://github.com/tesseract-ocr/tesseract"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install tesseract tesseract-lang
        else
            echo "   Installez Homebrew puis exécutez: brew install tesseract tesseract-lang"
        fi
    else
        echo "   Téléchargez Tesseract depuis: https://github.com/UB-Mannheim/tesseract/wiki"
    fi
else
    TESSERACT_VERSION=$(tesseract --version 2>&1 | head -n 1)
    echo -e "${GREEN}✅ $TESSERACT_VERSION${NC}"
fi

echo ""

# 6. Exécuter les tests
echo -e "${YELLOW}🧪 Exécution des tests...${NC}"
if python3 test_extraction.py; then
    echo -e "${GREEN}✅ Tests réussis !${NC}"
else
    echo -e "${YELLOW}⚠️  Certains tests ont échoué (peut-être normal si aucun provider configuré)${NC}"
fi

echo ""

# 7. Résumé
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Installation terminée !${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}📋 Prochaines étapes:${NC}\n"

case $INSTALL_TYPE in
    ollama)
        echo "1. Tester l'extraction:"
        echo "   python extract_demande_devis.py -i exemple.jpg --provider ollama"
        ;;
    groq|anthropic|openai)
        echo "1. Configurer votre clé API (voir ci-dessus)"
        echo "2. Tester l'extraction:"
        echo "   python extract_demande_devis.py -i exemple.jpg --provider $INSTALL_TYPE"
        ;;
    all)
        echo "1. Configurer les clés API pour les providers que vous voulez utiliser"
        echo "2. Tester l'extraction:"
        echo "   python extract_demande_devis.py -i exemple.jpg --provider groq"
        ;;
esac

echo ""
echo "📖 Documentation complète: README_DEMANDE_DEVIS.md"
echo "🚀 Guide rapide: QUICKSTART_DEMANDE_DEVIS.md"
echo "🎨 Exemples: python example_usage.py"
echo ""

echo -e "${BLUE}Pour activer l'environnement virtuel dans le futur:${NC}"
echo "   source venv/bin/activate"
echo ""

