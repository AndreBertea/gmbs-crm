"""
Système OCR intelligent pour extraction de devis/demandes d'intervention
Architecture en 3 couches avec validation et mapping automatique
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field, validator
import anthropic
import json


# ============================================================================
# MODÈLES DE DONNÉES
# ============================================================================

class MetierEnum(str, Enum):
    """Énumération des métiers disponibles"""
    AUTRES = "AUTRES"
    BRICOLAGE = "BRICOLAGE"
    CAMION = "CAMION"
    CHAUFFAGE = "CHAUFFAGE"
    CLIMATISATION = "CLIMATISATION"
    ELECTRICITE = "ELECTRICITE"
    JARDINAGE = "JARDINAGE"
    MENUISIER = "MENUISIER"
    MULTI_SERVICE = "MULTI-SERVICE"
    MENAGE = "MENAGE"
    NUISIBLE = "NUISIBLE"
    PEINTURE = "PEINTURE"
    PLOMBERIE = "PLOMBERIE"
    RDF = "RDF"
    RENOVATION = "RENOVATION"
    SERRURERIE = "SERRURERIE"
    VITRERIE = "VITRERIE"
    VOLET_STORE = "VOLET-STORE"


class AgenceEnum(str, Enum):
    """Énumération des agences"""
    OQORO = "OQORO"
    IMODIRECT = "IMODIRECT"
    FLATLOOKER = "FLATLOOKER"
    AFEDIM = "AFEDIM"
    HOMEPILOT = "HOMEPILOT"


class ConfidenceLevel(str, Enum):
    """Niveau de confiance de l'extraction"""
    HIGH = "high"      # > 90%
    MEDIUM = "medium"  # 70-90%
    LOW = "low"        # < 70%
    MANUAL = "manual"  # Nécessite validation manuelle


@dataclass
class ExtractedField:
    """Champ extrait avec métadonnées de confiance"""
    value: Any
    confidence: float  # 0-1
    source_text: Optional[str] = None  # Texte original extrait
    bbox: Optional[tuple] = None  # Coordonnées dans le document
    alternatives: List[Any] = field(default_factory=list)
    
    @property
    def confidence_level(self) -> ConfidenceLevel:
        if self.confidence >= 0.9:
            return ConfidenceLevel.HIGH
        elif self.confidence >= 0.7:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW


@dataclass
class EnumFieldMatch:
    """Résultat du matching d'un champ énuméré"""
    matched_value: Optional[str]  # Valeur de l'enum si match
    confidence: float
    original_text: str  # Texte extrait original
    suggestions: List[tuple[str, float]]  # [(enum_value, score)]
    requires_validation: bool
    
    def to_dict(self):
        return {
            "matched": self.matched_value,
            "confidence": self.confidence,
            "original": self.original_text,
            "suggestions": self.suggestions,
            "needs_review": self.requires_validation
        }


class ExtractedIntervention(BaseModel):
    """Données extraites d'une demande d'intervention"""
    
    # Identité client
    nom_client: ExtractedField
    prenom_client: ExtractedField
    
    # Adresse intervention
    adresse: ExtractedField
    code_postal: ExtractedField
    ville: ExtractedField
    lot: Optional[ExtractedField] = None
    etage: Optional[ExtractedField] = None
    
    # Contact
    telephone: Optional[ExtractedField] = None
    email: Optional[ExtractedField] = None
    
    # Devis
    numero_devis: Optional[ExtractedField] = None
    date_demande: ExtractedField
    date_reponse_souhaitee: Optional[ExtractedField] = None
    
    # Contenu
    objet_devis: ExtractedField
    message_principal: ExtractedField
    
    # Métiers (peut être multiple)
    metiers: List[EnumFieldMatch] = field(default_factory=list)
    
    # Agence (optionnel)
    agence: Optional[EnumFieldMatch] = None
    
    # Métadonnées
    extraction_date: datetime = field(default_factory=datetime.now)
    overall_confidence: float = 0.0
    
    class Config:
        arbitrary_types_allowed = True


# ============================================================================
# NIVEAU 1 : EXTRACTION OCR AVEC LLM MULTIMODAL
# ============================================================================

class MultimodalOCRExtractor:
    """
    Extraction via LLM multimodal (Claude Sonnet 4)
    Meilleure compréhension du contexte et de la structure
    """
    
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"
    
    def _build_extraction_prompt(self) -> str:
        """Construit le prompt d'extraction structuré"""
        return """
Tu es un système expert d'extraction de données de documents de demande d'intervention.

Analyse ce document et extrais TOUTES les informations suivantes au format JSON strict.

Pour chaque champ, fournis :
- "value" : la valeur extraite
- "confidence" : ton niveau de confiance (0.0 à 1.0)
- "source_text" : le texte exact trouvé dans le document
- "alternatives" : liste de valeurs alternatives possibles si incertain

CHAMPS À EXTRAIRE :

**Identité client**
- nom_client : nom de famille du client
- prenom_client : prénom du client

**Adresse intervention**
- adresse : adresse complète (numéro + rue)
- code_postal : code postal (5 chiffres)
- ville : ville
- lot : numéro de lot/appartement (si mentionné)
- etage : étage (si mentionné)

**Contact**
- telephone : numéro de téléphone (format français)
- email : adresse email (si présente)

**Informations devis**
- numero_devis : numéro de référence du devis
- date_demande : date de la demande (format ISO: YYYY-MM-DD)
- date_reponse_souhaitee : date de réponse souhaitée (format ISO)

**Contenu**
- objet_devis : titre/objet de la demande
- message_principal : description complète de l'intervention demandée

**Métiers concernés**
- metiers_detectes : liste des types d'intervention mentionnés
  Exemples possibles : plomberie, électricité, serrurerie, chauffage, 
  climatisation, menuiserie, peinture, vitrerie, volets/stores, 
  jardinage, ménage, nuisibles, rénovation, multi-services, bricolage, autres

**Agence** (si mentionnée)
- agence : nom de l'agence/société

RÈGLES IMPORTANTES :
1. Si un champ n'est pas présent, mets null pour value
2. Sois conservateur sur la confiance : 1.0 = absolument certain
3. Pour les dates, essaie de déduire même si format non standard
4. Pour les métiers, extrais TOUS les types d'intervention mentionnés
5. Préserve les accents et caractères spéciaux français

FORMAT DE RÉPONSE JSON :
{
  "nom_client": {"value": "...", "confidence": 0.95, "source_text": "..."},
  "prenom_client": {"value": "...", "confidence": 0.95, "source_text": "..."},
  ...
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.
"""
    
    async def extract_from_image(self, image_data: bytes, 
                                  media_type: str = "image/jpeg") -> Dict[str, Any]:
        """Extrait les données d'une image"""
        
        import base64
        image_b64 = base64.b64encode(image_data).decode('utf-8')
        
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64
                            }
                        },
                        {
                            "type": "text",
                            "text": self._build_extraction_prompt()
                        }
                    ]
                }
            ]
        )
        
        # Parse la réponse JSON
        response_text = message.content[0].text
        
        # Nettoie le JSON si wrapped dans des backticks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        return json.loads(response_text.strip())
    
    async def extract_from_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Extrait les données d'un PDF (converti en images)"""
        
        # Conversion PDF -> Images
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, dpi=200)
        
        # Pour l'instant, on traite la première page
        # TODO: gérer multi-pages et merger les résultats
        if not images:
            raise ValueError("PDF vide ou illisible")
        
        import io
        img_byte_arr = io.BytesIO()
        images[0].save(img_byte_arr, format='JPEG', quality=95)
        img_byte_arr = img_byte_arr.getvalue()
        
        return await self.extract_from_image(img_byte_arr)


