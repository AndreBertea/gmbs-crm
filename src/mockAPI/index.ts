// Mock API - Point d'entrée principal
// Simule les endpoints API du CRM GMBS V2

import { mockUsers, getUserById, getUserByUsername, getUsersByRole, getActiveUsers, type User } from './users';
import { mockArtisans, getArtisanById, getArtisansByMetier, getArtisansByZone, getActiveArtisans, getArtisansByStatut, type Artisan } from './artisans';
import { 
  mockInterventions, 
  getInterventionById, 
  getInterventionsByStatut, 
  getInterventionsByAgence, 
  getInterventionsByArtisan, 
  getInterventionsByUser, 
  getInterventionsByDateRange, 
  getInterventionsByMetier,
  INTERVENTION_STATUS,
  INTERVENTION_METIERS,
  type Intervention 
} from './interventions';

// Types d'export
export type { User, Artisan, Intervention };

// Données mockées
export { 
  mockUsers, 
  mockArtisans, 
  mockInterventions,
  INTERVENTION_STATUS,
  INTERVENTION_METIERS
};

// Fonctions utilitaires
export {
  // Users
  getUserById,
  getUserByUsername,
  getUsersByRole,
  getActiveUsers,
  
  // Artisans
  getArtisanById,
  getArtisansByMetier,
  getArtisansByZone,
  getActiveArtisans,
  getArtisansByStatut,
  
  // Interventions
  getInterventionById,
  getInterventionsByStatut,
  getInterventionsByAgence,
  getInterventionsByArtisan,
  getInterventionsByUser,
  getInterventionsByDateRange,
  getInterventionsByMetier
};

// Simulateur d'API REST
export class MockAPI {
  
  // === USERS ENDPOINTS ===
  static async getUsers(): Promise<User[]> {
    // Simule un délai réseau
    await this.delay(100);
    return getActiveUsers();
  }
  
  static async getUserById(id: string): Promise<User | null> {
    await this.delay(50);
    return getUserById(id) || null;
  }
  
  static async getUserByUsername(username: string): Promise<User | null> {
    await this.delay(50);
    return getUserByUsername(username) || null;
  }
  
  static async getUsersByRole(role: string): Promise<User[]> {
    await this.delay(100);
    return getUsersByRole(role);
  }
  
  // === ARTISANS ENDPOINTS ===
  static async getArtisans(): Promise<Artisan[]> {
    await this.delay(150);
    return getActiveArtisans();
  }
  
  static async getArtisanById(id: string): Promise<Artisan | null> {
    await this.delay(50);
    return getArtisanById(id) || null;
  }
  
  static async getArtisansByMetier(metier: string): Promise<Artisan[]> {
    await this.delay(100);
    return getArtisansByMetier(metier);
  }
  
  static async getArtisansByZone(zone: number): Promise<Artisan[]> {
    await this.delay(100);
    return getArtisansByZone(zone);
  }
  
  static async getArtisansByStatut(statut: string): Promise<Artisan[]> {
    await this.delay(100);
    return getArtisansByStatut(statut);
  }
  
  // === INTERVENTIONS ENDPOINTS ===
  static async getInterventions(): Promise<Intervention[]> {
    await this.delay(200);
    return mockInterventions;
  }
  
  static async getInterventionById(id: string): Promise<Intervention | null> {
    await this.delay(50);
    return getInterventionById(id) || null;
  }
  
  static async getInterventionsByStatut(statut: string): Promise<Intervention[]> {
    await this.delay(100);
    return getInterventionsByStatut(statut);
  }
  
  static async getInterventionsByAgence(agence: string): Promise<Intervention[]> {
    await this.delay(100);
    return getInterventionsByAgence(agence);
  }
  
  static async getInterventionsByArtisan(artisanId: string): Promise<Intervention[]> {
    await this.delay(100);
    return getInterventionsByArtisan(artisanId);
  }
  
  static async getInterventionsByUser(userId: string): Promise<Intervention[]> {
    await this.delay(100);
    return getInterventionsByUser(userId);
  }
  
  static async getInterventionsByDateRange(startDate: string, endDate: string): Promise<Intervention[]> {
    await this.delay(150);
    return getInterventionsByDateRange(startDate, endDate);
  }
  
  static async getInterventionsByMetier(metier: string): Promise<Intervention[]> {
    await this.delay(100);
    return getInterventionsByMetier(metier);
  }
  
  // === DASHBOARD ENDPOINTS ===
  static async getDashboardStats(): Promise<{
    totalInterventions: number;
    interventionsEnCours: number;
    interventionsTerminees: number;
    totalArtisans: number;
    totalUsers: number;
    interventionsParStatut: Record<string, number>;
    interventionsParMetier: Record<string, number>;
  }> {
    await this.delay(300);
    
    const interventions = mockInterventions;
    const artisans = getActiveArtisans();
    const users = getActiveUsers();
    
    // Calcul des statistiques
    const interventionsParStatut: Record<string, number> = {};
    const interventionsParMetier: Record<string, number> = {};
    
    INTERVENTION_STATUS.forEach(statut => {
      interventionsParStatut[statut] = getInterventionsByStatut(statut).length;
    });
    
    INTERVENTION_METIERS.forEach(metier => {
      interventionsParMetier[metier] = getInterventionsByMetier(metier).length;
    });
    
    return {
      totalInterventions: interventions.length,
      interventionsEnCours: getInterventionsByStatut('En_cours').length,
      interventionsTerminees: getInterventionsByStatut('Terminé').length,
      totalArtisans: artisans.length,
      totalUsers: users.length,
      interventionsParStatut,
      interventionsParMetier
    };
  }
  
  // === SEARCH ENDPOINTS ===
  static async searchInterventions(query: string): Promise<Intervention[]> {
    await this.delay(200);
    
    const searchTerm = query.toLowerCase();
    return mockInterventions.filter(intervention => 
      intervention.contexteIntervention.toLowerCase().includes(searchTerm) ||
      intervention.adresse.toLowerCase().includes(searchTerm) ||
      intervention.ville.toLowerCase().includes(searchTerm) ||
      intervention.prenomProprietaire?.toLowerCase().includes(searchTerm) ||
      intervention.nomProprietaire?.toLowerCase().includes(searchTerm) ||
      intervention.prenomClient?.toLowerCase().includes(searchTerm) ||
      intervention.nomClient?.toLowerCase().includes(searchTerm)
    );
  }
  
  static async searchArtisans(query: string): Promise<Artisan[]> {
    await this.delay(150);
    
    const searchTerm = query.toLowerCase();
    return mockArtisans.filter(artisan => 
      artisan.prenom.toLowerCase().includes(searchTerm) ||
      artisan.nom.toLowerCase().includes(searchTerm) ||
      artisan.raisonSociale.toLowerCase().includes(searchTerm) ||
      artisan.metiers.some(metier => metier.toLowerCase().includes(searchTerm))
    );
  }
  
  // === UTILITAIRES ===
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export par défaut
export default MockAPI;
