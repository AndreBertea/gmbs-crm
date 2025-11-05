// Mock API - Artisans
// Basé sur le modèle legacy Artisan du CRM GMBS

export interface Artisan {
  id: string;
  date: string;
  prenom: string;
  nom: string;
  telephone: string;
  telephone2?: string;
  email: string;
  raisonSociale: string;
  siret: string;
  statutJuridique: string;
  metiers: string[];
  zoneIntervention: number;
  commentaire?: string;
  statutDossier: string;
  statutArtisan: string;
  statutInactif: boolean;
  statutAvantArchiver?: string;
  statutArtisanAvantInactif?: string;
  adresseSiegeSocial: string;
  villeSiegeSocial: string;
  codePostalSiegeSocial: string;
  adresseIntervention: string;
  villeIntervention: string;
  codePostalIntervention: string;
  interventionLatitude?: number;
  interventionLongitude?: number;
  attribueA?: string; // User ID
}

export const mockArtisans: Artisan[] = [
  {
    id: "1",
    date: "2024-01-15T10:00:00Z",
    prenom: "Andre",
    nom: "Lille Couvreur",
    telephone: "06 12 34 56 78",
    email: "andre.lille.couvreur@email.com",
    raisonSociale: "Lille Couvreur SARL",
    siret: "12345678901234",
    statutJuridique: "SARL",
    metiers: ["Couvreur", "Zinguerie"],
    zoneIntervention: 59,
    statutDossier: "Actif",
    statutArtisan: "Disponible",
    statutInactif: false,
    adresseSiegeSocial: "123 Rue de la Paix",
    villeSiegeSocial: "Lille",
    codePostalSiegeSocial: "59000",
    adresseIntervention: "123 Rue de la Paix",
    villeIntervention: "Lille",
    codePostalIntervention: "59000",
    interventionLatitude: 50.6292,
    interventionLongitude: 3.0573,
    attribueA: "1"
  },
  {
    id: "2",
    date: "2024-01-20T14:30:00Z",
    prenom: "Haythem",
    nom: "Nafti",
    telephone: "06 13 27 31 07",
    email: "haythem.nafti@email.com",
    raisonSociale: "Nafti Bricolage",
    siret: "98765432109876",
    statutJuridique: "Auto-entrepreneur",
    metiers: ["Bricolage", "Plomberie"],
    zoneIntervention: 75,
    statutDossier: "Actif",
    statutArtisan: "Disponible",
    statutInactif: false,
    adresseSiegeSocial: "456 Avenue des Champs",
    villeSiegeSocial: "Paris",
    codePostalSiegeSocial: "75014",
    adresseIntervention: "456 Avenue des Champs",
    villeIntervention: "Paris",
    codePostalIntervention: "75014",
    interventionLatitude: 48.8566,
    interventionLongitude: 2.3522,
    attribueA: "2"
  },
  {
    id: "3",
    date: "2024-02-01T09:15:00Z",
    prenom: "Rais",
    nom: "Samy",
    telephone: "06 98 76 54 32",
    email: "rais.samy@email.com",
    raisonSociale: "Samy Électricité",
    siret: "11223344556677",
    statutJuridique: "EURL",
    metiers: ["Électricité", "Dépannage"],
    zoneIntervention: 75,
    statutDossier: "Actif",
    statutArtisan: "Disponible",
    statutInactif: false,
    adresseSiegeSocial: "789 Boulevard Saint-Germain",
    villeSiegeSocial: "Paris",
    codePostalSiegeSocial: "75006",
    adresseIntervention: "789 Boulevard Saint-Germain",
    villeIntervention: "Paris",
    codePostalIntervention: "75006",
    interventionLatitude: 48.8534,
    interventionLongitude: 2.3488,
    attribueA: "3"
  },
  {
    id: "4",
    date: "2024-02-10T16:45:00Z",
    prenom: "Jean",
    nom: "Vitrier",
    telephone: "06 55 44 33 22",
    email: "jean.vitrier@email.com",
    raisonSociale: "Vitrerie Express",
    siret: "99887766554433",
    statutJuridique: "SAS",
    metiers: ["Vitrerie", "Menuiserie"],
    zoneIntervention: 59,
    statutDossier: "Actif",
    statutArtisan: "Disponible",
    statutInactif: false,
    adresseSiegeSocial: "321 Rue du Commerce",
    villeSiegeSocial: "Lille",
    codePostalSiegeSocial: "59000",
    adresseIntervention: "321 Rue du Commerce",
    villeIntervention: "Lille",
    codePostalIntervention: "59000",
    interventionLatitude: 50.6319,
    interventionLongitude: 3.0635,
    attribueA: "4"
  },
  {
    id: "5",
    date: "2024-02-15T11:20:00Z",
    prenom: "Marie",
    nom: "Plombier",
    telephone: "06 11 22 33 44",
    email: "marie.plombier@email.com",
    raisonSociale: "Plomberie Pro",
    siret: "55443322110099",
    statutJuridique: "SASU",
    metiers: ["Plomberie", "Chauffage"],
    zoneIntervention: 75,
    statutDossier: "Actif",
    statutArtisan: "Disponible",
    statutInactif: false,
    adresseSiegeSocial: "654 Rue de Rivoli",
    villeSiegeSocial: "Paris",
    codePostalSiegeSocial: "75001",
    adresseIntervention: "654 Rue de Rivoli",
    villeIntervention: "Paris",
    codePostalIntervention: "75001",
    interventionLatitude: 48.8566,
    interventionLongitude: 2.3522,
    attribueA: "5"
  }
];

// Fonctions utilitaires pour les artisans
export const getArtisanById = (id: string): Artisan | undefined => {
  return mockArtisans.find(artisan => artisan.id === id);
};

export const getArtisansByMetier = (metier: string): Artisan[] => {
  return mockArtisans.filter(artisan => 
    artisan.metiers.some(m => m.toLowerCase().includes(metier.toLowerCase()))
  );
};

export const getArtisansByZone = (zone: number): Artisan[] => {
  return mockArtisans.filter(artisan => artisan.zoneIntervention === zone);
};

export const getActiveArtisans = (): Artisan[] => {
  return mockArtisans.filter(artisan => !artisan.statutInactif);
};

export const getArtisansByStatut = (statut: string): Artisan[] => {
  return mockArtisans.filter(artisan => artisan.statutArtisan === statut);
};
