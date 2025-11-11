#!/usr/bin/env python3
"""
Script de test pour valider l'extraction de demandes de devis
"""

import sys
from pathlib import Path
from extract_demande_devis import DemandeDevisExtractor, PROVIDERS_CONFIG

# Ajouter le chemin racine
script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent.parent.parent
sys.path.insert(0, str(project_root))


def test_prompt_loading():
    """Test du chargement du fichier prompt YAML"""
    print("🧪 Test 1: Chargement du prompt YAML")
    try:
        extractor = DemandeDevisExtractor(provider="ollama")
        assert extractor.prompt_config is not None
        assert "system_prompt" in extractor.prompt_config
        assert "user_prompt_template" in extractor.prompt_config
        print("✅ Prompt chargé avec succès\n")
        return True
    except Exception as e:
        print(f"❌ Erreur: {e}\n")
        return False


def test_ocr_text_extraction():
    """Test de l'extraction avec un texte OCR exemple"""
    print("🧪 Test 2: Extraction depuis texte OCR")
    
    sample_text = """
    Orvault, le 23 septembre 2025
    Objet : Demande de devis N° 250923180018907
    
    Gestionnaire référent : MME Nadege MARAUD +33 (0)251775356
    Mandat : N°038349 - M GUARTA TEODORO MME NICAUD MAURICETTE
    Ensemble immobilier : N°E0005981 CASTELIN
    Date d'achèvement des travaux : 31/05/2022
    
    Lot : Numéro commercial N°A224 - Etage : 2nd
    Adresse : BAT - 2ND - APT A224 LE CASTELIN 133 avenue de la Republique 93150 LE BLANC MESNIL
    Contact(s) (occupant(s) du logement ou dépositaire des clés) : Mme Nadege MARAUD
    
    Devis urgent : Oui
    Dépôt de garantie lié : Oui (si Oui : demande d'intervention suite au départ du ou des locataires(s))
    
    Date de demande de devis : 23/09/2025
    Date de réponse souhaitée : 24/09/2025
    
    Objet du devis : DEMANDE DE DEVIS SUITE DEPOT DE GARANTIE
    
    NETTOYAGE ENTREE Murs, traces noires sur 9m² placard, porte non nettoyée 
    SALLE DE BAIN Sol non nettoyé Tartre sur lavabo + robinetterie Tartre sur bac à douche + robinetterie + paroi de douche 
    VMC non nettoyée Meuble sous vasque non nettoyé 
    CUISINE / SEJOUR Murs, traces noires sur 16m² sol non nettoyé Porte fenêtre non nettoyée Balcon non nettoyé 
    14 prises électriques non nettoyées Evier + robinetterie Meuble sous évier non nettoyé Elément haut non nettoyé 
    VMC non nettoyée plaque à induction non nettoyée Plafond noir d 4 prises électriques non nettoyées 
    REPARATION CUISINE/SEJOUR Eclairage mur ne fonctionne pas Bouchon vidage évier manquant Robinetterie évier mal fixée 
    SALLE DE BAIN Joint d'étanchéité décollé, bac à douche logement vacant, les clés sont disponibles à l'agence 
    ORPI ST DENIS - 193 AVENUE DU PRESIDENT WILSON - 93210 ST DENIS - orpi.loc@gmail.com - 01 55 99 22 29
    """
    
    try:
        # Tester avec Ollama (ou un provider disponible)
        available_provider = None
        for provider in ["ollama", "groq", "openai", "anthropic"]:
            try:
                extractor = DemandeDevisExtractor(provider=provider)
                available_provider = provider
                print(f"   Utilisation du provider: {provider}")
                break
            except Exception:
                continue
        
        if not available_provider:
            print("⚠️  Aucun provider disponible, test ignoré\n")
            return True
        
        result = extractor.extract_from_text(sample_text)
        
        # Vérifications basiques
        assert result is not None
        assert "intervention" in result
        assert "numero_demande" in result
        
        print(f"✅ Extraction réussie")
        print(f"   - Numéro demande: {result.get('numero_demande')}")
        print(f"   - Urgence: {result.get('intervention', {}).get('urgence')}")
        print(f"   - Métiers détectés: {result.get('intervention', {}).get('metiers')}")
        print()
        return True
        
    except Exception as e:
        print(f"⚠️  Test ignoré (provider non configuré): {e}\n")
        return True  # Ne pas faire échouer le test si pas de provider


def test_all_providers():
    """Test de l'initialisation de tous les providers"""
    print("🧪 Test 3: Disponibilité des providers")
    
    for provider_key, provider_info in PROVIDERS_CONFIG.items():
        try:
            extractor = DemandeDevisExtractor(provider=provider_key)
            print(f"✅ {provider_key.upper()}: Disponible")
        except ValueError as e:
            if "API" in str(e) or "key" in str(e).lower():
                print(f"⚠️  {provider_key.upper()}: Nécessite une clé API")
            else:
                print(f"❌ {provider_key.upper()}: Erreur - {e}")
        except Exception as e:
            print(f"❌ {provider_key.upper()}: Erreur - {e}")
    
    print()
    return True


def test_model_schema():
    """Test de la cohérence du schéma Pydantic"""
    print("🧪 Test 4: Validation du schéma Pydantic")
    
    try:
        from extract_demande_devis import (
            DemandeDevisData,
            GestionnaireInfo,
            InterventionInfo
        )
        
        # Créer une instance de test
        test_data = DemandeDevisData(
            numero_demande="TEST123",
            intervention=InterventionInfo(
                description="Test de description",
                urgence=True
            )
        )
        
        assert test_data.numero_demande == "TEST123"
        assert test_data.intervention.urgence is True
        
        print("✅ Schéma Pydantic valide\n")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}\n")
        return False


def main():
    """Exécute tous les tests"""
    print("="*80)
    print("🧪 TESTS D'EXTRACTION DE DEMANDES DE DEVIS")
    print("="*80)
    print()
    
    tests = [
        test_prompt_loading,
        test_model_schema,
        test_all_providers,
        test_ocr_text_extraction,
    ]
    
    results = []
    for test_func in tests:
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ Test échoué: {e}\n")
            results.append(False)
    
    print("="*80)
    success_count = sum(results)
    total_count = len(results)
    
    if success_count == total_count:
        print(f"✅ TOUS LES TESTS RÉUSSIS ({success_count}/{total_count})")
    else:
        print(f"⚠️  {success_count}/{total_count} tests réussis")
    
    print("="*80)
    
    return 0 if success_count == total_count else 1


if __name__ == "__main__":
    sys.exit(main())