# ============================================================================
# NIVEAU 2 : VALIDATION ET NORMALISATION
# ============================================================================

class DataValidator:
    """Valide et normalise les données extraites"""
    
    @staticmethod
    def validate_postal_code(code: str) -> tuple[bool, str]:
        """Valide et normalise un code postal français"""
        if not code:
            return False, code
        
        # Nettoie le code postal
        clean = ''.join(c for c in code if c.isdigit())
        
        if len(clean) == 5:
            return True, clean
        elif len(clean) == 4:  # Parfois sans le 0 initial
            return True, '0' + clean
        
        return False, code
    
    @staticmethod
    def validate_phone(phone: str) -> tuple[bool, str]:
        """Valide et normalise un numéro français"""
        import re
        
        if not phone:
            return False, phone
        
        # Patterns acceptés pour numéros français
        patterns = [
            # Format français standard : 06 12 34 56 78 ou 0612345678
            "(r'^0[1-9](?:[\s\.\-]?\d{2}){4}"
    
    @staticmethod
    def parse_date(date_str: str) -> tuple[bool, Optional[datetime]]:
        """Parse différents formats de dates françaises"""
        if not date_str:
            return False, None
        
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d/%m/%y",
            "%d-%m-%y",
            "%d %m %Y",
            "%d.%m.%Y"
        ]
        
        for fmt in formats:
            try:
                return True, datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return False, None
    
    def validate_extraction(self, raw_data: Dict[str, Any]) -> ExtractedIntervention:
        """Valide et structure les données brutes"""
        
        def make_field(field_data: Dict) -> ExtractedField:
            """Convertit un dict en ExtractedField"""
            return ExtractedField(
                value=field_data.get('value'),
                confidence=field_data.get('confidence', 0.5),
                source_text=field_data.get('source_text'),
                alternatives=field_data.get('alternatives', [])
            )
        
        # Validation des champs obligatoires
        validated = ExtractedIntervention(
            nom_client=make_field(raw_data['nom_client']),
            prenom_client=make_field(raw_data['prenom_client']),
            adresse=make_field(raw_data['adresse']),
            code_postal=make_field(raw_data['code_postal']),
            ville=make_field(raw_data['ville']),
            date_demande=make_field(raw_data['date_demande']),
            objet_devis=make_field(raw_data['objet_devis']),
            message_principal=make_field(raw_data['message_principal'])
        )
        
        # Validation code postal
        is_valid, normalized = self.validate_postal_code(
            validated.code_postal.value
        )
        if is_valid:
            validated.code_postal.value = normalized
        else:
            validated.code_postal.confidence *= 0.5
        
        # Validation téléphone
        if 'telephone' in raw_data and raw_data['telephone']['value']:
            validated.telephone = make_field(raw_data['telephone'])
            is_valid, normalized = self.validate_phone(
                validated.telephone.value
            )
            if is_valid:
                validated.telephone.value = normalized
            else:
                validated.telephone.confidence *= 0.5
        
        # Parse dates
        is_valid, parsed_date = self.parse_date(validated.date_demande.value)
        if is_valid:
            validated.date_demande.value = parsed_date
        else:
            validated.date_demande.confidence *= 0.3
        
        # Calcul confiance globale
        fields = [
            validated.nom_client,
            validated.prenom_client,
            validated.adresse,
            validated.code_postal,
            validated.ville,
            validated.date_demande
        ]
        validated.overall_confidence = sum(f.confidence for f in fields) / len(fields)
        
        return validated


# ============================================================================
# NIVEAU 3 : MAPPING INTELLIGENT AVEC BDD
# ============================================================================

