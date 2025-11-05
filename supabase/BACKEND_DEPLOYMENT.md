# GMBS CRM - Backend Deployment Guide

This guide covers the deployment process for the GMBS CRM backend, including local development setup and database management.

## 🚀 Quick Start

### Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Docker Desktop running (for local Supabase)
- PostgreSQL client (optional, for direct database access)

### Local Development Setup

1. **Navigate to project directory**
   ```bash
   cd CRM_template/
   ```

2. **Start Supabase services**
   ```bash
   supabase start
   ```
   This will:
   - Start PostgreSQL database
   - Start Supabase API server
   - Start Supabase Studio (web interface)
   - Generate local environment variables

3. **Reset database (if needed)**
   ```bash
   supabase db reset
   ```
   This will:
   - Drop and recreate the database
   - Apply all migrations from `supabase/migrations/`
   - Run seed data from `supabase/seeds/`

4. **If not working**

   a. Try stopping supabase and start again
   ```bash
   supabase stop
   supabase start
   ```

   b. If conflict with docker containers 
      ```bash
      docker rm -f $(docker ps -a -q --filter "name=supabase_.*_CRM_template")
      ```
      ```powershell
      docker ps -a --filter "name=supabase_.*_CRM_template" -q | ForEach-Object { docker rm -f $_ }
      ```
      



## 📊 Database Management

### Schema Management
- **Migrations**: `supabase/migrations/`
- **Seed data**: `supabase/seeds/`

### Common Database Commands

```bash
# Apply schema changes
supabase db reset

# Run specific migration
supabase migration up

# Generate new migration
supabase migration new <migration_name>

# View database status
supabase status

# Stop Supabase services
supabase stop
```

### Seed Data
The project includes comprehensive mock data in `supabase/seeds/seed_mockup.sql`:
- 13 users (gestionnaires)
- 14 artisans across various trades
- 10 clients
- 20 interventions with full cost/payment tracking
- Sample tasks and conversations

## 🔧 Troubleshooting

### Common Issues

1. **Database connection errors**
   ```bash
   # Check if Supabase is running
   supabase status
   
   # Restart if needed
   supabase stop
   supabase start
   ```

2. **Schema conflicts**
   ```bash
   # Reset database completely
   supabase db reset
   ```

3. **Port conflicts**
   - Default ports: 54322 (PostgreSQL), 54321 (API)
   - Check if ports are available or change in `supabase/config.toml`

### Environment Variables
After running `supabase start`, you'll get local environment variables:
- `SUPABASE_URL`: http://localhost:54321
- `SUPABASE_ANON_KEY`: Your anonymous key
- `DATABASE_URL`: postgresql://postgres:postgres@localhost:54322/postgres

## 📁 Project Structure

```
CRM_template/
├── supabase/
│   ├── config.toml          # Supabase configuration
│   ├── schema/              # Database schema files
│   ├── migrations/          # Database migrations
│   ├── seeds/               # Seed data files
│   └── functions/           # Edge functions (if any)
├── BACKEND_DEPLOYMENT.md    # This file
└── README.md               # Project overview
```

## 🌐 Production Deployment

### Supabase Cloud
1. Create project at [supabase.com](https://supabase.com)
2. Link local project: `supabase link --project-ref <project-ref>`
3. Deploy: `supabase db push`

### Environment Setup
- Set production environment variables
- Configure RLS policies
- Set up authentication providers
- Configure storage buckets

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Schema Reference](./supabase/schema/)

---

**Need help?** Check the troubleshooting section or refer to the Supabase documentation for more detailed guidance.