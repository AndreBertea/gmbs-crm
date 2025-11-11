#!/usr/bin/env python3
"""
Exemples d'utilisation du script d'extraction de demandes de devis
"""

import os
import sys
from pathlib import Path
import json

# Ajouter le chemin du projet
script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent.parent.parent
sys.path.insert(0, str(project_root))

from extract_demande_devis import DemandeDevisExtractor


def example_1_basic_extraction():
    """Exemple 1: Extraction basique avec Ollama"""
    print("=" * 80)
    print("EXEMPLE 1: Extraction basique avec Ollama")
    print("=" * 80)
    
    try:
        # Initialiser l'extracteur
        extractor = DemandeDevisExtractor(provider="ollama", model="llama3.2")
        
        # Texte OCR exemple
        sample_text = """
        Objet : Demande de devis N° 250923180018907
        Gestionnaire référent : MME Nadege MARAUD +33 (0)251775356
        Date de demande de devis : 23/09/2025
        Devis urgent : Oui
        Description: NETTOYAGE ENTREE et SALLE DE BAIN
        """
        
        # Extraire
        result = extractor.extract_from_text(sample_text)
        
        print("\n✅ Résultat:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        print("   Assurez-vous qu'Ollama est installé et qu'un modèle est disponible")


def example_2_groq_with_image():
    """Exemple 2: Extraction depuis une image avec Groq"""
    print("\n" + "=" * 80)
    print("EXEMPLE 2: Extraction depuis une image avec Groq")
    print("=" * 80)
    
    # Vérifier la clé API
    if not os.environ.get("GROQ_API_KEY"):
        print("\n⚠️  GROQ_API_KEY non définie")
        print("   Obtenez une clé gratuite sur: https://console.groq.com")
        print("   Puis: export GROQ_API_KEY='votre-clé'")
        return
    
    try:
        # Initialiser
        extractor = DemandeDevisExtractor(
            provider="groq",
            model="llama-3.3-70b-versatile"
        )
        
        # Chemin vers l'image exemple
        image_path = project_root / "data" / "samples" / "intervention_docs" / \
                     "demande_devis" / "demande_de_devis_travaux_multiples_2.jpeg"
        
        if not image_path.exists():
            print(f"\n⚠️  Image non trouvée: {image_path}")
            return
        
        # Extraire
        print(f"\n📷 Extraction depuis: {image_path.name}")
        result = extractor.extract_from_image(image_path)
        
        # Afficher résumé
        print("\n✅ Résultat:")
        print(f"   - Numéro demande: {result.get('numero_demande')}")
        print(f"   - Date demande: {result.get('date_demande')}")
        print(f"   - Urgence: {result.get('intervention', {}).get('urgence')}")
        print(f"   - Métiers: {', '.join(result.get('intervention', {}).get('metiers', []))}")
        print(f"   - Ville: {result.get('bien', {}).get('ville')}")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")


def example_3_anthropic_claude():
    """Exemple 3: Extraction haute qualité avec Anthropic Claude"""
    print("\n" + "=" * 80)
    print("EXEMPLE 3: Extraction avec Anthropic Claude")
    print("=" * 80)
    
    # Vérifier la clé API
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("\n⚠️  ANTHROPIC_API_KEY non définie")
        print("   Obtenez une clé sur: https://console.anthropic.com/settings/keys")
        print("   Puis: export ANTHROPIC_API_KEY='votre-clé'")
        return
    
    try:
        # Initialiser
        extractor = DemandeDevisExtractor(
            provider="anthropic",
            model="claude-3-5-sonnet-20241022"
        )
        
        # Texte OCR complexe
        complex_text = """
        Orvault, le 23 septembre 2025
        Objet : Demande de devis N° 250923180018907
        
        Gestionnaire référent : MME Nadege MARAUD +33 (0)251775356
        Mandat : N°038349 - M GUARTA TEODORO MME NICAUD MAURICETTE
        Ensemble immobilier : N°E0005981 CASTELIN
        Date d'achèvement des travaux : 31/05/2022
        
        Lot : Numéro commercial N°A224 - Etage : 2nd
        Adresse : BAT - 2ND - APT A224 LE CASTELIN 133 avenue de la Republique 93150 LE BLANC MESNIL
        
        Devis urgent : Oui
        Date de demande de devis : 23/09/2025
        Date de réponse souhaitée : 24/09/2025
        
        Objet du devis : DEMANDE DE DEVIS SUITE DEPOT DE GARANTIE
        
        NETTOYAGE ENTREE Murs, traces noires sur 9m² placard, porte non nettoyée 
        SALLE DE BAIN Sol non nettoyé Tartre sur lavabo + robinetterie
        CUISINE 14 prises électriques non nettoyées
        REPARATION Eclairage mur ne fonctionne pas Bouchon vidage évier manquant
        
        logement vacant, les clés sont disponibles à l'agence ORPI ST DENIS
        """
        
        # Extraire
        result = extractor.extract_from_text(complex_text)
        
        print("\n✅ Résultat détaillé:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")


def example_4_batch_processing():
    """Exemple 4: Traitement par lot"""
    print("\n" + "=" * 80)
    print("EXEMPLE 4: Traitement par lot de plusieurs images")
    print("=" * 80)
    
    try:
        # Initialiser (utiliser Groq ou Ollama selon disponibilité)
        provider = "groq" if os.environ.get("GROQ_API_KEY") else "ollama"
        extractor = DemandeDevisExtractor(provider=provider)
        
        # Dossier contenant les images
        images_dir = project_root / "data" / "samples" / "intervention_docs" / "demande_devis"
        
        if not images_dir.exists():
            print(f"\n⚠️  Dossier non trouvé: {images_dir}")
            return
        
        # Trouver toutes les images
        images = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.jpeg"))
        
        if not images:
            print(f"\n⚠️  Aucune image trouvée dans {images_dir}")
            return
        
        print(f"\n📁 {len(images)} images trouvées")
        
        results = []
        for i, img_path in enumerate(images[:3], 1):  # Limiter à 3 pour l'exemple
            print(f"\n[{i}/{min(3, len(images))}] Traitement de {img_path.name}...")
            
            try:
                result = extractor.extract_from_image(img_path)
                results.append({
                    "file": img_path.name,
                    "status": "success",
                    "numero_demande": result.get("numero_demande"),
                    "urgence": result.get("intervention", {}).get("urgence")
                })
                print(f"   ✅ Succès - Numéro: {result.get('numero_demande')}")
            except Exception as e:
                results.append({
                    "file": img_path.name,
                    "status": "error",
                    "error": str(e)
                })
                print(f"   ❌ Erreur: {e}")
        
        # Résumé
        print("\n📊 Résumé:")
        success = len([r for r in results if r["status"] == "success"])
        print(f"   - Réussis: {success}/{len(results)}")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")


def example_5_custom_prompt():
    """Exemple 5: Utilisation d'un prompt personnalisé"""
    print("\n" + "=" * 80)
    print("EXEMPLE 5: Utilisation d'un prompt personnalisé")
    print("=" * 80)
    
    print("\n💡 Pour utiliser un prompt personnalisé:")
    print("   1. Copiez le fichier: prompts/prompt_demande_de_devis.yaml")
    print("   2. Modifiez-le selon vos besoins")
    print("   3. Utilisez-le avec le paramètre --prompt")
    print("\n   Exemple:")
    print("   python extract_demande_devis.py \\")
    print("     -i devis.jpg \\")
    print("     --provider groq \\")
    print("     --prompt ./mon_prompt_custom.yaml")


def main():
    """Menu principal"""
    print("\n" + "=" * 80)
    print("🚀 EXEMPLES D'UTILISATION - EXTRACTION DE DEMANDES DE DEVIS")
    print("=" * 80)
    
    print("\nChoisissez un exemple:")
    print("  1. Extraction basique avec Ollama (local)")
    print("  2. Extraction depuis image avec Groq (API gratuite)")
    print("  3. Extraction avec Anthropic Claude (haute qualité)")
    print("  4. Traitement par lot")
    print("  5. Info sur les prompts personnalisés")
    print("  6. Exécuter tous les exemples")
    print("  0. Quitter")
    
    choice = input("\nVotre choix (0-6): ").strip()
    
    examples = {
        "1": example_1_basic_extraction,
        "2": example_2_groq_with_image,
        "3": example_3_anthropic_claude,
        "4": example_4_batch_processing,
        "5": example_5_custom_prompt,
    }
    
    if choice == "6":
        for func in examples.values():
            func()
    elif choice in examples:
        examples[choice]()
    elif choice == "0":
        print("\n👋 Au revoir!")
        return
    else:
        print("\n❌ Choix invalide")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted par l'utilisateur")
        sys.exit(0)