class IntelligentMapper:
    """
    Mapping intelligent avec les énumérations de la BDD
    Système à 2 niveaux : matching exact + suggestions
    """
    
    def __init__(self):
        # Mappings pour améliorer la détection
        self.metier_keywords = {
            MetierEnum.PLOMBERIE: [
                'plomberie', 'plombier', 'fuite', 'eau', 'robinet', 
                'chasse d\'eau', 'wc', 'lavabo', 'évier', 'canalisation',
                'tuyau', 'sanitaire', 'salle de bain'
            ],
            MetierEnum.ELECTRICITE: [
                'électricité', 'électricien', 'panne', 'courant',
                'disjoncteur', 'tableau électrique', 'prise', 'interrupteur',
                'lumière', 'éclairage', 'installation électrique'
            ],
            MetierEnum.SERRURERIE: [
                'serrurerie', 'serrurier', 'porte', 'clé', 'serrure',
                'verrou', 'cylindre', 'ouverture de porte', 'claquée',
                'fermeture', 'sécurité'
            ],
            MetierEnum.CHAUFFAGE: [
                'chauffage', 'chaudière', 'radiateur', 'thermostat',
                'ballon d\'eau chaude', 'température', 'froid', 'chauffe'
            ],
            MetierEnum.CLIMATISATION: [
                'climatisation', 'clim', 'climatiseur', 'ventilation',
                'vmc', 'rafraîchissement', 'air conditionné'
            ],
            MetierEnum.MENUISIER: [
                'menuiserie', 'menuisier', 'bois', 'parquet',
                'porte en bois', 'placard', 'étagère', 'meuble'
            ],
            MetierEnum.PEINTURE: [
                'peinture', 'peintre', 'repeindre', 'ravalement',
                'mur', 'plafond', 'enduit', 'tapisserie'
            ],
            MetierEnum.VITRERIE: [
                'vitrerie', 'vitrier', 'vitre', 'fenêtre', 'double vitrage',
                'carreau', 'bris de glace', 'verre'
            ],
            MetierEnum.VOLET_STORE: [
                'volet', 'store', 'persienne', 'rideau métallique',
                'motorisation', 'manivelle'
            ],
            MetierEnum.JARDINAGE: [
                'jardinage', 'jardinier', 'jardin', 'espaces verts',
                'tonte', 'pelouse', 'haie', 'taille', 'élagage'
            ],
            MetierEnum.MENAGE: [
                'ménage', 'nettoyage', 'nettoyer', 'entretien',
                'propreté', 'fin de chantier'
            ],
            MetierEnum.NUISIBLE: [
                'nuisible', 'rat', 'souris', 'cafard', 'punaise',
                'insecte', 'dératisation', 'désinsectisation'
            ],
            MetierEnum.RENOVATION: [
                'rénovation', 'travaux', 'réfection', 'modernisation',
                'aménagement', 'transformation'
            ],
            MetierEnum.BRICOLAGE: [
                'bricolage', 'petit travaux', 'divers', 'fixation',
                'montage', 'installation'
            ]
        }
    
    def fuzzy_match_score(self, text1: str, text2: str) -> float:
        """Score de similarité entre deux chaînes"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def match_metier(self, extracted_text: str) -> EnumFieldMatch:
        """
        Matching intelligent d'un métier
        Retourne soit une valeur exacte, soit des suggestions
        """
        extracted_lower = extracted_text.lower()
        scores = []
        
        # Recherche par mots-clés
        for metier, keywords in self.metier_keywords.items():
            score = 0.0
            
            # Matching exact du nom
            if metier.value.lower() in extracted_lower:
                score = 1.0
            else:
                # Matching des mots-clés
                keyword_scores = [
                    1.0 if kw in extracted_lower else 
                    self.fuzzy_match_score(extracted_lower, kw)
                    for kw in keywords
                ]
                score = max(keyword_scores) if keyword_scores else 0.0
            
            if score > 0.3:  # Seuil minimum
                scores.append((metier.value, score))
        
        # Tri par score décroissant
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # Décision de matching
        if scores and scores[0][1] >= 0.85:
            # Match de haute confiance
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=False
            )
        elif scores and scores[0][1] >= 0.6:
            # Match moyen - proposer validation
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=True
            )
        else:
            # Pas de match clair - proposer suggestions
            return EnumFieldMatch(
                matched_value=None,
                confidence=0.0,
                original_text=extracted_text,
                suggestions=scores[:5],
                requires_validation=True
            )
    
    def match_multiple_metiers(self, descriptions: List[str]) -> List[EnumFieldMatch]:
        """Match plusieurs métiers depuis différentes descriptions"""
        all_matches = []
        seen_metiers = set()
        
        for desc in descriptions:
            match = self.match_metier(desc)
            
            # Évite les doublons
            if match.matched_value and match.matched_value not in seen_metiers:
                all_matches.append(match)
                seen_metiers.add(match.matched_value)
            elif not match.matched_value:
                # Garde les suggestions pour validation manuelle
                all_matches.append(match)
        
        return all_matches
    
    def enrich_intervention_data(self, 
                                  extracted: ExtractedIntervention) -> ExtractedIntervention:
        """
        Enrichit les données extraites avec le mapping intelligent
        """
        
        # Détecte les métiers depuis objet + message
        metier_sources = [
            extracted.objet_devis.value,
            extracted.message_principal.value
        ]
        
        extracted.metiers = self.match_multiple_metiers(metier_sources)
        
        return extracted


# ============================================================================
# ORCHESTRATEUR PRINCIPAL
# ============================================================================

class OCRPipeline:
    """Pipeline complet d'extraction et mapping"""
    
    def __init__(self, anthropic_api_key: str):
        self.extractor = MultimodalOCRExtractor(anthropic_api_key)
        self.validator = DataValidator()
        self.mapper = IntelligentMapper()
    
    async def process_document(self, 
                               file_path: str,
                               file_type: Literal['pdf', 'image']) -> ExtractedIntervention:
        """
        Process complet : extraction -> validation -> mapping
        """
        
        # Niveau 1 : Extraction OCR
        print("📄 Extraction des données...")
        if file_type == 'pdf':
            raw_data = await self.extractor.extract_from_pdf(file_path)
        else:
            with open(file_path, 'rb') as f:
                image_data = f.read()
            raw_data = await self.extractor.extract_from_image(image_data)
        
        # Niveau 2 : Validation
        print("✓ Validation et normalisation...")
        validated = self.validator.validate_extraction(raw_data)
        
        # Niveau 3 : Mapping
        print("🔗 Mapping avec base de données...")
        enriched = self.mapper.enrich_intervention_data(validated)
        
        print(f"✅ Extraction terminée - Confiance globale: {enriched.overall_confidence:.1%}")
        
        return enriched
    
    def generate_validation_report(self, 
                                   extracted: ExtractedIntervention) -> Dict[str, Any]:
        """
        Génère un rapport de validation pour l'utilisateur
        """
        
        fields_needing_review = []
        
        # Check confiance par champ
        all_fields = {
            'Nom client': extracted.nom_client,
            'Prénom client': extracted.prenom_client,
            'Adresse': extracted.adresse,
            'Code postal': extracted.code_postal,
            'Ville': extracted.ville,
            'Date demande': extracted.date_demande,
            'Objet': extracted.objet_devis
        }
        
        for name, field in all_fields.items():
            if field.confidence_level != ConfidenceLevel.HIGH:
                fields_needing_review.append({
                    'field': name,
                    'value': field.value,
                    'confidence': field.confidence,
                    'level': field.confidence_level.value
                })
        
        # Check métiers
        metiers_validated = []
        metiers_suggested = []
        
        for metier_match in extracted.metiers:
            if metier_match.requires_validation:
                metiers_suggested.append(metier_match.to_dict())
            else:
                metiers_validated.append(metier_match.to_dict())
        
        return {
            'overall_confidence': extracted.overall_confidence,
            'ready_for_auto_insert': extracted.overall_confidence >= 0.85,
            'fields_needing_review': fields_needing_review,
            'metiers_detected': metiers_validated,
            'metiers_suggested': metiers_suggested,
            'extraction_date': extracted.extraction_date.isoformat()
        }


# ============================================================================
# EXEMPLE D'UTILISATION
# ============================================================================

async def main():
    """Exemple d'utilisation du pipeline"""
    
    # Initialisation
    pipeline = OCRPipeline(anthropic_api_key="your-api-key")
    
    # Process un document
    result = await pipeline.process_document(
        file_path="demande_intervention.pdf",
        file_type="pdf"
    )
    
    # Génère le rapport de validation
    report = pipeline.generate_validation_report(result)
    
    print("\n" + "="*60)
    print("RAPPORT D'EXTRACTION")
    print("="*60)
    print(f"\nConfiance globale : {report['overall_confidence']:.1%}")
    print(f"Insertion auto possible : {'OUI' if report['ready_for_auto_insert'] else 'NON'}")
    
    if report['fields_needing_review']:
        print("\n⚠️  Champs nécessitant une revue :")
        for field in report['fields_needing_review']:
            print(f"  - {field['field']}: {field['value']} (confiance: {field['confidence']:.1%})")
    
    print("\n✅ Métiers détectés avec certitude :")
    for metier in report['metiers_detected']:
        print(f"  - {metier['matched']} (confiance: {metier['confidence']:.1%})")
    
    if report['metiers_suggested']:
        print("\n💡 Métiers suggérés (à valider) :")
        for metier in report['metiers_suggested']:
            print(f"  - Texte: '{metier['original']}'")
            print(f"    Suggestions: {', '.join([f'{s[0]} ({s[1]:.1%})' for s in metier['suggestions'][:3]])}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
, 
             lambda p: re.sub(r'[\s\.\-]', '', p)),
            
            # Format international avec + : +33 6 12 34 56 78
            "(r'^\+33\s*[1-9](?:[\s\.\-]?\d{2}){4}"
    
    @staticmethod
    def parse_date(date_str: str) -> tuple[bool, Optional[datetime]]:
        """Parse différents formats de dates françaises"""
        if not date_str:
            return False, None
        
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d/%m/%y",
            "%d-%m-%y",
            "%d %m %Y",
            "%d.%m.%Y"
        ]
        
        for fmt in formats:
            try:
                return True, datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return False, None
    
    def validate_extraction(self, raw_data: Dict[str, Any]) -> ExtractedIntervention:
        """Valide et structure les données brutes"""
        
        def make_field(field_data: Dict) -> ExtractedField:
            """Convertit un dict en ExtractedField"""
            return ExtractedField(
                value=field_data.get('value'),
                confidence=field_data.get('confidence', 0.5),
                source_text=field_data.get('source_text'),
                alternatives=field_data.get('alternatives', [])
            )
        
        # Validation des champs obligatoires
        validated = ExtractedIntervention(
            nom_client=make_field(raw_data['nom_client']),
            prenom_client=make_field(raw_data['prenom_client']),
            adresse=make_field(raw_data['adresse']),
            code_postal=make_field(raw_data['code_postal']),
            ville=make_field(raw_data['ville']),
            date_demande=make_field(raw_data['date_demande']),
            objet_devis=make_field(raw_data['objet_devis']),
            message_principal=make_field(raw_data['message_principal'])
        )
        
        # Validation code postal
        is_valid, normalized = self.validate_postal_code(
            validated.code_postal.value
        )
        if is_valid:
            validated.code_postal.value = normalized
        else:
            validated.code_postal.confidence *= 0.5
        
        # Validation téléphone
        if 'telephone' in raw_data and raw_data['telephone']['value']:
            validated.telephone = make_field(raw_data['telephone'])
            is_valid, normalized = self.validate_phone(
                validated.telephone.value
            )
            if is_valid:
                validated.telephone.value = normalized
            else:
                validated.telephone.confidence *= 0.5
        
        # Parse dates
        is_valid, parsed_date = self.parse_date(validated.date_demande.value)
        if is_valid:
            validated.date_demande.value = parsed_date
        else:
            validated.date_demande.confidence *= 0.3
        
        # Calcul confiance globale
        fields = [
            validated.nom_client,
            validated.prenom_client,
            validated.adresse,
            validated.code_postal,
            validated.ville,
            validated.date_demande
        ]
        validated.overall_confidence = sum(f.confidence for f in fields) / len(fields)
        
        return validated


