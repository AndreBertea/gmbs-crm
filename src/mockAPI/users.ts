// Mock API - Users
// Basé sur le modèle legacy User du CRM GMBS

export interface User {
  id: string;
  name: string;
  prenom: string;
  username: string;
  email: string;
  roles: string[];
  tokenVersion: number;
  color: string;
  deleteDate?: string;
}

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Bertea",
    prenom: "Andre",
    username: "andre.bertea",
    email: "andre.bertea@gmbs.fr",
    roles: ["admin"],
    tokenVersion: 1,
    color: "#3b82f6"
  },
  {
    id: "2",
    name: "Dupont",
    prenom: "Marie",
    username: "marie.dupont",
    email: "marie.dupont@gmbs.fr",
    roles: ["manager"],
    tokenVersion: 1,
    color: "#10b981"
  },
  {
    id: "3",
    name: "Martin",
    prenom: "Pierre",
    username: "pierre.martin",
    email: "pierre.martin@gmbs.fr",
    roles: ["user"],
    tokenVersion: 1,
    color: "#f59e0b"
  },
  {
    id: "4",
    name: "Leroy",
    prenom: "Sophie",
    username: "sophie.leroy",
    email: "sophie.leroy@gmbs.fr",
    roles: ["user"],
    tokenVersion: 1,
    color: "#8b5cf6"
  },
  {
    id: "5",
    name: "Moreau",
    prenom: "Thomas",
    username: "thomas.moreau",
    email: "thomas.moreau@gmbs.fr",
    roles: ["read-only"],
    tokenVersion: 1,
    color: "#ef4444"
  }
];

// Fonctions utilitaires pour les utilisateurs
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find(user => user.id === id);
};

export const getUserByUsername = (username: string): User | undefined => {
  return mockUsers.find(user => user.username === username);
};

export const getUsersByRole = (role: string): User[] => {
  return mockUsers.filter(user => user.roles.includes(role));
};

export const getActiveUsers = (): User[] => {
  return mockUsers.filter(user => !user.deleteDate);
};
