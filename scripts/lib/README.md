# Scripts - Librairies partagées

Ce dossier contient les utilitaires et clients partagés entre les différents scripts Node.js.

## 📦 Fichiers

### `supabase-client.js`
Client Supabase centralisé pour les scripts Node.js.

**Pourquoi ce fichier ?**
- Le client principal (`src/lib/supabase-client.ts`) est en TypeScript
- Les scripts Node.js sont en JavaScript
- Ce wrapper charge les variables d'environnement et exporte les clients

**Exports** :
```javascript
const { supabase, supabaseAdmin } = require('../lib/supabase-client');

// supabase : client avec clé anonyme (permissions limitées)
// supabaseAdmin : client avec service role key (permissions complètes)
```

**Utilisation** :
```javascript
const { supabaseAdmin } = require('../lib/supabase-client');

// Lire les données
const { data, error } = await supabaseAdmin
  .from('interventions')
  .select('*')
  .limit(10);
```

## ⚙️ Configuration

Les clients chargent automatiquement les variables d'environnement depuis `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🔐 Sécurité

- `supabase` : Utilise la clé anonyme (safe pour le frontend)
- `supabaseAdmin` : Utilise la service role key (bypass RLS, JAMAIS dans le frontend)

**⚠️  IMPORTANT** : Ne jamais exposer la `SUPABASE_SERVICE_ROLE_KEY` côté client !

## 📝 Ajouter d'autres utilitaires

Pour ajouter de nouveaux utilitaires partagés :

```javascript
// scripts/lib/logger.js
const chalk = require('chalk');

function success(message) {
  console.log(chalk.green('✅'), message);
}

function error(message) {
  console.error(chalk.red('❌'), message);
}

module.exports = { success, error };
```

Puis utiliser dans les scripts :
```javascript
const { success, error } = require('../lib/logger');

success('Import terminé !');
```