# ============================================================================
# NIVEAU 3 : MAPPING INTELLIGENT AVEC BDD
# ============================================================================

class IntelligentMapper:
    """
    Mapping intelligent avec les énumérations de la BDD
    Système à 2 niveaux : matching exact + suggestions
    """
    
    def __init__(self):
        # Mappings pour améliorer la détection
        self.metier_keywords = {
            MetierEnum.PLOMBERIE: [
                'plomberie', 'plombier', 'fuite', 'eau', 'robinet', 
                'chasse d\'eau', 'wc', 'lavabo', 'évier', 'canalisation',
                'tuyau', 'sanitaire', 'salle de bain'
            ],
            MetierEnum.ELECTRICITE: [
                'électricité', 'électricien', 'panne', 'courant',
                'disjoncteur', 'tableau électrique', 'prise', 'interrupteur',
                'lumière', 'éclairage', 'installation électrique'
            ],
            MetierEnum.SERRURERIE: [
                'serrurerie', 'serrurier', 'porte', 'clé', 'serrure',
                'verrou', 'cylindre', 'ouverture de porte', 'claquée',
                'fermeture', 'sécurité'
            ],
            MetierEnum.CHAUFFAGE: [
                'chauffage', 'chaudière', 'radiateur', 'thermostat',
                'ballon d\'eau chaude', 'température', 'froid', 'chauffe'
            ],
            MetierEnum.CLIMATISATION: [
                'climatisation', 'clim', 'climatiseur', 'ventilation',
                'vmc', 'rafraîchissement', 'air conditionné'
            ],
            MetierEnum.MENUISIER: [
                'menuiserie', 'menuisier', 'bois', 'parquet',
                'porte en bois', 'placard', 'étagère', 'meuble'
            ],
            MetierEnum.PEINTURE: [
                'peinture', 'peintre', 'repeindre', 'ravalement',
                'mur', 'plafond', 'enduit', 'tapisserie'
            ],
            MetierEnum.VITRERIE: [
                'vitrerie', 'vitrier', 'vitre', 'fenêtre', 'double vitrage',
                'carreau', 'bris de glace', 'verre'
            ],
            MetierEnum.VOLET_STORE: [
                'volet', 'store', 'persienne', 'rideau métallique',
                'motorisation', 'manivelle'
            ],
            MetierEnum.JARDINAGE: [
                'jardinage', 'jardinier', 'jardin', 'espaces verts',
                'tonte', 'pelouse', 'haie', 'taille', 'élagage'
            ],
            MetierEnum.MENAGE: [
                'ménage', 'nettoyage', 'nettoyer', 'entretien',
                'propreté', 'fin de chantier'
            ],
            MetierEnum.NUISIBLE: [
                'nuisible', 'rat', 'souris', 'cafard', 'punaise',
                'insecte', 'dératisation', 'désinsectisation'
            ],
            MetierEnum.RENOVATION: [
                'rénovation', 'travaux', 'réfection', 'modernisation',
                'aménagement', 'transformation'
            ],
            MetierEnum.BRICOLAGE: [
                'bricolage', 'petit travaux', 'divers', 'fixation',
                'montage', 'installation'
            ]
        }
    
    def fuzzy_match_score(self, text1: str, text2: str) -> float:
        """Score de similarité entre deux chaînes"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def match_metier(self, extracted_text: str) -> EnumFieldMatch:
        """
        Matching intelligent d'un métier
        Retourne soit une valeur exacte, soit des suggestions
        """
        extracted_lower = extracted_text.lower()
        scores = []
        
        # Recherche par mots-clés
        for metier, keywords in self.metier_keywords.items():
            score = 0.0
            
            # Matching exact du nom
            if metier.value.lower() in extracted_lower:
                score = 1.0
            else:
                # Matching des mots-clés
                keyword_scores = [
                    1.0 if kw in extracted_lower else 
                    self.fuzzy_match_score(extracted_lower, kw)
                    for kw in keywords
                ]
                score = max(keyword_scores) if keyword_scores else 0.0
            
            if score > 0.3:  # Seuil minimum
                scores.append((metier.value, score))
        
        # Tri par score décroissant
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # Décision de matching
        if scores and scores[0][1] >= 0.85:
            # Match de haute confiance
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=False
            )
        elif scores and scores[0][1] >= 0.6:
            # Match moyen - proposer validation
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=True
            )
        else:
            # Pas de match clair - proposer suggestions
            return EnumFieldMatch(
                matched_value=None,
                confidence=0.0,
                original_text=extracted_text,
                suggestions=scores[:5],
                requires_validation=True
            )
    
    def match_multiple_metiers(self, descriptions: List[str]) -> List[EnumFieldMatch]:
        """Match plusieurs métiers depuis différentes descriptions"""
        all_matches = []
        seen_metiers = set()
        
        for desc in descriptions:
            match = self.match_metier(desc)
            
            # Évite les doublons
            if match.matched_value and match.matched_value not in seen_metiers:
                all_matches.append(match)
                seen_metiers.add(match.matched_value)
            elif not match.matched_value:
                # Garde les suggestions pour validation manuelle
                all_matches.append(match)
        
        return all_matches
    
    def enrich_intervention_data(self, 
                                  extracted: ExtractedIntervention) -> ExtractedIntervention:
        """
        Enrichit les données extraites avec le mapping intelligent
        """
        
        # Détecte les métiers depuis objet + message
        metier_sources = [
            extracted.objet_devis.value,
            extracted.message_principal.value
        ]
        
        extracted.metiers = self.match_multiple_metiers(metier_sources)
        
        return extracted


# ============================================================================
# ORCHESTRATEUR PRINCIPAL
# ============================================================================

class OCRPipeline:
    """Pipeline complet d'extraction et mapping"""
    
    def __init__(self, anthropic_api_key: str):
        self.extractor = MultimodalOCRExtractor(anthropic_api_key)
        self.validator = DataValidator()
        self.mapper = IntelligentMapper()
    
    async def process_document(self, 
                               file_path: str,
                               file_type: Literal['pdf', 'image']) -> ExtractedIntervention:
        """
        Process complet : extraction -> validation -> mapping
        """
        
        # Niveau 1 : Extraction OCR
        print("📄 Extraction des données...")
        if file_type == 'pdf':
            raw_data = await self.extractor.extract_from_pdf(file_path)
        else:
            with open(file_path, 'rb') as f:
                image_data = f.read()
            raw_data = await self.extractor.extract_from_image(image_data)
        
        # Niveau 2 : Validation
        print("✓ Validation et normalisation...")
        validated = self.validator.validate_extraction(raw_data)
        
        # Niveau 3 : Mapping
        print("🔗 Mapping avec base de données...")
        enriched = self.mapper.enrich_intervention_data(validated)
        
        print(f"✅ Extraction terminée - Confiance globale: {enriched.overall_confidence:.1%}")
        
        return enriched
    
    def generate_validation_report(self, 
                                   extracted: ExtractedIntervention) -> Dict[str, Any]:
        """
        Génère un rapport de validation pour l'utilisateur
        """
        
        fields_needing_review = []
        
        # Check confiance par champ
        all_fields = {
            'Nom client': extracted.nom_client,
            'Prénom client': extracted.prenom_client,
            'Adresse': extracted.adresse,
            'Code postal': extracted.code_postal,
            'Ville': extracted.ville,
            'Date demande': extracted.date_demande,
            'Objet': extracted.objet_devis
        }
        
        for name, field in all_fields.items():
            if field.confidence_level != ConfidenceLevel.HIGH:
                fields_needing_review.append({
                    'field': name,
                    'value': field.value,
                    'confidence': field.confidence,
                    'level': field.confidence_level.value
                })
        
        # Check métiers
        metiers_validated = []
        metiers_suggested = []
        
        for metier_match in extracted.metiers:
            if metier_match.requires_validation:
                metiers_suggested.append(metier_match.to_dict())
            else:
                metiers_validated.append(metier_match.to_dict())
        
        return {
            'overall_confidence': extracted.overall_confidence,
            'ready_for_auto_insert': extracted.overall_confidence >= 0.85,
            'fields_needing_review': fields_needing_review,
            'metiers_detected': metiers_validated,
            'metiers_suggested': metiers_suggested,
            'extraction_date': extracted.extraction_date.isoformat()
        }


