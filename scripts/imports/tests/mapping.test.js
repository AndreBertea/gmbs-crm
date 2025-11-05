/**
 * Tests unitaires pour le système de mapping
 * 
 * Ces tests valident le bon fonctionnement du mapping des données
 * CSV vers le schéma de base de données.
 */

const { DataMapper } = require('../../data-processing/data-mapper');
const { DataValidator } = require('../../data-processing/data-validator');

// Mock de Supabase pour les tests
const mockSupabase = {
  from: (table) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: 'test-id' }, error: null })
      })
    })
  })
};

// Remplacer le module supabase-client par le mock
jest.mock('../../src/lib/supabase-client', () => ({
  supabase: mockSupabase
}));

describe('DataMapper', () => {
  let dataMapper;
  
  beforeEach(() => {
    dataMapper = new DataMapper();
  });

  describe('mapArtisanFromCSV', () => {
    test('devrait mapper correctement un artisan complet', async () => {
      const csvRow = {
        '                  Nom Prénom ': 'Jean Dupont',
        'Adresse Mail': 'jean.dupont@example.com',
        'Numéro Téléphone ': '06 12 34 56 78',
        'Raison Social': 'SARL Dupont',
        'Siret ': '12345678901234',
        'STATUT JURIDIQUE': 'SARL',
        'STATUT': 'POTENTIEL',
        'Adresse Postale': '123 Rue de la Paix 75001 PARIS',
        'Gestionnaire': 'Admin',
        'MÉTIER': 'PLOMBERIE',
        'DATE D\'AJOUT ': '01/01/2024',
        'SUIVI DES RELANCES DOCS': 'Relance effectuée'
      };

      const result = await dataMapper.mapArtisanFromCSV(csvRow);

      expect(result).toMatchObject({
        prenom: 'Jean',
        nom: 'Dupont',
        email: 'jean.dupont@example.com',
        telephone: '0612345678',
        raison_sociale: 'SARL Dupont',
        siret: '12345678901234',
        statut_juridique: 'SARL',
        adresse_siege_social: '123 Rue de la Paix 75001 PARIS',
        ville_siege_social: 'PARIS',
        code_postal_siege_social: '75001',
        is_active: true
      });
    });

    test('devrait gérer les téléphones multiples', async () => {
      const csvRow = {
        '                  Nom Prénom ': 'Marie Martin',
        'Numéro Téléphone ': '06 12 34 56 78 / 01 23 45 67 89',
        'Adresse Mail': 'marie@example.com'
      };

      const result = await dataMapper.mapArtisanFromCSV(csvRow);

      expect(result.telephone).toBe('0612345678');
      expect(result.telephone2).toBe('0123456789');
    });

    test('devrait gérer les données manquantes', async () => {
      const csvRow = {
        '                  Nom Prénom ': 'Test User'
      };

      const result = await dataMapper.mapArtisanFromCSV(csvRow);

      expect(result.prenom).toBe('Test');
      expect(result.nom).toBe('User');
      expect(result.email).toBeNull();
      expect(result.telephone).toBeNull();
      expect(result.is_active).toBe(true);
    });
  });

  describe('mapInterventionFromCSV', () => {
    test('devrait mapper correctement une intervention complète', async () => {
      const csvRow = {
        'ID': '12345',
        'Date ': '15/03/2024',
        'Agence': 'AFEDIM',
        'Adresse d\'intervention': '456 Avenue des Champs 69000 LYON',
        ' Statut': 'Accepté',
        'Contexte d\'intervention ': 'Réparation urgente',
        'Métier': 'PLOMBERIE',
        ' Gest.': 'Admin',
        'SST': 'SST123',
        'COUT SST': '150.50',
        'COÛT MATERIEL ': '75.25',
        'COUT INTER': '200.00',
        '% SST': '15.5',
        'Date d\'intervention': '20/03/2024',
        'COMMENTAIRE': 'Intervention réussie'
      };

      const result = await dataMapper.mapInterventionFromCSV(csvRow);

      expect(result).toMatchObject({
        id_inter: '12345',
        adresse: '456 Avenue des Champs 69000 LYON',
        ville: 'LYON',
        code_postal: '69000',
        contexte_intervention: 'Réparation urgente',
        numero_sst: 'SST123',
        pourcentage_sst: 15.5,
        is_active: true
      });
    });
  });

  describe('mapInterventionCostsFromCSV', () => {
    test('devrait mapper les coûts correctement', () => {
      const csvRow = {
        'COUT SST': '150.50',
        'COÛT MATERIEL ': '75.25',
        'COUT INTER': '200.00'
      };

      const costs = dataMapper.mapInterventionCostsFromCSV(csvRow, 'test-intervention-id');

      expect(costs).toHaveLength(3);
      expect(costs[0]).toMatchObject({
        intervention_id: 'test-intervention-id',
        cost_type: 'sst',
        amount: 150.50,
        currency: 'EUR'
      });
      expect(costs[1]).toMatchObject({
        cost_type: 'materiel',
        amount: 75.25
      });
      expect(costs[2]).toMatchObject({
        cost_type: 'intervention',
        amount: 200.00
      });
    });
  });

  describe('Méthodes d\'extraction', () => {
    test('extractPrenom devrait extraire le prénom', () => {
      expect(dataMapper.extractPrenom('Jean Dupont')).toBe('Jean');
      expect(dataMapper.extractPrenom('Marie-Claire Martin')).toBe('Marie-Claire');
      expect(dataMapper.extractPrenom('')).toBeNull();
    });

    test('extractNom devrait extraire le nom', () => {
      expect(dataMapper.extractNom('Jean Dupont')).toBe('Dupont');
      expect(dataMapper.extractNom('Marie-Claire Martin')).toBe('Martin');
      expect(dataMapper.extractNom('Jean')).toBeNull();
    });

    test('cleanPhone devrait nettoyer les téléphones', () => {
      expect(dataMapper.cleanPhone('06 12 34 56 78')).toBe('0612345678');
      expect(dataMapper.cleanPhone('+33 6 12 34 56 78')).toBe('33612345678');
      expect(dataMapper.cleanPhone('')).toBeNull();
      expect(dataMapper.cleanPhone('123')).toBeNull(); // Trop court
    });

    test('cleanEmail devrait valider les emails', () => {
      expect(dataMapper.cleanEmail('test@example.com')).toBe('test@example.com');
      expect(dataMapper.cleanEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
      expect(dataMapper.cleanEmail('invalid-email')).toBeNull();
      expect(dataMapper.cleanEmail('')).toBeNull();
    });

    test('parseNumber devrait parser les nombres', () => {
      expect(dataMapper.parseNumber('150.50')).toBe(150.50);
      expect(dataMapper.parseNumber('1 500,75')).toBe(1500.75);
      expect(dataMapper.parseNumber('2976,55 dire 2900')).toBe(2976.55);
      expect(dataMapper.parseNumber('')).toBeNull();
      expect(dataMapper.parseNumber('invalid')).toBeNull();
    });

    test('parseDate devrait parser les dates', () => {
      const date1 = dataMapper.parseDate('15/03/2024');
      expect(date1).toMatch(/2024-03-15T00:00:00/);
      
      const date2 = dataMapper.parseDate('2024-03-15');
      expect(date2).toMatch(/2024-03-15/);
      
      expect(dataMapper.parseDate('')).toBeNull();
      expect(dataMapper.parseDate('invalid-date')).toBeNull();
    });
  });
});

describe('DataValidator', () => {
  let dataValidator;
  
  beforeEach(() => {
    dataValidator = new DataValidator();
  });

  describe('validate', () => {
    test('devrait valider un artisan correct', () => {
      const artisan = {
        prenom: 'Jean',
        nom: 'Dupont',
        email: 'jean.dupont@example.com',
        telephone: '0612345678',
        siret: '12345678901234'
      };

      const result = dataValidator.validate(artisan, 'artisan');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('devrait détecter les erreurs de validation', () => {
      const artisan = {
        prenom: '', // Vide
        nom: '', // Vide
        email: 'invalid-email',
        telephone: '123', // Trop court
        siret: '123' // Trop court
      };

      const result = dataValidator.validate(artisan, 'artisan');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Prénom ou nom requis');
      expect(result.errors).toContain('email: Format email invalide');
      expect(result.errors).toContain('telephone: Téléphone invalide (8-15 chiffres)');
    });

    test('devrait valider une intervention correcte', () => {
      const intervention = {
        date: '2024-03-15T00:00:00Z',
        adresse: '123 Rue de la Paix',
        ville: 'Paris',
        id_inter: '12345'
      };

      const result = dataValidator.validate(intervention, 'intervention');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('devrait détecter les erreurs d\'intervention', () => {
      const intervention = {
        // date manquante
        adresse: 'A'.repeat(600), // Trop long
        ville: 'Paris'
      };

      const result = dataValidator.validate(intervention, 'intervention');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Champ requis manquant: date');
      expect(result.errors).toContain('adresse: Longueur maximale dépassée');
    });
  });

  describe('validateBatch', () => {
    test('devrait valider un lot de données', () => {
      const artisans = [
        { prenom: 'Jean', nom: 'Dupont', email: 'jean@example.com' },
        { prenom: 'Marie', nom: 'Martin', email: 'invalid-email' },
        { prenom: '', nom: '', email: 'test@example.com' }
      ];

      const result = dataValidator.validateBatch(artisans, 'artisan');

      expect(result.total).toBe(3);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(2);
      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(2);
    });
  });
});

// Tests d'intégration
describe('Intégration', () => {
  test('devrait mapper et valider un artisan complet', async () => {
    const dataMapper = new DataMapper();
    const dataValidator = new DataValidator();

    const csvRow = {
      '                  Nom Prénom ': 'Jean Dupont',
      'Adresse Mail': 'jean.dupont@example.com',
      'Numéro Téléphone ': '06 12 34 56 78',
      'Raison Social': 'SARL Dupont',
      'Siret ': '12345678901234',
      'STATUT JURIDIQUE': 'SARL',
      'STATUT': 'POTENTIEL',
      'Adresse Postale': '123 Rue de la Paix 75001 PARIS',
      'Gestionnaire': 'Admin',
      'MÉTIER': 'PLOMBERIE'
    };

    // Mapper
    const mapped = await dataMapper.mapArtisanFromCSV(csvRow);
    
    // Valider
    const validation = dataValidator.validate(mapped, 'artisan');

    expect(validation.isValid).toBe(true);
    expect(mapped.prenom).toBe('Jean');
    expect(mapped.nom).toBe('Dupont');
    expect(mapped.email).toBe('jean.dupont@example.com');
  });
});
