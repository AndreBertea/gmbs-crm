// ===== CONFIGURATION D'ENVIRONNEMENT POUR NEXT.JS =====
// Compatible avec le côté client et serveur

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NODE_ENV: string;
}

export const env: EnvConfig = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export function logEnvironmentConfig() {
  console.log('🔧 Configuration d\'environnement chargée:');
  console.log(`  SUPABASE_URL: ${env.SUPABASE_URL}`);
  console.log(`  SUPABASE_ANON_KEY: ${env.SUPABASE_ANON_KEY ? '✅ Définie' : '❌ Non définie'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Définie' : '❌ Non définie'}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
}

// Export par défaut
export default env;