# ============================================================================
# EXEMPLE D'UTILISATION
# ============================================================================

async def main():
    """Exemple d'utilisation du pipeline"""
    
    # Initialisation
    pipeline = OCRPipeline(anthropic_api_key="your-api-key")
    
    # Process un document
    result = await pipeline.process_document(
        file_path="demande_intervention.pdf",
        file_type="pdf"
    )
    
    # Génère le rapport de validation
    report = pipeline.generate_validation_report(result)
    
    print("\n" + "="*60)
    print("RAPPORT D'EXTRACTION")
    print("="*60)
    print(f"\nConfiance globale : {report['overall_confidence']:.1%}")
    print(f"Insertion auto possible : {'OUI' if report['ready_for_auto_insert'] else 'NON'}")
    
    if report['fields_needing_review']:
        print("\n⚠️  Champs nécessitant une revue :")
        for field in report['fields_needing_review']:
            print(f"  - {field['field']}: {field['value']} (confiance: {field['confidence']:.1%})")
    
    print("\n✅ Métiers détectés avec certitude :")
    for metier in report['metiers_detected']:
        print(f"  - {metier['matched']} (confiance: {metier['confidence']:.1%})")
    
    if report['metiers_suggested']:
        print("\n💡 Métiers suggérés (à valider) :")
        for metier in report['metiers_suggested']:
            print(f"  - Texte: '{metier['original']}'")
            print(f"    Suggestions: {', '.join([f'{s[0]} ({s[1]:.1%})' for s in metier['suggestions'][:3]])}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
, 
             lambda p: '0' + re.sub(r'[\s\.\-]', '', p)[3:]),
            
            # Format international sans + : 33 6 12 34 56 78
            "# (mais pas 03 36 40 87 89 qui serait un numéro valide commençant par 03)
            "(r'^33\s*[1-9](?:[\s\.\-]?\d{2}){4}"
    
    @staticmethod
    def parse_date(date_str: str) -> tuple[bool, Optional[datetime]]:
        """Parse différents formats de dates françaises"""
        if not date_str:
            return False, None
        
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d/%m/%y",
            "%d-%m-%y",
            "%d %m %Y",
            "%d.%m.%Y"
        ]
        
        for fmt in formats:
            try:
                return True, datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return False, None
    
    def validate_extraction(self, raw_data: Dict[str, Any]) -> ExtractedIntervention:
        """Valide et structure les données brutes"""
        
        def make_field(field_data: Dict) -> ExtractedField:
            """Convertit un dict en ExtractedField"""
            return ExtractedField(
                value=field_data.get('value'),
                confidence=field_data.get('confidence', 0.5),
                source_text=field_data.get('source_text'),
                alternatives=field_data.get('alternatives', [])
            )
        
        # Validation des champs obligatoires
        validated = ExtractedIntervention(
            nom_client=make_field(raw_data['nom_client']),
            prenom_client=make_field(raw_data['prenom_client']),
            adresse=make_field(raw_data['adresse']),
            code_postal=make_field(raw_data['code_postal']),
            ville=make_field(raw_data['ville']),
            date_demande=make_field(raw_data['date_demande']),
            objet_devis=make_field(raw_data['objet_devis']),
            message_principal=make_field(raw_data['message_principal'])
        )
        
        # Validation code postal
        is_valid, normalized = self.validate_postal_code(
            validated.code_postal.value
        )
        if is_valid:
            validated.code_postal.value = normalized
        else:
            validated.code_postal.confidence *= 0.5
        
        # Validation téléphone
        if 'telephone' in raw_data and raw_data['telephone']['value']:
            validated.telephone = make_field(raw_data['telephone'])
            is_valid, normalized = self.validate_phone(
                validated.telephone.value
            )
            if is_valid:
                validated.telephone.value = normalized
            else:
                validated.telephone.confidence *= 0.5
        
        # Parse dates
        is_valid, parsed_date = self.parse_date(validated.date_demande.value)
        if is_valid:
            validated.date_demande.value = parsed_date
        else:
            validated.date_demande.confidence *= 0.3
        
        # Calcul confiance globale
        fields = [
            validated.nom_client,
            validated.prenom_client,
            validated.adresse,
            validated.code_postal,
            validated.ville,
            validated.date_demande
        ]
        validated.overall_confidence = sum(f.confidence for f in fields) / len(fields)
        
        return validated


# ============================================================================
# NIVEAU 3 : MAPPING INTELLIGENT AVEC BDD
# ============================================================================

