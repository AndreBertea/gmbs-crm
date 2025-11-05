// ===== OPTIMISATIONS DE NAVIGATION =====
// Améliore la fluidité de navigation avec du cache et des transitions

import { createContext, ReactNode, useContext } from 'react';

// Cache global pour les données
const navigationCache = new Map<string, any>();

interface NavigationContextType {
  cache: Map<string, any>;
  setCache: (key: string, value: any) => void;
  getCache: (key: string) => any;
  clearCache: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const setCache = (key: string, value: any) => {
    navigationCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });
  };

  const getCache = (key: string) => {
    const cached = navigationCache.get(key);
    if (!cached) return null;
    
    // Vérifier si le cache est expiré
    if (Date.now() - cached.timestamp > cached.ttl) {
      navigationCache.delete(key);
      return null;
    }
    
    return cached.data;
  };

  const clearCache = () => {
    navigationCache.clear();
  };

  return (
    <NavigationContext.Provider value={{ cache: navigationCache, setCache, getCache, clearCache }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationCache() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationCache must be used within NavigationProvider');
  }
  return context;
}
