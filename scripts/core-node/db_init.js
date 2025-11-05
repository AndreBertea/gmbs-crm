#!/usr/bin/env node
/**
 * db_init.js — Initialize database with clean schema
 * Usage: node scripts/db_init.js [--debug]
 *
 * This script initializes the database with tables from the migration file.
 * If tables already exist, it asks the user if they want to delete and recreate them.
 *
 * Use --debug flag to see detailed environment variable information.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Check for debug flag
const debugEnv = process.argv.includes("--debug");

// Load environment variables from .env files
const envLocalPath = path.join(__dirname, "..", "..", ".env.local");
const envPath = path.join(__dirname, "..", "..", ".env");

console.log("==> Loading environment variables...");
console.log(`   Checking: ${envLocalPath}`);
console.log(`   Checking: ${envPath}`);

// Load .env.local first (higher priority)
if (fs.existsSync(envLocalPath)) {
  console.log("   ✅ Found .env.local file");
  require("dotenv").config({ path: envLocalPath });
} else {
  console.log("   ⚠️  .env.local file not found");
}

// Load .env as fallback
if (fs.existsSync(envPath)) {
  console.log("   ✅ Found .env file");
  require("dotenv").config({ path: envPath });
} else {
  console.log("   ⚠️  .env file not found");
}

// Debug function to show environment variables
function debugEnvironmentVariables() {
  console.log("\n==> Environment Variables Debug Info");
  console.log("=====================================");

  const importantVars = [
    "SUPABASE_URL",
    "PGPASSWORD",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NODE_ENV",
    "GOOGLE_SHEETS_ARTISANS_ID",
    "GOOGLE_SHEETS_INTERVENTIONS_ID",
    "GOOGLE_CREDENTIALS_PATH",
    "OPENAI_API_KEY",
    "CREDITS_SECRET",
    "INITIAL_FREE_CENTS",
    "SUPABASE_ACCESS_TOKEN",
    "SERPAPI_API_KEY",
  ];

  console.log("Important environment variables:");
  importantVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values
      if (
        varName.includes("KEY") ||
        varName.includes("PASSWORD") ||
        varName.includes("SECRET") ||
        varName.includes("TOKEN")
      ) {
        const masked = value.length > 8 ? value.substring(0, 8) + "..." : "***";
        console.log(`   ${varName}: ${masked}`);
      } else {
        console.log(`   ${varName}: ${value}`);
      }
    } else {
      console.log(`   ${varName}: ❌ NOT SET`);
    }
  });

  console.log(
    "\nAll environment variables starting with DATABASE_, PG_, SUPABASE_:"
  );
  Object.keys(process.env)
    .filter(
      (key) =>
        key.startsWith("DATABASE_") ||
        key.startsWith("PG_") ||
        key.startsWith("SUPABASE_")
    )
    .forEach((key) => {
      const value = process.env[key];
      if (
        key.includes("KEY") ||
        key.includes("PASSWORD") ||
        key.includes("SECRET") ||
        key.includes("TOKEN")
      ) {
        const masked = value.length > 8 ? value.substring(0, 8) + "..." : "***";
        console.log(`   ${key}: ${masked}`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
}

// Cross-platform command execution
function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      stdio: "inherit",
      encoding: "utf8",
      ...options,
    });
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

// Check if command exists
function commandExists(command) {
  try {
    // Try with --help flag first (safer)
    execSync(`${command} --help`, { stdio: "ignore" });
    return true;
  } catch {
    try {
      // Fallback to just the command
      execSync(command, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

// Detect available psql command
function detectPsqlCommand() {
  // Only try standalone psql
  if (commandExists("psql")) {
    return "psql";
  }

  return null;
}

// Ask user for confirmation
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

// Check if tables exist in database
async function checkTablesExist(psqlCommand) {
  const DATABASE_URL =
    process.env.DATABASE_URL ||
    `postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

  try {
    const result = execSync(
      `${psqlCommand} "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'artisans', 'interventions');"`,
      {
        stdio: "pipe",
        encoding: "utf8",
      }
    );

    const count = parseInt(result.trim());
    return count > 0;
  } catch (error) {
    console.log("⚠️  Could not check existing tables, assuming clean database");
    return false;
  }
}

// Drop all tables
function dropAllTables(psqlCommand) {
  const DATABASE_URL =
    process.env.DATABASE_URL ||
    `postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

  console.log("   -> Dropping existing tables...");

  try {
    execSync(
      `${psqlCommand} "${DATABASE_URL}" -c "
        DO \$\$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \$\$;
      "`,
      {
        stdio: "pipe",
        encoding: "utf8",
      }
    );

    console.log("   ✅ Tables dropped successfully");
  } catch (error) {
    console.log("   ⚠️  Error dropping tables:", error.message);
    throw error;
  }
}

// Apply migration file
function applyMigration(psqlCommand) {
  const ROOT_DIR = path.resolve(__dirname, "..", "..");
  const migrationFile = path.join(
    ROOT_DIR,
    "supabase",
    "20251005_clean_schema.sql"
  );
  const DATABASE_URL =
    process.env.DATABASE_URL ||
    `postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Migration file not found: ${migrationFile}`);
  }

  console.log("   -> Applying migration file...");
  console.log(`   -> File: ${migrationFile}`);

  try {
    const env = { ...process.env };
    env.PGPASSWORD = env.PGPASSWORD || "postgres";

    execSync(
      `${psqlCommand} "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${migrationFile}"`,
      {
        stdio: "pipe",
        env,
      }
    );

    console.log("   ✅ Migration applied successfully");
  } catch (error) {
    console.log("   ❌ Error applying migration:", error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log("==> GMBS CRM Database Initialization");
  console.log("=====================================");

  // Show debug info if requested
  if (debugEnv) {
    debugEnvironmentVariables();
    console.log("\n");
  }

  // Show basic environment info
  console.log("==> Environment Configuration:");
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   Database URL: ${databaseUrl}`);
  console.log(
    `   PGPASSWORD: ${process.env.PGPASSWORD || "postgres (default)"}`
  );
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
  console.log("");

  // Detect available psql command
  console.log("==> Detecting PostgreSQL client...");

  // Debug: Try to run psql directly
  try {
    const testResult = execSync("psql --version", {
      stdio: "pipe",
      encoding: "utf8",
    });
    console.log(`   Debug: psql found - ${testResult.trim()}`);
  } catch (error) {
    console.log(`   Debug: psql not found - ${error.message}`);
  }

  const psqlCommand = detectPsqlCommand();

  if (!psqlCommand) {
    console.error("❌ PostgreSQL client (psql) not found.");
    console.error("");
    console.error("Please install PostgreSQL client tools:");
    console.error(
      "1. Windows: Download from https://www.postgresql.org/download/windows/"
    );
    console.error("2. macOS: brew install postgresql");
    console.error(
      "3. Linux: sudo apt-get install postgresql-client (Ubuntu/Debian)"
    );
    console.error("");
    console.error("Make sure psql is in your PATH after installation.");
    process.exit(1);
  }

  console.log(`✅ Found PostgreSQL client: ${psqlCommand}`);

  // Check if Supabase CLI is available and start it
  if (
    commandExists("supabase") &&
    fs.existsSync(path.join(__dirname, "..", "supabase"))
  ) {
    console.log("==> Starting local Supabase (if not already running)");
    execCommand("supabase start", { allowFailure: true });
  }

  try {
    // Check if tables already exist
    console.log("==> Checking existing database...");
    const tablesExist = await checkTablesExist(psqlCommand);

    if (tablesExist) {
      console.log("⚠️  Database tables already exist!");
      const shouldRecreate = await askConfirmation(
        "Do you want to delete existing tables and recreate them? (y/N): "
      );

      if (!shouldRecreate) {
        console.log("❌ Operation cancelled by user");
        process.exit(0);
      }

      dropAllTables(psqlCommand);
    } else {
      console.log("✅ Database is clean, proceeding with initialization");
    }

    // Apply migration
    console.log("==> Initializing database with clean schema...");
    applyMigration(psqlCommand);

    console.log("");
    console.log("✅ Database initialization completed successfully!");
    console.log("");
    console.log("Next steps:");
    console.log('1. Run "node scripts/db_seed.js" to add basic data');
    console.log(
      '2. Run "node scripts/db_seed.js --mockup" to add fake data for testing'
    );
    console.log("");
    console.log("Environment variables loaded successfully!");
    console.log(`   Supabase running at: ${supabaseUrl}`);
    console.log(`   Database accessible at: ${databaseUrl}`);
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    process.exit(1);
  }
}

// Run main function
main().catch(console.error);