class IntelligentMapper:
    """
    Mapping intelligent avec les énumérations de la BDD
    Système à 2 niveaux : matching exact + suggestions
    """
    
    def __init__(self):
        # Mappings pour améliorer la détection
        self.metier_keywords = {
            MetierEnum.PLOMBERIE: [
                'plomberie', 'plombier', 'fuite', 'eau', 'robinet', 
                'chasse d\'eau', 'wc', 'lavabo', 'évier', 'canalisation',
                'tuyau', 'sanitaire', 'salle de bain'
            ],
            MetierEnum.ELECTRICITE: [
                'électricité', 'électricien', 'panne', 'courant',
                'disjoncteur', 'tableau électrique', 'prise', 'interrupteur',
                'lumière', 'éclairage', 'installation électrique'
            ],
            MetierEnum.SERRURERIE: [
                'serrurerie', 'serrurier', 'porte', 'clé', 'serrure',
                'verrou', 'cylindre', 'ouverture de porte', 'claquée',
                'fermeture', 'sécurité'
            ],
            MetierEnum.CHAUFFAGE: [
                'chauffage', 'chaudière', 'radiateur', 'thermostat',
                'ballon d\'eau chaude', 'température', 'froid', 'chauffe'
            ],
            MetierEnum.CLIMATISATION: [
                'climatisation', 'clim', 'climatiseur', 'ventilation',
                'vmc', 'rafraîchissement', 'air conditionné'
            ],
            MetierEnum.MENUISIER: [
                'menuiserie', 'menuisier', 'bois', 'parquet',
                'porte en bois', 'placard', 'étagère', 'meuble'
            ],
            MetierEnum.PEINTURE: [
                'peinture', 'peintre', 'repeindre', 'ravalement',
                'mur', 'plafond', 'enduit', 'tapisserie'
            ],
            MetierEnum.VITRERIE: [
                'vitrerie', 'vitrier', 'vitre', 'fenêtre', 'double vitrage',
                'carreau', 'bris de glace', 'verre'
            ],
            MetierEnum.VOLET_STORE: [
                'volet', 'store', 'persienne', 'rideau métallique',
                'motorisation', 'manivelle'
            ],
            MetierEnum.JARDINAGE: [
                'jardinage', 'jardinier', 'jardin', 'espaces verts',
                'tonte', 'pelouse', 'haie', 'taille', 'élagage'
            ],
            MetierEnum.MENAGE: [
                'ménage', 'nettoyage', 'nettoyer', 'entretien',
                'propreté', 'fin de chantier'
            ],
            MetierEnum.NUISIBLE: [
                'nuisible', 'rat', 'souris', 'cafard', 'punaise',
                'insecte', 'dératisation', 'désinsectisation'
            ],
            MetierEnum.RENOVATION: [
                'rénovation', 'travaux', 'réfection', 'modernisation',
                'aménagement', 'transformation'
            ],
            MetierEnum.BRICOLAGE: [
                'bricolage', 'petit travaux', 'divers', 'fixation',
                'montage', 'installation'
            ]
        }
    
    def fuzzy_match_score(self, text1: str, text2: str) -> float:
        """Score de similarité entre deux chaînes"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def match_metier(self, extracted_text: str) -> EnumFieldMatch:
        """
        Matching intelligent d'un métier
        Retourne soit une valeur exacte, soit des suggestions
        """
        extracted_lower = extracted_text.lower()
        scores = []
        
        # Recherche par mots-clés
        for metier, keywords in self.metier_keywords.items():
            score = 0.0
            
            # Matching exact du nom
            if metier.value.lower() in extracted_lower:
                score = 1.0
            else:
                # Matching des mots-clés
                keyword_scores = [
                    1.0 if kw in extracted_lower else 
                    self.fuzzy_match_score(extracted_lower, kw)
                    for kw in keywords
                ]
                score = max(keyword_scores) if keyword_scores else 0.0
            
            if score > 0.3:  # Seuil minimum
                scores.append((metier.value, score))
        
        # Tri par score décroissant
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # Décision de matching
        if scores and scores[0][1] >= 0.85:
            # Match de haute confiance
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=False
            )
        elif scores and scores[0][1] >= 0.6:
            # Match moyen - proposer validation
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=True
            )
        else:
            # Pas de match clair - proposer suggestions
            return EnumFieldMatch(
                matched_value=None,
                confidence=0.0,
                original_text=extracted_text,
                suggestions=scores[:5],
                requires_validation=True
            )
    
    def match_multiple_metiers(self, descriptions: List[str]) -> List[EnumFieldMatch]:
        """Match plusieurs métiers depuis différentes descriptions"""
        all_matches = []
        seen_metiers = set()
        
        for desc in descriptions:
            match = self.match_metier(desc)
            
            # Évite les doublons
            if match.matched_value and match.matched_value not in seen_metiers:
                all_matches.append(match)
                seen_metiers.add(match.matched_value)
            elif not match.matched_value:
                # Garde les suggestions pour validation manuelle
                all_matches.append(match)
        
        return all_matches
    
    def enrich_intervention_data(self, 
                                  extracted: ExtractedIntervention) -> ExtractedIntervention:
        """
        Enrichit les données extraites avec le mapping intelligent
        """
        
        # Détecte les métiers depuis objet + message
        metier_sources = [
            extracted.objet_devis.value,
            extracted.message_principal.value
        ]
        
        extracted.metiers = self.match_multiple_metiers(metier_sources)
        
        return extracted


# ============================================================================
# ORCHESTRATEUR PRINCIPAL
# ============================================================================

class OCRPipeline:
    """Pipeline complet d'extraction et mapping"""
    
    def __init__(self, anthropic_api_key: str):
        self.extractor = MultimodalOCRExtractor(anthropic_api_key)
        self.validator = DataValidator()
        self.mapper = IntelligentMapper()
    
    async def process_document(self, 
                               file_path: str,
                               file_type: Literal['pdf', 'image']) -> ExtractedIntervention:
        """
        Process complet : extraction -> validation -> mapping
        """
        
        # Niveau 1 : Extraction OCR
        print("📄 Extraction des données...")
        if file_type == 'pdf':
            raw_data = await self.extractor.extract_from_pdf(file_path)
        else:
            with open(file_path, 'rb') as f:
                image_data = f.read()
            raw_data = await self.extractor.extract_from_image(image_data)
        
        # Niveau 2 : Validation
        print("✓ Validation et normalisation...")
        validated = self.validator.validate_extraction(raw_data)
        
        # Niveau 3 : Mapping
        print("🔗 Mapping avec base de données...")
        enriched = self.mapper.enrich_intervention_data(validated)
        
        print(f"✅ Extraction terminée - Confiance globale: {enriched.overall_confidence:.1%}")
        
        return enriched
    
    def generate_validation_report(self, 
                                   extracted: ExtractedIntervention) -> Dict[str, Any]:
        """
        Génère un rapport de validation pour l'utilisateur
        """
        
        fields_needing_review = []
        
        # Check confiance par champ
        all_fields = {
            'Nom client': extracted.nom_client,
            'Prénom client': extracted.prenom_client,
            'Adresse': extracted.adresse,
            'Code postal': extracted.code_postal,
            'Ville': extracted.ville,
            'Date demande': extracted.date_demande,
            'Objet': extracted.objet_devis
        }
        
        for name, field in all_fields.items():
            if field.confidence_level != ConfidenceLevel.HIGH:
                fields_needing_review.append({
                    'field': name,
                    'value': field.value,
                    'confidence': field.confidence,
                    'level': field.confidence_level.value
                })
        
        # Check métiers
        metiers_validated = []
        metiers_suggested = []
        
        for metier_match in extracted.metiers:
            if metier_match.requires_validation:
                metiers_suggested.append(metier_match.to_dict())
            else:
                metiers_validated.append(metier_match.to_dict())
        
        return {
            'overall_confidence': extracted.overall_confidence,
            'ready_for_auto_insert': extracted.overall_confidence >= 0.85,
            'fields_needing_review': fields_needing_review,
            'metiers_detected': metiers_validated,
            'metiers_suggested': metiers_suggested,
            'extraction_date': extracted.extraction_date.isoformat()
        }


# ============================================================================
# EXEMPLE D'UTILISATION
# ============================================================================

async def main():
    """Exemple d'utilisation du pipeline"""
    
    # Initialisation
    pipeline = OCRPipeline(anthropic_api_key="your-api-key")
    
    # Process un document
    result = await pipeline.process_document(
        file_path="demande_intervention.pdf",
        file_type="pdf"
    )
    
    # Génère le rapport de validation
    report = pipeline.generate_validation_report(result)
    
    print("\n" + "="*60)
    print("RAPPORT D'EXTRACTION")
    print("="*60)
    print(f"\nConfiance globale : {report['overall_confidence']:.1%}")
    print(f"Insertion auto possible : {'OUI' if report['ready_for_auto_insert'] else 'NON'}")
    
    if report['fields_needing_review']:
        print("\n⚠️  Champs nécessitant une revue :")
        for field in report['fields_needing_review']:
            print(f"  - {field['field']}: {field['value']} (confiance: {field['confidence']:.1%})")
    
    print("\n✅ Métiers détectés avec certitude :")
    for metier in report['metiers_detected']:
        print(f"  - {metier['matched']} (confiance: {metier['confidence']:.1%})")
    
    if report['metiers_suggested']:
        print("\n💡 Métiers suggérés (à valider) :")
        for metier in report['metiers_suggested']:
            print(f"  - Texte: '{metier['original']}'")
            print(f"    Suggestions: {', '.join([f'{s[0]} ({s[1]:.1%})' for s in metier['suggestions'][:3]])}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
, 
             lambda p: '0' + re.sub(r'[\s\.\-]', '', p)[2:]),
        ]
        
        phone_stripped = phone.strip()
        
        for pattern, normalizer in patterns:
            if re.match(pattern, phone_stripped):
                normalized = normalizer(phone_stripped)
                # Nettoie et vérifie longueur finale
                clean = ''.join(c for c in normalized if c.isdigit())
                if len(clean) == 10 and clean.startswith('0'):
                    return True, clean
        
        return False, phone
    
    @staticmethod
    def parse_date(date_str: str) -> tuple[bool, Optional[datetime]]:
        """Parse différents formats de dates françaises"""
        if not date_str:
            return False, None
        
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d/%m/%y",
            "%d-%m-%y",
            "%d %m %Y",
            "%d.%m.%Y"
        ]
        
        for fmt in formats:
            try:
                return True, datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return False, None
    
    def validate_extraction(self, raw_data: Dict[str, Any]) -> ExtractedIntervention:
        """Valide et structure les données brutes"""
        
        def make_field(field_data: Dict) -> ExtractedField:
            """Convertit un dict en ExtractedField"""
            return ExtractedField(
                value=field_data.get('value'),
                confidence=field_data.get('confidence', 0.5),
                source_text=field_data.get('source_text'),
                alternatives=field_data.get('alternatives', [])
            )
        
        # Validation des champs obligatoires
        validated = ExtractedIntervention(
            nom_client=make_field(raw_data['nom_client']),
            prenom_client=make_field(raw_data['prenom_client']),
            adresse=make_field(raw_data['adresse']),
            code_postal=make_field(raw_data['code_postal']),
            ville=make_field(raw_data['ville']),
            date_demande=make_field(raw_data['date_demande']),
            objet_devis=make_field(raw_data['objet_devis']),
            message_principal=make_field(raw_data['message_principal'])
        )
        
        # Validation code postal
        is_valid, normalized = self.validate_postal_code(
            validated.code_postal.value
        )
        if is_valid:
            validated.code_postal.value = normalized
        else:
            validated.code_postal.confidence *= 0.5
        
        # Validation téléphone
        if 'telephone' in raw_data and raw_data['telephone']['value']:
            validated.telephone = make_field(raw_data['telephone'])
            is_valid, normalized = self.validate_phone(
                validated.telephone.value
            )
            if is_valid:
                validated.telephone.value = normalized
            else:
                validated.telephone.confidence *= 0.5
        
        # Parse dates
        is_valid, parsed_date = self.parse_date(validated.date_demande.value)
        if is_valid:
            validated.date_demande.value = parsed_date
        else:
            validated.date_demande.confidence *= 0.3
        
        # Calcul confiance globale
        fields = [
            validated.nom_client,
            validated.prenom_client,
            validated.adresse,
            validated.code_postal,
            validated.ville,
            validated.date_demande
        ]
        validated.overall_confidence = sum(f.confidence for f in fields) / len(fields)
        
        return validated


# ============================================================================
# NIVEAU 3 : MAPPING INTELLIGENT AVEC BDD
# ============================================================================

class IntelligentMapper:
    """
    Mapping intelligent avec les énumérations de la BDD
    Système à 2 niveaux : matching exact + suggestions
    """
    
    def __init__(self):
        # Mappings pour améliorer la détection
        self.metier_keywords = {
            MetierEnum.PLOMBERIE: [
                'plomberie', 'plombier', 'fuite', 'eau', 'robinet', 
                'chasse d\'eau', 'wc', 'lavabo', 'évier', 'canalisation',
                'tuyau', 'sanitaire', 'salle de bain'
            ],
            MetierEnum.ELECTRICITE: [
                'électricité', 'électricien', 'panne', 'courant',
                'disjoncteur', 'tableau électrique', 'prise', 'interrupteur',
                'lumière', 'éclairage', 'installation électrique'
            ],
            MetierEnum.SERRURERIE: [
                'serrurerie', 'serrurier', 'porte', 'clé', 'serrure',
                'verrou', 'cylindre', 'ouverture de porte', 'claquée',
                'fermeture', 'sécurité'
            ],
            MetierEnum.CHAUFFAGE: [
                'chauffage', 'chaudière', 'radiateur', 'thermostat',
                'ballon d\'eau chaude', 'température', 'froid', 'chauffe'
            ],
            MetierEnum.CLIMATISATION: [
                'climatisation', 'clim', 'climatiseur', 'ventilation',
                'vmc', 'rafraîchissement', 'air conditionné'
            ],
            MetierEnum.MENUISIER: [
                'menuiserie', 'menuisier', 'bois', 'parquet',
                'porte en bois', 'placard', 'étagère', 'meuble'
            ],
            MetierEnum.PEINTURE: [
                'peinture', 'peintre', 'repeindre', 'ravalement',
                'mur', 'plafond', 'enduit', 'tapisserie'
            ],
            MetierEnum.VITRERIE: [
                'vitrerie', 'vitrier', 'vitre', 'fenêtre', 'double vitrage',
                'carreau', 'bris de glace', 'verre'
            ],
            MetierEnum.VOLET_STORE: [
                'volet', 'store', 'persienne', 'rideau métallique',
                'motorisation', 'manivelle'
            ],
            MetierEnum.JARDINAGE: [
                'jardinage', 'jardinier', 'jardin', 'espaces verts',
                'tonte', 'pelouse', 'haie', 'taille', 'élagage'
            ],
            MetierEnum.MENAGE: [
                'ménage', 'nettoyage', 'nettoyer', 'entretien',
                'propreté', 'fin de chantier'
            ],
            MetierEnum.NUISIBLE: [
                'nuisible', 'rat', 'souris', 'cafard', 'punaise',
                'insecte', 'dératisation', 'désinsectisation'
            ],
            MetierEnum.RENOVATION: [
                'rénovation', 'travaux', 'réfection', 'modernisation',
                'aménagement', 'transformation'
            ],
            MetierEnum.BRICOLAGE: [
                'bricolage', 'petit travaux', 'divers', 'fixation',
                'montage', 'installation'
            ]
        }
    
    def fuzzy_match_score(self, text1: str, text2: str) -> float:
        """Score de similarité entre deux chaînes"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def match_metier(self, extracted_text: str) -> EnumFieldMatch:
        """
        Matching intelligent d'un métier
        Retourne soit une valeur exacte, soit des suggestions
        """
        extracted_lower = extracted_text.lower()
        scores = []
        
        # Recherche par mots-clés
        for metier, keywords in self.metier_keywords.items():
            score = 0.0
            
            # Matching exact du nom
            if metier.value.lower() in extracted_lower:
                score = 1.0
            else:
                # Matching des mots-clés
                keyword_scores = [
                    1.0 if kw in extracted_lower else 
                    self.fuzzy_match_score(extracted_lower, kw)
                    for kw in keywords
                ]
                score = max(keyword_scores) if keyword_scores else 0.0
            
            if score > 0.3:  # Seuil minimum
                scores.append((metier.value, score))
        
        # Tri par score décroissant
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # Décision de matching
        if scores and scores[0][1] >= 0.85:
            # Match de haute confiance
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=False
            )
        elif scores and scores[0][1] >= 0.6:
            # Match moyen - proposer validation
            return EnumFieldMatch(
                matched_value=scores[0][0],
                confidence=scores[0][1],
                original_text=extracted_text,
                suggestions=scores[:3],
                requires_validation=True
            )
        else:
            # Pas de match clair - proposer suggestions
            return EnumFieldMatch(
                matched_value=None,
                confidence=0.0,
                original_text=extracted_text,
                suggestions=scores[:5],
                requires_validation=True
            )
    
    def match_multiple_metiers(self, descriptions: List[str]) -> List[EnumFieldMatch]:
        """Match plusieurs métiers depuis différentes descriptions"""
        all_matches = []
        seen_metiers = set()
        
        for desc in descriptions:
            match = self.match_metier(desc)
            
            # Évite les doublons
            if match.matched_value and match.matched_value not in seen_metiers:
                all_matches.append(match)
                seen_metiers.add(match.matched_value)
            elif not match.matched_value:
                # Garde les suggestions pour validation manuelle
                all_matches.append(match)
        
        return all_matches
    
    def enrich_intervention_data(self, 
                                  extracted: ExtractedIntervention) -> ExtractedIntervention:
        """
        Enrichit les données extraites avec le mapping intelligent
        """
        
        # Détecte les métiers depuis objet + message
        metier_sources = [
            extracted.objet_devis.value,
            extracted.message_principal.value
        ]
        
        extracted.metiers = self.match_multiple_metiers(metier_sources)
        
        return extracted


# ============================================================================
# ORCHESTRATEUR PRINCIPAL
# ============================================================================

class OCRPipeline:
    """Pipeline complet d'extraction et mapping"""
    
    def __init__(self, anthropic_api_key: str):
        self.extractor = MultimodalOCRExtractor(anthropic_api_key)
        self.validator = DataValidator()
        self.mapper = IntelligentMapper()
    
    async def process_document(self, 
                               file_path: str,
                               file_type: Literal['pdf', 'image']) -> ExtractedIntervention:
        """
        Process complet : extraction -> validation -> mapping
        """
        
        # Niveau 1 : Extraction OCR
        print("📄 Extraction des données...")
        if file_type == 'pdf':
            raw_data = await self.extractor.extract_from_pdf(file_path)
        else:
            with open(file_path, 'rb') as f:
                image_data = f.read()
            raw_data = await self.extractor.extract_from_image(image_data)
        
        # Niveau 2 : Validation
        print("✓ Validation et normalisation...")
        validated = self.validator.validate_extraction(raw_data)
        
        # Niveau 3 : Mapping
        print("🔗 Mapping avec base de données...")
        enriched = self.mapper.enrich_intervention_data(validated)
        
        print(f"✅ Extraction terminée - Confiance globale: {enriched.overall_confidence:.1%}")
        
        return enriched
    
    def generate_validation_report(self, 
                                   extracted: ExtractedIntervention) -> Dict[str, Any]:
        """
        Génère un rapport de validation pour l'utilisateur
        """
        
        fields_needing_review = []
        
        # Check confiance par champ
        all_fields = {
            'Nom client': extracted.nom_client,
            'Prénom client': extracted.prenom_client,
            'Adresse': extracted.adresse,
            'Code postal': extracted.code_postal,
            'Ville': extracted.ville,
            'Date demande': extracted.date_demande,
            'Objet': extracted.objet_devis
        }
        
        for name, field in all_fields.items():
            if field.confidence_level != ConfidenceLevel.HIGH:
                fields_needing_review.append({
                    'field': name,
                    'value': field.value,
                    'confidence': field.confidence,
                    'level': field.confidence_level.value
                })
        
        # Check métiers
        metiers_validated = []
        metiers_suggested = []
        
        for metier_match in extracted.metiers:
            if metier_match.requires_validation:
                metiers_suggested.append(metier_match.to_dict())
            else:
                metiers_validated.append(metier_match.to_dict())
        
        return {
            'overall_confidence': extracted.overall_confidence,
            'ready_for_auto_insert': extracted.overall_confidence >= 0.85,
            'fields_needing_review': fields_needing_review,
            'metiers_detected': metiers_validated,
            'metiers_suggested': metiers_suggested,
            'extraction_date': extracted.extraction_date.isoformat()
        }


# ============================================================================
# EXEMPLE D'UTILISATION
# ============================================================================

async def main():
    """Exemple d'utilisation du pipeline"""
    
    # Initialisation
    pipeline = OCRPipeline(anthropic_api_key="your-api-key")
    
    # Process un document
    result = await pipeline.process_document(
        file_path="demande_intervention.pdf",
        file_type="pdf"
    )
    
    # Génère le rapport de validation
    report = pipeline.generate_validation_report(result)
    
    print("\n" + "="*60)
    print("RAPPORT D'EXTRACTION")
    print("="*60)
    print(f"\nConfiance globale : {report['overall_confidence']:.1%}")
    print(f"Insertion auto possible : {'OUI' if report['ready_for_auto_insert'] else 'NON'}")
    
    if report['fields_needing_review']:
        print("\n⚠️  Champs nécessitant une revue :")
        for field in report['fields_needing_review']:
            print(f"  - {field['field']}: {field['value']} (confiance: {field['confidence']:.1%})")
    
    print("\n✅ Métiers détectés avec certitude :")
    for metier in report['metiers_detected']:
        print(f"  - {metier['matched']} (confiance: {metier['confidence']:.1%})")
    
    if report['metiers_suggested']:
        print("\n💡 Métiers suggérés (à valider) :")
        for metier in report['metiers_suggested']:
            print(f"  - Texte: '{metier['original']}'")
            print(f"    Suggestions: {', '.join([f'{s[0]} ({s[1]:.1%})' for s in metier['suggestions'][:3]])}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())