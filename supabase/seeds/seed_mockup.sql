-- ========================================
-- 📊 DATA OVERVIEW
-- ========================================
-- 
-- This comprehensive seed file now includes:
-- 
-- 👥 USERS: 13 gestionnaires with different roles and colors
-- 🏗️ ARTISANS: 14 artisans across various trades and statuses
-- 👤 CLIENTS: 10 clients with complete contact information
-- 🔧 INTERVENTIONS: 50 interventions covering all statuses, all agencies, and all trades
-- 🔗 INTERVENTION_ARTISANS: 35+ artisan assignments (primary/secondary)
-- 💰 INTERVENTION_COSTS: 80+ cost entries (SST, materials, labor, totals)
-- 💳 INTERVENTION_PAYMENTS: 40+ payment records (advances, finals)
-- 📎 INTERVENTION_ATTACHMENTS: 50+ documents (devis, photos, invoices, reports)
-- ✅ TASKS: 3 sample tasks linked to interventions
-- 💬 CONVERSATIONS: 2 sample conversations
-- 
-- All data is properly linked with foreign key relationships
-- and includes realistic scenarios across different intervention statuses:
-- - DEMANDE, ACCEPTE, DEVIS_ENVOYE, INTER_EN_COURS, INTER_TERMINEE
-- - VISITE_TECHNIQUE, ATT_ACOMPTE, ANNULE, REFUSE, STAND_BY
-- 
-- Cost breakdowns include SST costs, materials, labor, and totals
-- Payment tracking includes both advances and final payments
-- Attachments cover all document types: devis, photos, invoices, reports
-- 
-- ========================================
-- ========================================
-- GMBS CRM - Mockup Data for Development
-- ========================================
-- This file contains sample data for development and testing
-- Use this when Google Sheets import is not available
-- Date: 2025-01-01

-- ========================================
-- 1️⃣ USERS (GESTIONNAIRES)
-- ========================================
-- Using fixed UUIDs to match auth.users created in seed_admin_auth.sql

INSERT INTO public.users (
  id, username, email, firstname, lastname, color, code_gestionnaire, status, token_version, last_seen_at, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@gmbs.fr', 'Development', 'Admin', '#FF0000', 'ADMIN', 'offline', 0, NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000013', 'badr', 'badr@gmbs.fr', 'Boujimal', 'Badr', '#FF6B6B', 'B', 'offline', 0, '2025-10-04 15:30:00+02', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'andrea', 'andrea@gmbs.fr', 'GAUTRET', 'Andrea', '#C5E0F4', 'A', 'offline', 0, '2025-10-04 15:30:00+02', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'olivier', 'olivier@gmbs.fr', 'Gestionnaire', 'Olivier', '#A22116', 'O', 'offline', 0, NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'tom', 'tom@gmbs.fr', 'Birckel', 'Tom', '#A22116', 'T', 'offline', 0, NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', 'paul', 'paul@gmbs.fr', 'Aguenana', 'Paul', '#EBF551', 'P', 'offline', 0, '2025-10-03 10:00:00+02', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000006', 'louis', 'louis@gmbs.fr', 'Saune', 'Louis', '#69D9E5', 'J', 'offline', 0, NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000007', 'samuel', 'samuel@gmbs.fr', 's', 'Samuel', '#543481', 'S', 'offline', 0, '2025-10-02 14:45:00+02', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000008', 'lucien', 'lucien@gmbs.fr', 'L', 'Lucien', '#35714E', 'L', 'offline', 0, NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000009', 'killian', 'killian@gmbs.fr', 'K', 'Killian', '#1227A1', 'K', 'offline', 0, '2025-10-01 09:20:00+02', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000010', 'dimitri', 'dimitri@gmbs.fr', 'Montanari', 'Dimitri', '#FBE6A8', 'D', 'offline', 0, NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000011', 'soulaimane', 'soulaimane@gmbs.fr', 'Soulaimane', 'Soulaimane', '#FF6B6B', 'SO', 'offline', 0, '2025-09-30 16:10:00+02', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000012', 'clement', 'clement@gmbs.fr', 'Clément', 'Clément', '#4ECDC4', 'C', 'offline', 0, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  firstname = EXCLUDED.firstname,
  lastname = EXCLUDED.lastname,
  color = EXCLUDED.color,
  code_gestionnaire = EXCLUDED.code_gestionnaire,
  updated_at = NOW();


-- Insert default métiers
INSERT INTO public.metiers (code, label, description) VALUES 
('AUTRES', 'AUTRES', 'Autres métiers'),
('BRICOLAGE', 'BRICOLAGE', 'Bricolage et petits travaux'),
('CAMION', 'CAMION', 'Services de camion'),
('CHAUFFAGE', 'CHAUFFAGE', 'Installation et réparation chauffage'),
('CLIMATISATION', 'CLIMATISATION', 'Climatisation et ventilation'),
('ELECTRICITE', 'ELECTRICITE', 'Électricité générale'),
('JARDINAGE', 'JARDINAGE', 'Jardinage et espaces verts'),
('MENUISIER', 'MENUISIER', 'Menuiserie et ébénisterie'),
('MULTI-SERVICE', 'Multi-Service', 'Services multiples'),
('MENAGE', 'MÉNAGE', 'Services de ménage'),
('NUISIBLE', 'NUISIBLE', 'Lutte contre les nuisibles'),
('PEINTURE', 'PEINTURE', 'Peinture et décoration'),
('PLOMBERIE', 'PLOMBERIE', 'Plomberie générale'),
('RDF', 'RDF', 'Réparation de défauts'),
('RENOVATION', 'RENOVATION', 'Rénovation générale'),
('SERRURERIE', 'SERRURERIE', 'Serrurerie et sécurité'),
('VITRERIE', 'VITRERIE', 'Vitrerie et miroiterie'),
('VOLET-STORE', 'Volet/Store', 'Volets et stores')
ON CONFLICT (code) DO NOTHING;

-- Insert default zones
INSERT INTO public.zones (code, label, region) VALUES 
('PARIS', 'Paris', 'Île-de-France'),
('LYON', 'Lyon', 'Auvergne-Rhône-Alpes'),
('MARSEILLE', 'Marseille', 'Provence-Alpes-Côte d''Azur'),
('TOULOUSE', 'Toulouse', 'Occitanie'),
('NICE', 'Nice', 'Provence-Alpes-Côte d''Azur'),
('NANTES', 'Nantes', 'Pays de la Loire'),
('STRASBOURG', 'Strasbourg', 'Grand Est'),
('MONTPELLIER', 'Montpellier', 'Occitanie'),
('BORDEAUX', 'Bordeaux', 'Nouvelle-Aquitaine'),
('LILLE', 'Lille', 'Hauts-de-France')
ON CONFLICT (code) DO NOTHING;

-- Insert default artisan statuses
INSERT INTO public.artisan_statuses (code, label, color, sort_order) VALUES 
('CANDIDAT', 'Candidat', '#A855F7', 1),
('ONE_SHOT', 'One Shot', '#F97316', 2),
('POTENTIEL', 'Potentiel', '#FACC15', 3),
('NOVICE', 'Novice', '#60A5FA', 4),
('FORMATION', 'Formation', '#38BDF8', 5),
('CONFIRME', 'Confirmé', '#22C55E', 6),
('EXPERT', 'Expert', '#6366F1', 7),
('INACTIF', 'Inactif', '#EF4444', 8),
('ARCHIVE', 'Archivé', '#6B7280', 9)
ON CONFLICT (code) DO NOTHING;

-- Insert default intervention statuses
INSERT INTO public.intervention_statuses (code, label, color, sort_order) VALUES 
('DEMANDE', 'Demandé', '#3B82F6', 1),
('ACCEPTE', 'Accepté', '#10B981', 2),
('DEVIS_ENVOYE', 'Devis Envoyé', '#8B5CF6', 3),
('INTER_EN_COURS', 'Inter en cours', '#F59E0B', 4),
('INTER_TERMINEE', 'Inter terminée', '#10B981', 5),
('VISITE_TECHNIQUE', 'Visite Technique', '#06B6D4', 6),
('ATT_ACOMPTE', 'Att Acompte', '#F97316', 7),
('ANNULE', 'Annulé', '#EF4444', 8),
('REFUSE', 'Refusé', '#EF4444', 9),
('STAND_BY', 'Stand by', '#6B7280', 10)
ON CONFLICT (code) DO NOTHING;

-- Insert default task statuses
INSERT INTO public.task_statuses (code, label, color, sort_order) VALUES 
('TODO', 'À faire', '#3B82F6', 1),
('DOING', 'En cours', '#F59E0B', 2),
('DONE', 'Terminé', '#10B981', 3),
('CANCELLED', 'Annulé', '#EF4444', 4)
ON CONFLICT (code) DO NOTHING;

-- Insert default agences
INSERT INTO public.agencies (code, label, region) VALUES 
('OQORO', 'Oqoro', 'Île-de-France'),
('IMODIRECT', 'ImoDirect', 'Île-de-France'),
('FLATLOOKER', 'Flatlooker', 'Île-de-France'),
('AFEDIM', 'AFEDIM', 'Île-de-France'),
('HOMEPILOT', 'HomePilot', 'Île-de-France')
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 2️⃣ ARTISANS (SAMPLE DATA)
-- ========================================

INSERT INTO public.artisans (
  id, prenom, nom, email, plain_nom, telephone, telephone2, raison_sociale, siret, statut_juridique,
  adresse_siege_social, ville_siege_social, code_postal_siege_social,
  adresse_intervention, ville_intervention, code_postal_intervention,
  intervention_latitude, intervention_longitude, numero_associe,
  gestionnaire_id, statut_id, suivi_relances_docs, date_ajout, is_active, created_at, updated_at
) VALUES
  (uuid_generate_v4(), 'Luc', 'Moreau', 'luc.moreau@example.com','',  '06 12 34 56 78', NULL, 'MOREAU PLOMBERIE', '90123456700011', 'AUTO ENTREPRENEUR', '12 Rue des Lilas', 'NANTES', '44000', '12 Rue des Lilas', 'NANTES', '44000', 47.218371, -1.553621, '101', (SELECT id FROM public.users WHERE username = 'olivier'), (SELECT id FROM public.artisan_statuses WHERE code = 'CONFIRME'), NULL, '2025-09-01', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Sophie', 'Lefèvre', 'sophie.lefevre@example.com', '','07 23 45 67 89', '02 40 12 34 56', 'LEFÈVRE ÉLECTRICITÉ', '90234567800012', 'SARL', '25 Boulevard Victor Hugo', 'MARSEILLE', '13001', '30 Rue de la Mer', 'MARSEILLE', '13007', 43.296482, 5.369780, '102', (SELECT id FROM public.users WHERE username = 'badr'), (SELECT id FROM public.artisan_statuses WHERE code = 'POTENTIEL'), 'En attente de KBIS', '2025-08-15', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Pierre', 'Dubois', 'pierre.dubois@example.com', '','06 98 76 54 32', NULL, 'DUBOIS MAÇONNERIE', '90345678900013', 'EIRL', '8 Avenue de la République', 'TOULOUSE', '31000', '8 Avenue de la République', 'TOULOUSE', '31000', 43.604652, 1.444209, '103', (SELECT id FROM public.users WHERE username = 'andrea'), (SELECT id FROM public.artisan_statuses WHERE code = 'INACTIF'), NULL, '2025-07-20', false, NOW(), NOW()),
  (uuid_generate_v4(), 'Claire', 'Roux', 'claire.roux@example.com', '', '07 11 22 33 44', NULL, 'ROUX PEINTURE', '90456789000014', 'AUTO ENTREPRENEUR', '14 Rue des Roses', 'LILLE', '59000', '20 Rue du Faubourg', 'LILLE', '59000', 50.629250, 3.057256, '104', (SELECT id FROM public.users WHERE username = 'tom'), (SELECT id FROM public.artisan_statuses WHERE code = 'CONFIRME'), 'Relance envoyée le 01/10/2025', '2025-06-10', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Julien', 'Girard', 'julien.girard@example.com', '', '06 45 67 89 01', '03 20 12 34 56', 'GIRARD MENUISERIE', '90567890100015', 'SARL', '7 Place de la Liberté', 'BORDEAUX', '33000', '7 Place de la Liberté', 'BORDEAUX', '33000', 44.837789, -0.579180, '105', (SELECT id FROM public.users WHERE username = 'paul'), (SELECT id FROM public.artisan_statuses WHERE code = 'ARCHIVE'), NULL, '2025-05-05', false, NOW(), NOW()),
  (uuid_generate_v4(), 'Émilie', 'Petit', 'emilie.petit@example.com', '','07 56 78 90 12', NULL, 'PETIT COUVERTURE', '90678901200016', 'EURL', '3 Rue du Moulin', 'RENNES', '35000', '10 Rue des Champs', 'RENNES', '35000', 48.117266, -1.677793, '106', (SELECT id FROM public.users WHERE username = 'louis'), (SELECT id FROM public.artisan_statuses WHERE code = 'POTENTIEL'), 'Documents partiels reçus', '2025-04-12', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Antoine', 'Lemoine', 'antoine.lemoine@example.com', '', '06 23 45 67 89', NULL, 'LEMOINE SERRURERIE', '90789012300017', 'AUTO ENTREPRENEUR', '19 Avenue Jean Jaurès', 'NICE', '06000', '19 Avenue Jean Jaurès', 'NICE', '06000', 43.703134, 7.266083, '107', (SELECT id FROM public.users WHERE username = 'samuel'), (SELECT id FROM public.artisan_statuses WHERE code = 'CONFIRME'), NULL, '2025-03-25', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Nathalie', 'Caron', 'nathalie.caron@example.com', '','07 34 56 78 90', NULL, 'CARON PLÂTRERIE', '90890123400018', 'SARL', '22 Rue de Verdun', 'STRASBOURG', '67000', '15 Rue des Vosges', 'STRASBOURG', '67000', 48.573405, 7.752111, '108', (SELECT id FROM public.users WHERE username = 'lucien'), (SELECT id FROM public.artisan_statuses WHERE code = 'INACTIF'), 'Relance prévue', '2025-02-28', false, NOW(), NOW()),
  (uuid_generate_v4(), 'Thomas', 'Garnier', 'thomas.garnier@example.com', '','06 67 89 01 23', '04 91 23 45 67', 'GARNIER CHAUFFAGE', '90901234500019', 'EIRL', '5 Boulevard des Dames', 'MARSEILLE', '13002', '5 Boulevard des Dames', 'MARSEILLE', '13002', 43.296482, 5.369780, '109', (SELECT id FROM public.users WHERE username = 'killian'), (SELECT id FROM public.artisan_statuses WHERE code = 'CONFIRME'), NULL, '2025-01-15', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Laura', 'Bertrand', 'laura.bertrand@example.com', '','07 78 90 12 34', NULL, 'BERTRAND JARDINAGE', '91012345600020', 'AUTO ENTREPRENEUR', '9 Rue de la Gare', 'TOULON', '83000', '12 Rue du Port', 'TOULON', '83000', 43.124228, 5.930492, '110', (SELECT id FROM public.users WHERE username = 'dimitri'), (SELECT id FROM public.artisan_statuses WHERE code = 'POTENTIEL'), 'Attente de RIB', '2024-12-20', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Mathieu', 'Simon', 'mathieu.simon@example.com', '','06 89 01 23 45', NULL, 'SIMON ÉLECTRICITÉ', '91123456700021', 'SARL', '18 Rue du Général Leclerc', 'DIJON', '21000', '18 Rue du Général Leclerc', 'DIJON', '21000', 47.322047, 5.041480, '111', (SELECT id FROM public.users WHERE username = 'soulaimane'), (SELECT id FROM public.artisan_statuses WHERE code = 'CONFIRME'), NULL, '2024-11-10', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Camille', 'Dumas', 'camille.dumas@example.com', '','07 90 12 34 56', NULL, 'DUMAS CARRELAGE', '91234567800022', 'EURL', '4 Place du Marché', 'ANGERS', '49000', '10 Rue des Artisans', 'ANGERS', '49000', 47.471162, -0.551826, '112', (SELECT id FROM public.users WHERE username = 'clement'), (SELECT id FROM public.artisan_statuses WHERE code = 'ARCHIVE'), NULL, '2024-10-05', false, NOW(), NOW()),
  (uuid_generate_v4(), 'François', 'Lacroix', 'francois.lacroix@example.com','', '06 01 23 45 67', NULL, 'LACROIX BÂTIMENT', '91345678900023', 'SARL', '30 Avenue de la Libération', 'LIMOGES', '87000', '30 Avenue de la Libération', 'LIMOGES', '87000', 45.833619, 1.261105, '113', (SELECT id FROM public.users WHERE username = 'olivier'), (SELECT id FROM public.artisan_statuses WHERE code = 'CONFIRME'), 'Documents complets', '2024-09-15', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Amandine', 'Leroy', 'amandine.leroy@example.com', '','07 12 34 56 78', '05 49 12 34 56', 'LEROY DÉCORATION', '91456789000024', 'AUTO ENTREPRENEUR', '6 Rue des Écoles', 'POITIERS', '86000', '6 Rue des Écoles', 'POITIERS', '86000', 46.580224, 0.340375, '114', (SELECT id FROM public.users WHERE username = 'badr'), (SELECT id FROM public.artisan_statuses WHERE code = 'POTENTIEL'), 'Relance envoyée le 30/09/2025', '2024-08-20', true, NOW(), NOW())
ON CONFLICT (siret) DO NOTHING;



-- ========================================
-- 4️⃣ ASSOCIATIONS ARTISANS-MÉTIERS
-- ========================================

INSERT INTO public.artisan_metiers (
  id, artisan_id, metier_id, is_primary, created_at
) VALUES
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'luc.moreau@example.com'), (SELECT id FROM public.metiers WHERE code = 'PLOMBERIE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'sophie.lefevre@example.com'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'pierre.dubois@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'pierre.dubois@example.com'), (SELECT id FROM public.metiers WHERE code = 'MULTI_SERVICE'), false, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'claire.roux@example.com'), (SELECT id FROM public.metiers WHERE code = 'PEINTURE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'julien.girard@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'emilie.petit@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'emilie.petit@example.com'), (SELECT id FROM public.metiers WHERE code = 'MULTI_SERVICE'), false, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'antoine.lemoine@example.com'), (SELECT id FROM public.metiers WHERE code = 'SERRURERIE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'nathalie.caron@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'thomas.garnier@example.com'), (SELECT id FROM public.metiers WHERE code = 'PLOMBERIE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'thomas.garnier@example.com'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'), false, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'laura.bertrand@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'mathieu.simon@example.com'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'mathieu.simon@example.com'), (SELECT id FROM public.metiers WHERE code = 'MULTI_SERVICE'), false, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'camille.dumas@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'francois.lacroix@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'francois.lacroix@example.com'), (SELECT id FROM public.metiers WHERE code = 'PEINTURE'), false, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'francois.lacroix@example.com'), (SELECT id FROM public.metiers WHERE code = 'MULTI_SERVICE'), false, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'amandine.leroy@example.com'), (SELECT id FROM public.metiers WHERE code = 'PEINTURE'), true, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.artisans WHERE email = 'amandine.leroy@example.com'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'), false, NOW())
ON CONFLICT (artisan_id, metier_id) DO NOTHING;

-- ========================================
-- 0️⃣ TENANTS ET OWNERS (Locataires et Propriétaires)
-- ========================================

-- Tenants (Locataires)
INSERT INTO public.tenants (
  id, external_ref, firstname, lastname, email, telephone, telephone2, 
  adresse, ville, code_postal, created_at, updated_at
) VALUES
  (uuid_generate_v4(), 'TEN-2025-001', 'Marie', 'Dupont', 'marie.dupont@example.fr', '06 12 34 56 78', NULL, '15 Rue de la Paix', 'PARIS', '75001', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-002', 'Jean', 'Martin', 'jean.martin@example.fr', '07 23 45 67 89', '01 23 45 67 89', '25 Boulevard Victor Hugo', 'MARSEILLE', '13001', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-003', 'Sophie', 'Bernard', 'sophie.bernard@example.fr', '06 98 76 54 32', NULL, '8 Avenue de la République', 'TOULOUSE', '31000', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-004', 'Pierre', 'Leroy', 'pierre.leroy@example.fr', '07 11 22 33 44', '03 20 12 34 56', '14 Rue des Roses', 'LILLE', '59000', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-005', 'Claire', 'Moreau', 'claire.moreau@example.fr', '06 45 67 89 01', NULL, '7 Place de la Liberté', 'BORDEAUX', '33000', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-006', 'Luc', 'Roux', 'luc.roux@example.fr', '07 56 78 90 12', NULL, '3 Rue du Moulin', 'RENNES', '35000', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-007', 'Émilie', 'Girard', 'emilie.girard@example.fr', '06 23 45 67 89', '04 91 23 45 67', '19 Avenue Jean Jaurès', 'NICE', '06000', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-008', 'Antoine', 'Caron', 'antoine.caron@example.fr', '07 34 56 78 90', NULL, '22 Rue de Verdun', 'STRASBOURG', '67000', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-009', 'Nathalie', 'Lemoine', 'nathalie.lemoine@example.fr', '06 67 89 01 23', NULL, '5 Boulevard des Dames', 'MARSEILLE', '13002', NOW(), NOW()),
  (uuid_generate_v4(), 'TEN-2025-010', 'Thomas', 'Petit', 'thomas.petit@example.fr', '07 78 90 12 34', '05 61 12 34 56', '9 Rue de la Gare', 'TOULON', '83000', NOW(), NOW())
ON CONFLICT (external_ref) DO NOTHING;

-- Owners (Propriétaires)
INSERT INTO public.owner (
  id, external_ref, owner_firstname, owner_lastname, telephone, telephone2, 
  adresse, ville, code_postal, created_at, updated_at
) VALUES
  (uuid_generate_v4(), 'OWN-2025-001', 'Robert', 'Dubois', '06 11 22 33 44', NULL, '10 Avenue Foch', 'PARIS', '75008', NOW(), NOW()),
  (uuid_generate_v4(), 'OWN-2025-002', 'Catherine', 'Laurent', '07 22 33 44 55', '01 45 67 89 01', '5 Rue de la République', 'LYON', '69001', NOW(), NOW()),
  (uuid_generate_v4(), 'OWN-2025-003', 'Michel', 'Simon', '06 33 44 55 66', NULL, '12 Boulevard Haussmann', 'PARIS', '75009', NOW(), NOW()),
  (uuid_generate_v4(), 'OWN-2025-004', 'Isabelle', 'Lefebvre', '07 44 55 66 77', NULL, '8 Place Bellecour', 'LYON', '69002', NOW(), NOW()),
  (uuid_generate_v4(), 'OWN-2025-005', 'François', 'Mercier', '06 55 66 77 88', '04 91 12 34 56', '20 Cours Mirabeau', 'AIX-EN-PROVENCE', '13100', NOW(), NOW())
ON CONFLICT (external_ref) DO NOTHING;

-- ========================================
-- 5️⃣ INTERVENTIONS (COMPREHENSIVE SAMPLE DATA)
-- ========================================

INSERT INTO public.interventions (
  id, id_inter, agence_id, tenant_id, owner_id, assigned_user_id, statut_id, metier_id,
  date, date_termine, date_prevue, due_date,
  contexte_intervention, consigne_intervention, consigne_second_artisan, commentaire_agent,
  adresse, code_postal, ville, latitude, longitude,
  is_active, created_at, updated_at
) VALUES
  (uuid_generate_v4(), 'INT-2025-001', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-001'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'olivier'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEMANDE'), (SELECT id FROM public.metiers WHERE code = 'PLOMBERIE'),
   '2025-01-15 09:00:00+01', NULL, '2025-01-15 10:00:00+01', '2025-01-20 17:00:00+01',
   'Fuite d''eau dans la cuisine après travaux récents.', 'Vérifier les joints et remplacer si nécessaire. Utiliser pièces de rechange fournies.', 'Assister pour le démontage si besoin.', 'Urgent, client âgé.',
   '12 Rue de Rivoli', '75001', 'PARIS', 48.856614, 2.352221,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-002', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-002'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'badr'), (SELECT id FROM public.intervention_statuses WHERE code = 'ACCEPTE'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'),
   '2025-01-20 14:00:00+01', NULL, '2025-01-20 15:00:00+01', '2025-01-25 17:00:00+01',
   'Problème de tableau électrique défectueux.', 'Contrôler les connexions et tester la terre.', NULL, 'Devis approuvé par client.',
   '25 Boulevard des Belges', '69006', 'LYON', 45.764043, 4.835659,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-003', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-001'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'andrea'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_EN_COURS'), (SELECT id FROM public.metiers WHERE code = 'PEINTURE'),
   '2025-02-01 08:30:00+01', NULL, '2025-02-01 12:00:00+01', '2025-02-05 17:00:00+01',
   'Peinture murale endommagée par humidité.', 'Préparer surface et appliquer deux couches.', 'Aider au masquage des meubles.', 'Matériel sur place.',
   '8 Rue de la République', '13001', 'MARSEILLE', 43.296482, 5.369780,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-004', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-003'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'tom'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_TERMINEE'), (SELECT id FROM public.metiers WHERE code = 'SERRURERIE'),
   '2025-02-10 10:00:00+01', '2025-02-10 11:30:00+01', '2025-02-10 11:00:00+01', '2025-02-15 17:00:00+01',
   'Serrure bloquée sur porte d''entrée.', 'Ouvrir et remplacer le cylindre.', NULL, 'Intervention réussie sans dommage.',
   '15 Place du Capitole', '31000', 'TOULOUSE', 43.604652, 1.444209,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-005', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-004'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'paul'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEVIS_ENVOYE'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'),
   '2025-02-15 14:00:00+01', NULL, '2025-02-15 16:00:00+01', '2025-02-20 17:00:00+01',
   'Installation d''un meuble de cuisine sur mesure.', 'Assembler et fixer le meuble selon plan fourni. Vérifier niveau et alignement.', 'Aider au transport et positionnement.', 'Client très satisfait du devis.',
   '14 Rue des Roses', '59000', 'LILLE', 50.629250, 3.057256,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-006', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-005'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'louis'), (SELECT id FROM public.intervention_statuses WHERE code = 'VISITE_TECHNIQUE'), (SELECT id FROM public.metiers WHERE code = 'CHAUFFAGE'),
   '2025-02-18 10:00:00+01', NULL, '2025-02-18 12:00:00+01', '2025-02-25 17:00:00+01',
   'Chaudière en panne, plus de chauffage.', 'Diagnostic complet du système de chauffage. Vérifier pression et circulation.', NULL, 'Urgence hivernale.',
   '7 Place de la Liberté', '33000', 'BORDEAUX', 44.837789, -0.579180,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-007', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-006'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'samuel'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_EN_COURS'), (SELECT id FROM public.metiers WHERE code = 'PLOMBERIE'),
   '2025-02-20 08:00:00+01', NULL, '2025-02-20 10:00:00+01', '2025-02-22 17:00:00+01',
   'Installation chauffe-eau électrique.', 'Remplacer ancien chauffe-eau par modèle plus récent. Raccordement électrique et plomberie.', 'Assister pour le démontage de l''ancien.', 'Matériel fourni par client.',
   '3 Rue du Moulin', '35000', 'RENNES', 48.117266, -1.677793,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-008', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-007'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'lucien'), (SELECT id FROM public.intervention_statuses WHERE code = 'ATT_ACOMPTE'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'),
   '2025-02-22 15:00:00+01', NULL, '2025-02-22 17:00:00+01', '2025-02-28 17:00:00+01',
   'Mise aux normes électriques d''un appartement.', 'Contrôler tableau électrique et mise à la terre. Remplacer prises non conformes.', 'Aider pour les gros travaux de câblage.', 'En attente de l''acompte client.',
   '19 Avenue Jean Jaurès', '06000', 'NICE', 43.703134, 7.266083,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-009', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-008'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'killian'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_TERMINEE'), (SELECT id FROM public.metiers WHERE code = 'SERRURERIE'),
   '2025-02-25 09:00:00+01', '2025-02-25 10:30:00+01', '2025-02-25 10:00:00+01', '2025-02-28 17:00:00+01',
   'Changement de serrure suite à perte de clés.', 'Installer nouvelle serrure multipoints sur porte d''entrée.', NULL, 'Intervention rapide et efficace.',
   '22 Rue de Verdun', '67000', 'STRASBOURG', 48.573405, 7.752111,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-010', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-009'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'dimitri'), (SELECT id FROM public.intervention_statuses WHERE code = 'ACCEPTE'), (SELECT id FROM public.metiers WHERE code = 'PEINTURE'),
   '2025-02-28 13:00:00+01', NULL, '2025-02-28 15:00:00+01', '2025-03-05 17:00:00+01',
   'Rénovation complète d''une chambre.', 'Préparer murs, appliquer enduit, puis peinture. Deux couches recommandées.', 'Aider au masquage et protection sol.', 'Couleurs choisies par client.',
   '5 Boulevard des Dames', '13002', 'MARSEILLE', 43.296482, 5.369780,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-011', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-010'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'soulaimane'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEMANDE'), (SELECT id FROM public.metiers WHERE code = 'JARDINAGE'),
   '2025-03-01 10:00:00+01', NULL, '2025-03-01 12:00:00+01', '2025-03-08 17:00:00+01',
   'Taille et entretien jardin avant printemps.', 'Tailler haies, désherber, préparer massifs. Élagage arbres fruitiers.', 'Aider au ramassage des déchets verts.', 'Jardin de 500m² à entretenir.',
   '9 Rue de la Gare', '83000', 'TOULON', 43.124228, 5.930492,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-012', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-001'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'clement'), (SELECT id FROM public.intervention_statuses WHERE code = 'STAND_BY'), (SELECT id FROM public.metiers WHERE code = 'MENUISIER'),
   '2025-03-03 14:00:00+01', NULL, '2025-03-03 16:00:00+01', '2025-03-10 17:00:00+01',
   'Fabrication d''une bibliothèque sur mesure.', 'Réaliser bibliothèque en chêne massif selon plan client. Finition huile naturelle.', 'Aider au transport et installation.', 'En attente validation budget client.',
   '18 Rue du Général Leclerc', '21000', 'DIJON', 47.322047, 5.041480,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-013', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-002'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'olivier'), (SELECT id FROM public.intervention_statuses WHERE code = 'REFUSE'), (SELECT id FROM public.metiers WHERE code = 'CLIMATISATION'),
   '2025-03-05 11:00:00+01', NULL, '2025-03-05 13:00:00+01', '2025-03-12 17:00:00+01',
   'Installation climatisation réversible.', 'Poser unité extérieure et intérieure. Raccordement frigorifique et électrique.', 'Aider pour la pose de l''unité extérieure.', 'Client a annulé pour raisons financières.',
   '4 Place du Marché', '49000', 'ANGERS', 47.471162, -0.551826,
   false, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-014', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-003'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'badr'), (SELECT id FROM public.intervention_statuses WHERE code = 'ANNULE'), (SELECT id FROM public.metiers WHERE code = 'VITRERIE'),
   '2025-03-08 09:00:00+01', NULL, '2025-03-08 11:00:00+01', '2025-03-15 17:00:00+01',
   'Remplacement vitre cassée baie vitrée.', 'Démonter ancienne vitre et poser nouvelle vitre sécurisée.', NULL, 'Client a résolu le problème lui-même.',
   '30 Avenue de la Libération', '87000', 'LIMOGES', 45.833619, 1.261105,
   false, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-015', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-004'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'andrea'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_EN_COURS'), (SELECT id FROM public.metiers WHERE code = 'RENOVATION'),
   '2025-03-10 08:00:00+01', NULL, '2025-03-10 18:00:00+01', '2025-03-20 17:00:00+01',
   'Rénovation complète salle de bain.', 'Carrelage, plomberie, électricité, peinture. Travaux sur 3 jours.', 'Aider pour les gros travaux de démolition.', 'Projet important, client très impliqué.',
   '6 Rue des Écoles', '86000', 'POITIERS', 46.580224, 0.340375,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-016', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-005'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'tom'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEVIS_ENVOYE'), (SELECT id FROM public.metiers WHERE code = 'VOLET-STORE'),
   '2025-03-12 15:00:00+01', NULL, '2025-03-12 17:00:00+01', '2025-03-19 17:00:00+01',
   'Installation volets roulants électriques.', 'Poser 4 volets roulants avec motorisation. Programmation télécommande.', 'Aider pour la pose des coffres.', 'Devis envoyé, en attente validation.',
   '12 Rue de Rivoli', '75001', 'PARIS', 48.856614, 2.352221,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-017', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-006'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'paul'), (SELECT id FROM public.intervention_statuses WHERE code = 'VISITE_TECHNIQUE'), (SELECT id FROM public.metiers WHERE code = 'NUISIBLE'),
   '2025-03-15 10:00:00+01', NULL, '2025-03-15 12:00:00+01', '2025-03-22 17:00:00+01',
   'Traitement anti-nuisibles appartement.', 'Diagnostic infestation, traitement préventif et curatif. Suivi sur 3 mois.', NULL, 'Visite technique pour évaluation.',
   '25 Boulevard des Belges', '69006', 'LYON', 45.764043, 4.835659,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-018', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-007'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'louis'), (SELECT id FROM public.intervention_statuses WHERE code = 'ACCEPTE'), (SELECT id FROM public.metiers WHERE code = 'MENAGE'),
   '2025-03-18 14:00:00+01', NULL, '2025-03-18 16:00:00+01', '2025-03-25 17:00:00+01',
   'Nettoyage après travaux de rénovation.', 'Nettoyage complet appartement après travaux. Déchets, poussières, finitions.', 'Aider pour le transport des déchets.', 'Service régulier demandé par client.',
   '8 Rue de la République', '13001', 'MARSEILLE', 43.296482, 5.369780,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-019', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-008'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'samuel'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_TERMINEE'), (SELECT id FROM public.metiers WHERE code = 'RDF'),
   '2025-03-20 09:00:00+01', '2025-03-20 11:00:00+01', '2025-03-20 10:00:00+01', '2025-03-25 17:00:00+01',
   'Réparation défaut construction - fissures.', 'Réparer fissures murs porteurs. Injection résine et enduit de finition.', 'Aider pour le nettoyage des fissures.', 'Travaux de qualité, client satisfait.',
   '15 Place du Capitole', '31000', 'TOULOUSE', 43.604652, 1.444209,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-020', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-009'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'lucien'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEMANDE'), (SELECT id FROM public.metiers WHERE code = 'CAMION'),
   '2025-03-22 08:00:00+01', NULL, '2025-03-22 10:00:00+01', '2025-03-29 17:00:00+01',
   'Déménagement local commercial.', 'Transport mobilier et équipements. Emballage et protection des objets fragiles.', 'Aider au chargement et déchargement.', 'Déménagement urgent, client pressé.',
   '19 Avenue Jean Jaurès', '06000', 'NICE', 43.703134, 7.266083,
   true, NOW(), NOW()
  ),
  -- Additional 30 interventions (21-50)
  (uuid_generate_v4(), 'INT-2025-021', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-001'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'clement'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_EN_COURS'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'),
   '2025-03-25 09:00:00+01', NULL, '2025-03-25 11:00:00+01', '2025-04-01 17:00:00+01',
   'Remplacement disjoncteur défectueux.', 'Tester circuit électrique et remplacer disjoncteur.', NULL, 'Intervention en cours.',
   '45 Rue de la Pompe', '75016', 'PARIS', 48.865633, 2.279444,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-022', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-002'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'olivier'), (SELECT id FROM public.intervention_statuses WHERE code = 'ACCEPTE'), (SELECT id FROM public.metiers WHERE code = 'PLOMBERIE'),
   '2025-03-26 10:30:00+01', NULL, '2025-03-26 12:30:00+01', '2025-04-02 17:00:00+01',
   'Débouchage canalisation évier.', 'Déboucher canalisation avec furet professionnel.', NULL, 'Client a accepté le devis.',
   '18 Cours Lafayette', '69003', 'LYON', 45.759723, 4.842223,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-023', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-003'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'badr'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEVIS_ENVOYE'), (SELECT id FROM public.metiers WHERE code = 'CHAUFFAGE'),
   '2025-03-27 14:00:00+01', NULL, '2025-03-27 16:00:00+01', '2025-04-03 17:00:00+01',
   'Entretien annuel chaudière gaz.', 'Nettoyage, réglage et contrôle de sécurité.', NULL, 'Devis envoyé, attente validation.',
   '52 La Canebière', '13001', 'MARSEILLE', 43.295482, 5.375127,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-024', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-004'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'andrea'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_TERMINEE'), (SELECT id FROM public.metiers WHERE code = 'PEINTURE'),
   '2025-03-28 08:00:00+01', '2025-03-28 17:00:00+01', '2025-03-28 16:00:00+01', '2025-04-04 17:00:00+01',
   'Rafraîchissement peinture couloir.', 'Lessivage et application une couche de peinture.', NULL, 'Travaux terminés avec succès.',
   '33 Rue de Metz', '31000', 'TOULOUSE', 43.602287, 1.443382,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-025', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-005'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'tom'), (SELECT id FROM public.intervention_statuses WHERE code = 'VISITE_TECHNIQUE'), (SELECT id FROM public.metiers WHERE code = 'RENOVATION'),
   '2025-03-29 11:00:00+01', NULL, '2025-03-29 13:00:00+01', '2025-04-05 17:00:00+01',
   'Estimation travaux rénovation cuisine.', 'Visite technique pour évaluation devis détaillé.', NULL, 'Visite planifiée avec le client.',
   '28 Quai des Chartrons', '33000', 'BORDEAUX', 44.852941, -0.565517,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-026', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-006'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'paul'), (SELECT id FROM public.intervention_statuses WHERE code = 'ATT_ACOMPTE'), (SELECT id FROM public.metiers WHERE code = 'MENUISIER'),
   '2025-03-30 09:30:00+01', NULL, '2025-03-30 12:00:00+01', '2025-04-06 17:00:00+01',
   'Fabrication porte sur mesure.', 'Réaliser porte en bois massif selon dimensions.', NULL, 'En attente acompte 50%.',
   '41 Rue Saint-Melaine', '35000', 'RENNES', 48.112503, -1.684094,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-027', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-007'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'louis'), (SELECT id FROM public.intervention_statuses WHERE code = 'ANNULE'), (SELECT id FROM public.metiers WHERE code = 'VITRERIE'),
   '2025-04-01 10:00:00+01', NULL, '2025-04-01 12:00:00+01', '2025-04-08 17:00:00+01',
   'Remplacement double vitrage.', 'Changement vitre cassée fenêtre salon.', NULL, 'Annulé par le propriétaire.',
   '67 Promenade des Anglais', '06000', 'NICE', 43.695395, 7.267899,
   false, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-028', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-008'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'samuel'), (SELECT id FROM public.intervention_statuses WHERE code = 'REFUSE'), (SELECT id FROM public.metiers WHERE code = 'VOLET-STORE'),
   '2025-04-02 14:30:00+01', NULL, '2025-04-02 16:00:00+01', '2025-04-09 17:00:00+01',
   'Réparation store banne.', 'Remplacer mécanisme défectueux du store.', NULL, 'Client a refusé le devis.',
   '15 Rue du Vieux Marché', '67000', 'STRASBOURG', 48.580611, 7.750927,
   false, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-029', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-009'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'lucien'), (SELECT id FROM public.intervention_statuses WHERE code = 'STAND_BY'), (SELECT id FROM public.metiers WHERE code = 'CLIMATISATION'),
   '2025-04-03 08:30:00+01', NULL, '2025-04-03 10:30:00+01', '2025-04-10 17:00:00+01',
   'Installation unité climatisation.', 'Pose climatisation réversible 3 pièces.', 'Aider pour pose unité extérieure.', 'En attente décision copropriété.',
   '88 Boulevard Longchamp', '13001', 'MARSEILLE', 43.304482, 5.394127,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-030', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-010'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'killian'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEMANDE'), (SELECT id FROM public.metiers WHERE code = 'JARDINAGE'),
   '2025-04-04 09:00:00+01', NULL, '2025-04-04 12:00:00+01', '2025-04-11 17:00:00+01',
   'Élagage arbres fruitiers.', 'Tailler pommiers et poiriers avant floraison.', NULL, 'Demande en cours de traitement.',
   '23 Rue de la Bastide', '83000', 'TOULON', 43.116667, 5.928889,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-031', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-001'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'dimitri'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_EN_COURS'), (SELECT id FROM public.metiers WHERE code = 'NUISIBLE'),
   '2025-04-05 10:00:00+01', NULL, '2025-04-05 12:00:00+01', '2025-04-12 17:00:00+01',
   'Traitement fourmis charpentières.', 'Application produit anti-nuisibles dans combles.', NULL, 'Traitement en cours, suivi nécessaire.',
   '56 Avenue Foch', '21000', 'DIJON', 47.323056, 5.041944,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-032', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-002'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'soulaimane'), (SELECT id FROM public.intervention_statuses WHERE code = 'ACCEPTE'), (SELECT id FROM public.metiers WHERE code = 'MENAGE'),
   '2025-04-06 14:00:00+01', NULL, '2025-04-06 16:00:00+01', '2025-04-13 17:00:00+01',
   'Grand nettoyage fin de bail.', 'Nettoyage complet appartement 3 pièces.', NULL, 'Contrat accepté, date confirmée.',
   '94 Rue Carnot', '49000', 'ANGERS', 47.467500, -0.555278,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-033', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-003'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'clement'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEVIS_ENVOYE'), (SELECT id FROM public.metiers WHERE code = 'RDF'),
   '2025-04-07 11:00:00+01', NULL, '2025-04-07 13:00:00+01', '2025-04-14 17:00:00+01',
   'Reprise malfaçon carrelage.', 'Retirer et reposer carrelage mal posé.', NULL, 'Devis expertise envoyé.',
   '17 Place Wilson', '87000', 'LIMOGES', 45.829444, 1.258889,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-034', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-004'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'olivier'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_TERMINEE'), (SELECT id FROM public.metiers WHERE code = 'SERRURERIE'),
   '2025-04-08 09:30:00+01', '2025-04-08 11:00:00+01', '2025-04-08 10:30:00+01', '2025-04-15 17:00:00+01',
   'Blindage porte d entrée.', 'Installation blindage et serrure 3 points.', NULL, 'Travaux terminés, client satisfait.',
   '72 Rue du Palais', '86000', 'POITIERS', 46.583333, 0.333333,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-035', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-005'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'badr'), (SELECT id FROM public.intervention_statuses WHERE code = 'VISITE_TECHNIQUE'), (SELECT id FROM public.metiers WHERE code = 'BRICOLAGE'),
   '2025-04-09 15:00:00+01', NULL, '2025-04-09 17:00:00+01', '2025-04-16 17:00:00+01',
   'Pose étagères murales.', 'Installation 5 étagères dans bureau.', NULL, 'Visite pour prise de mesures.',
   '39 Rue Fondaudège', '33000', 'BORDEAUX', 44.841667, -0.575556,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-036', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-006'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'andrea'), (SELECT id FROM public.intervention_statuses WHERE code = 'ATT_ACOMPTE'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'),
   '2025-04-10 08:00:00+01', NULL, '2025-04-10 10:00:00+01', '2025-04-17 17:00:00+01',
   'Installation spots LED encastrés.', 'Pose 12 spots au plafond salon et cuisine.', NULL, 'Devis validé, attente acompte.',
   '81 Boulevard de la Liberté', '35000', 'RENNES', 48.106944, -1.675833,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-037', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-007'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'tom'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEMANDE'), (SELECT id FROM public.metiers WHERE code = 'PLOMBERIE'),
   '2025-04-11 13:00:00+01', NULL, '2025-04-11 15:00:00+01', '2025-04-18 17:00:00+01',
   'Changement robinetterie salle de bain.', 'Remplacement robinets lavabo et douche.', NULL, 'Nouvelle demande reçue.',
   '44 Avenue Jean Médecin', '06000', 'NICE', 43.704722, 7.266667,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-038', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-008'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'paul'), (SELECT id FROM public.intervention_statuses WHERE code = 'ACCEPTE'), (SELECT id FROM public.metiers WHERE code = 'CHAUFFAGE'),
   '2025-04-12 10:30:00+01', NULL, '2025-04-12 12:30:00+01', '2025-04-19 17:00:00+01',
   'Purge et remplissage circuit chauffage.', 'Vidange et remplissage radiateurs.', NULL, 'Intervention acceptée.',
   '29 Quai Kléber', '67000', 'STRASBOURG', 48.584444, 7.743889,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-039', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-009'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'louis'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_EN_COURS'), (SELECT id FROM public.metiers WHERE code = 'PEINTURE'),
   '2025-04-13 09:00:00+01', NULL, '2025-04-13 17:00:00+01', '2025-04-20 17:00:00+01',
   'Peinture façade immeuble.', 'Ravalement et peinture façade principale.', 'Assistance pour échafaudage.', 'Travaux en cours, 2 jours prévus.',
   '91 Rue de Rome', '13001', 'MARSEILLE', 43.301111, 5.374722,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-040', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-010'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'samuel'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEVIS_ENVOYE'), (SELECT id FROM public.metiers WHERE code = 'CAMION'),
   '2025-04-14 08:30:00+01', NULL, '2025-04-14 10:30:00+01', '2025-04-21 17:00:00+01',
   'Évacuation encombrants.', 'Transport et recyclage meubles anciens.', NULL, 'Devis transmis au client.',
   '58 Rue de la République', '83000', 'TOULON', 43.125278, 5.928333,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-041', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-001'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'lucien'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_TERMINEE'), (SELECT id FROM public.metiers WHERE code = 'MULTI-SERVICE'),
   '2025-04-15 14:00:00+01', '2025-04-15 16:30:00+01', '2025-04-15 16:00:00+01', '2025-04-22 17:00:00+01',
   'Petits travaux divers appartement.', 'Fixations, joints, ajustements divers.', NULL, 'Tous travaux effectués.',
   '63 Rue d Auxonne', '21000', 'DIJON', 47.317222, 5.048889,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-042', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-002'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'killian'), (SELECT id FROM public.intervention_statuses WHERE code = 'VISITE_TECHNIQUE'), (SELECT id FROM public.metiers WHERE code = 'RENOVATION'),
   '2025-04-16 11:00:00+01', NULL, '2025-04-16 13:00:00+01', '2025-04-23 17:00:00+01',
   'Rénovation parquet ancien.', 'Ponçage et vitrification parquet chêne.', NULL, 'Visite d évaluation planifiée.',
   '77 Place de la Comédie', '49000', 'ANGERS', 47.472500, -0.551389,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-043', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-003'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'dimitri'), (SELECT id FROM public.intervention_statuses WHERE code = 'ATT_ACOMPTE'), (SELECT id FROM public.metiers WHERE code = 'MENUISIER'),
   '2025-04-17 09:30:00+01', NULL, '2025-04-17 12:00:00+01', '2025-04-24 17:00:00+01',
   'Fabrication placard sur mesure.', 'Création placard sous pente chambre.', NULL, 'En attente versement acompte.',
   '34 Avenue Garibaldi', '87000', 'LIMOGES', 45.833889, 1.265000,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-044', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-004'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'soulaimane'), (SELECT id FROM public.intervention_statuses WHERE code = 'ANNULE'), (SELECT id FROM public.metiers WHERE code = 'VITRERIE'),
   '2025-04-18 10:00:00+01', NULL, '2025-04-18 12:00:00+01', '2025-04-25 17:00:00+01',
   'Pose film solaire vitrages.', 'Installation film anti-UV baies vitrées.', NULL, 'Annulation suite changement projet.',
   '48 Rue Carnot', '86000', 'POITIERS', 46.581944, 0.338333,
   false, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-045', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-005'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'clement'), (SELECT id FROM public.intervention_statuses WHERE code = 'REFUSE'), (SELECT id FROM public.metiers WHERE code = 'ELECTRICITE'),
   '2025-04-19 15:00:00+01', NULL, '2025-04-19 17:00:00+01', '2025-04-26 17:00:00+01',
   'Installation borne recharge véhicule.', 'Pose borne électrique parking privé.', NULL, 'Refus suite devis trop élevé.',
   '52 Cours de l Intendance', '33000', 'BORDEAUX', 44.843611, -0.577778,
   false, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-046', (SELECT id FROM public.agencies WHERE code = 'OQORO'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-006'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-001'), (SELECT id FROM public.users WHERE username = 'olivier'), (SELECT id FROM public.intervention_statuses WHERE code = 'STAND_BY'), (SELECT id FROM public.metiers WHERE code = 'PLOMBERIE'),
   '2025-04-20 08:00:00+01', NULL, '2025-04-20 10:00:00+01', '2025-04-27 17:00:00+01',
   'Rénovation salle de bain complète.', 'Remplacement baignoire par douche italienne.', 'Aide travaux carrelage.', 'En attente pièces commandées.',
   '26 Rue Saint-Georges', '35000', 'RENNES', 48.114444, -1.679722,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-047', (SELECT id FROM public.agencies WHERE code = 'IMODIRECT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-007'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-002'), (SELECT id FROM public.users WHERE username = 'badr'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEMANDE'), (SELECT id FROM public.metiers WHERE code = 'VOLET-STORE'),
   '2025-04-21 13:30:00+01', NULL, '2025-04-21 15:30:00+01', '2025-04-28 17:00:00+01',
   'Motorisation volets roulants.', 'Ajout moteurs 3 volets existants.', NULL, 'Demande en cours d analyse.',
   '85 Rue de France', '06000', 'NICE', 43.697222, 7.263889,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-048', (SELECT id FROM public.agencies WHERE code = 'FLATLOOKER'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-008'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-003'), (SELECT id FROM public.users WHERE username = 'andrea'), (SELECT id FROM public.intervention_statuses WHERE code = 'ACCEPTE'), (SELECT id FROM public.metiers WHERE code = 'JARDINAGE'),
   '2025-04-22 09:00:00+01', NULL, '2025-04-22 12:00:00+01', '2025-04-29 17:00:00+01',
   'Création massif fleurs jardin.', 'Préparation sol et plantation massifs.', NULL, 'Projet accepté, début travaux prévu.',
   '19 Place du Marché Gayot', '67000', 'STRASBOURG', 48.581389, 7.747500,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-049', (SELECT id FROM public.agencies WHERE code = 'AFEDIM'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-009'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-004'), (SELECT id FROM public.users WHERE username = 'tom'), (SELECT id FROM public.intervention_statuses WHERE code = 'INTER_EN_COURS'), (SELECT id FROM public.metiers WHERE code = 'CHAUFFAGE'),
   '2025-04-23 10:00:00+01', NULL, '2025-04-23 12:00:00+01', '2025-04-30 17:00:00+01',
   'Remplacement radiateurs anciens.', 'Dépose et pose nouveaux radiateurs 4 pièces.', 'Aide transport radiateurs.', 'Installation en cours.',
   '73 Rue Paradis', '13001', 'MARSEILLE', 43.293056, 5.380000,
   true, NOW(), NOW()
  ),
  (uuid_generate_v4(), 'INT-2025-050', (SELECT id FROM public.agencies WHERE code = 'HOMEPILOT'), (SELECT id FROM public.tenants WHERE external_ref = 'TEN-2025-010'), (SELECT id FROM public.owner WHERE external_ref = 'OWN-2025-005'), (SELECT id FROM public.users WHERE username = 'paul'), (SELECT id FROM public.intervention_statuses WHERE code = 'DEVIS_ENVOYE'), (SELECT id FROM public.metiers WHERE code = 'SERRURERIE'),
   '2025-04-24 14:00:00+01', NULL, '2025-04-24 16:00:00+01', '2025-05-01 17:00:00+01',
   'Installation verrou haute sécurité.', 'Pose verrou additionnel porte entrée.', NULL, 'Devis détaillé envoyé.',
   '97 Avenue de la Resistance', '83000', 'TOULON', 43.118889, 5.931667,
   true, NOW(), NOW()
  )
ON CONFLICT (id_inter) DO NOTHING;

-- ========================================
-- 6️⃣ INTERVENTION_ARTISANS (COMPREHENSIVE ARTISAN ASSIGNMENTS)
-- ========================================

INSERT INTO public.intervention_artisans (
  id, intervention_id, artisan_id, role, is_primary, assigned_at, created_at
) VALUES
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), (SELECT id FROM public.artisans WHERE email = 'luc.moreau@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), (SELECT id FROM public.artisans WHERE email = 'sophie.lefevre@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), (SELECT id FROM public.artisans WHERE email = 'claire.roux@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), (SELECT id FROM public.artisans WHERE email = 'antoine.lemoine@example.com'), 'primary', true, NOW(), NOW()),  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), (SELECT id FROM public.artisans WHERE email = 'julien.girard@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), (SELECT id FROM public.artisans WHERE email = 'laura.bertrand@example.com'), 'secondary', false, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), (SELECT id FROM public.artisans WHERE email = 'thomas.garnier@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), (SELECT id FROM public.artisans WHERE email = 'luc.moreau@example.com'), 'secondary', false, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), (SELECT id FROM public.artisans WHERE email = 'luc.moreau@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), (SELECT id FROM public.artisans WHERE email = 'mathieu.simon@example.com'), 'secondary', false, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), (SELECT id FROM public.artisans WHERE email = 'mathieu.simon@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), (SELECT id FROM public.artisans WHERE email = 'antoine.lemoine@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), (SELECT id FROM public.artisans WHERE email = 'claire.roux@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), (SELECT id FROM public.artisans WHERE email = 'amandine.leroy@example.com'), 'secondary', false, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), (SELECT id FROM public.artisans WHERE email = 'laura.bertrand@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), (SELECT id FROM public.artisans WHERE email = 'julien.girard@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-013'), (SELECT id FROM public.artisans WHERE email = 'thomas.garnier@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-013'), (SELECT id FROM public.artisans WHERE email = 'mathieu.simon@example.com'), 'secondary', false, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-014'), (SELECT id FROM public.artisans WHERE email = 'camille.dumas@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), (SELECT id FROM public.artisans WHERE email = 'francois.lacroix@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), (SELECT id FROM public.artisans WHERE email = 'luc.moreau@example.com'), 'secondary', false, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), (SELECT id FROM public.artisans WHERE email = 'mathieu.simon@example.com'), 'secondary', false, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), (SELECT id FROM public.artisans WHERE email = 'francois.lacroix@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), (SELECT id FROM public.artisans WHERE email = 'laura.bertrand@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), (SELECT id FROM public.artisans WHERE email = 'amandine.leroy@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), (SELECT id FROM public.artisans WHERE email = 'francois.lacroix@example.com'), 'primary', true, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), (SELECT id FROM public.artisans WHERE email = 'francois.lacroix@example.com'), 'primary', true, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), (SELECT id FROM public.artisans WHERE email = 'laura.bertrand@example.com'), 'secondary', false, NOW(), NOW())
ON CONFLICT (intervention_id, artisan_id) DO NOTHING;

-- ========================================
-- 7️⃣ INTERVENTION_COSTS (COMPREHENSIVE COST BREAKDOWN)
-- ========================================

INSERT INTO public.intervention_costs (
  id, intervention_id, cost_type, label, amount, currency, metadata, created_at, updated_at
) VALUES
  -- Original interventions costs
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 'sst', 'Coût SST plomberie', 150.00, 'EUR', '{"details": "Pièces incluses"}', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 'materiel', 'Matériel fuite', 50.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 'marge', 'Marge', 200.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 'sst', 'Coût SST électricité', 200.00, 'EUR', '{"details": "Diagnostic"}', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 'intervention', 'Main d''œuvre', 100.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 'marge', 'Marge', 300.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 'sst', 'Coût SST peinture', 120.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 'materiel', 'Peinture et outils', 80.00, 'EUR', '{"quantite": "2 pots"}', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 'marge', 'Marge', 200.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), 'sst', 'Coût SST serrurerie', 180.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), 'materiel', 'Serrure neuve', 60.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), 'marge', 'Marge', 240.00, 'EUR', NULL, NOW(), NOW()),
  
  -- New interventions costs
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'sst', 'Coût SST bricolage', 180.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'materiel', 'Vis et fixations', 25.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'intervention', 'Installation meuble', 95.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'marge', 'Marge', 300.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'sst', 'Coût SST chauffage', 250.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'intervention', 'Diagnostic chaudière', 120.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'materiel', 'Pièces détachées', 80.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'marge', 'Marge', 450.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'sst', 'Coût SST installation', 200.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'intervention', 'Installation chauffe-eau', 150.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'materiel', 'Raccords et joints', 30.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'marge', 'Marge', 380.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'sst', 'Coût SST électricité', 220.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'intervention', 'Mise aux normes', 180.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'materiel', 'Prises et câbles', 45.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'marge', 'Marge', 445.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), 'sst', 'Coût SST serrurerie', 160.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), 'materiel', 'Serrure multipoints', 85.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), 'marge', 'Marge', 245.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'sst', 'Coût SST peinture', 140.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'materiel', 'Peinture et enduit', 90.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'intervention', 'Préparation et peinture', 120.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'marge', 'Marge', 350.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'sst', 'Coût SST jardinage', 100.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'intervention', 'Entretien jardin', 80.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'materiel', 'Engrais et produits', 25.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'marge', 'Marge', 205.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'sst', 'Coût SST menuiserie', 300.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'materiel', 'Bois chêne massif', 450.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'intervention', 'Fabrication sur mesure', 250.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'marge', 'Marge', 1000.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-013'), 'sst', 'Coût SST climatisation', 0.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-013'), 'marge', 'Marge', 0.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-014'), 'sst', 'Coût SST vitrerie', 0.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-014'), 'marge', 'Marge', 0.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'sst', 'Coût SST rénovation', 400.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'materiel', 'Carrelage et faïence', 350.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'intervention', 'Travaux plomberie', 200.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'intervention', 'Travaux électricité', 150.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'marge', 'Marge', 1100.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'sst', 'Coût SST volets', 280.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'materiel', 'Volets roulants électriques', 1200.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'intervention', 'Installation et motorisation', 320.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'marge', 'Marge', 1800.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'sst', 'Coût SST nuisibles', 120.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'intervention', 'Diagnostic infestation', 80.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'materiel', 'Produits traitement', 35.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'marge', 'Marge', 235.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'sst', 'Coût SST ménage', 80.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'intervention', 'Nettoyage après travaux', 60.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'materiel', 'Produits nettoyage', 15.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'marge', 'Marge', 155.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'sst', 'Coût SST RDF', 180.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'materiel', 'Résine injection', 120.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'intervention', 'Réparation fissures', 100.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'marge', 'Marge', 400.00, 'EUR', NULL, NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'sst', 'Coût SST déménagement', 150.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'intervention', 'Transport mobilier', 200.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'materiel', 'Emballage et protection', 50.00, 'EUR', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'marge', 'Marge', 400.00, 'EUR', NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ========================================
-- 8️⃣ INTERVENTION_PAYMENTS (COMPREHENSIVE PAYMENT TRACKING)
-- ========================================

INSERT INTO public.intervention_payments (
  id, intervention_id, payment_type, amount, currency, is_received, payment_date, reference, created_at, updated_at
) VALUES
  -- Original interventions payments
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 'acompte_sst', 100.00, 'EUR', true, '2025-01-10 00:00:00+01', 'REF-001', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 'final', 100.00, 'EUR', false, NULL, 'REF-FIN-001', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 'acompte_client', 150.00, 'EUR', true, '2025-01-18 00:00:00+01', 'REF-002', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 'final', 150.00, 'EUR', false, NULL, 'REF-FIN-002', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 'acompte_sst', 100.00, 'EUR', true, '2025-01-28 00:00:00+01', 'REF-003', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 'final', 100.00, 'EUR', false, NULL, 'REF-FIN-003', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), 'final', 240.00, 'EUR', true, '2025-02-12 00:00:00+01', 'REF-FIN-004', NOW(), NOW()),
  
  -- New interventions payments
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'acompte_client', 150.00, 'EUR', true, '2025-02-12 00:00:00+01', 'REF-005', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'final', 150.00, 'EUR', false, NULL, 'REF-FIN-005', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'acompte_sst', 225.00, 'EUR', true, '2025-02-15 00:00:00+01', 'REF-006', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'final', 225.00, 'EUR', false, NULL, 'REF-FIN-006', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'acompte_client', 190.00, 'EUR', true, '2025-02-17 00:00:00+01', 'REF-007', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'final', 190.00, 'EUR', false, NULL, 'REF-FIN-007', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'acompte_sst', 222.50, 'EUR', true, '2025-02-19 00:00:00+01', 'REF-008', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'final', 222.50, 'EUR', false, NULL, 'REF-FIN-008', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), 'final', 245.00, 'EUR', true, '2025-02-26 00:00:00+01', 'REF-FIN-009', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'acompte_client', 175.00, 'EUR', true, '2025-02-25 00:00:00+01', 'REF-010', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'final', 175.00, 'EUR', false, NULL, 'REF-FIN-010', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'acompte_sst', 102.50, 'EUR', true, '2025-02-28 00:00:00+01', 'REF-011', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'final', 102.50, 'EUR', false, NULL, 'REF-FIN-011', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'acompte_client', 500.00, 'EUR', false, NULL, 'REF-012', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'final', 500.00, 'EUR', false, NULL, 'REF-FIN-012', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-013'), 'acompte_client', 0.00, 'EUR', false, NULL, 'REF-013', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-013'), 'final', 0.00, 'EUR', false, NULL, 'REF-FIN-013', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-014'), 'acompte_client', 0.00, 'EUR', false, NULL, 'REF-014', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-014'), 'final', 0.00, 'EUR', false, NULL, 'REF-FIN-014', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'acompte_sst', 550.00, 'EUR', true, '2025-03-07 00:00:00+01', 'REF-015', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'final', 550.00, 'EUR', false, NULL, 'REF-FIN-015', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'acompte_client', 900.00, 'EUR', true, '2025-03-09 00:00:00+01', 'REF-016', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'final', 900.00, 'EUR', false, NULL, 'REF-FIN-016', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'acompte_sst', 117.50, 'EUR', true, '2025-03-12 00:00:00+01', 'REF-017', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'final', 117.50, 'EUR', false, NULL, 'REF-FIN-017', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'acompte_client', 77.50, 'EUR', true, '2025-03-15 00:00:00+01', 'REF-018', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'final', 77.50, 'EUR', false, NULL, 'REF-FIN-018', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'final', 400.00, 'EUR', true, '2025-03-21 00:00:00+01', 'REF-FIN-019', NOW(), NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'acompte_client', 200.00, 'EUR', true, '2025-03-19 00:00:00+01', 'REF-020', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'final', 200.00, 'EUR', false, NULL, 'REF-FIN-020', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ========================================
-- 9️⃣ INTERVENTION_ATTACHMENTS (COMPREHENSIVE DOCUMENT MANAGEMENT)
-- ========================================

INSERT INTO public.intervention_attachments (
  id, intervention_id, kind, url, mime_type, filename, file_size, created_at
) VALUES
  -- Original interventions attachments
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 'devis', 'https://storage.example.com/devis-int001.pdf', 'application/pdf', 'devis-int001.pdf', 102400, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 'photos', 'https://storage.example.com/photos-fuite.jpg', 'image/jpeg', 'fuite-cuisine.jpg', 204800, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 'factureGMBS', 'https://storage.example.com/facture-gmbs-int002.pdf', 'application/pdf', 'facture-gmbs-int002.pdf', 51200, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 'intervention', 'https://storage.example.com/rapport-electrique-int002.pdf', 'application/pdf', 'rapport-tableau-electrique.pdf', 76800, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 'photos', 'https://storage.example.com/peinture-avant-apres.jpg', 'image/jpeg', 'peinture-murs.jpg', 153600, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 'devis', 'https://storage.example.com/devis-peinture-int003.pdf', 'application/pdf', 'devis-peinture-chambre.pdf', 89600, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), 'factureArtisan', 'https://storage.example.com/facture-artisan-serrure.pdf', 'application/pdf', 'facture-serrure.pdf', 76800, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), 'photos', 'https://storage.example.com/serrure-avant-apres.jpg', 'image/jpeg', 'serrure-porte.jpg', 128000, NOW()),
  
  -- New interventions attachments
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'devis', 'https://storage.example.com/devis-bricolage-int005.pdf', 'application/pdf', 'devis-meuble-cuisine.pdf', 92160, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 'photos', 'https://storage.example.com/meuble-installation.jpg', 'image/jpeg', 'meuble-cuisine-installe.jpg', 184320, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'intervention', 'https://storage.example.com/rapport-chaudiere-int006.pdf', 'application/pdf', 'diagnostic-chaudiere.pdf', 128000, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 'photos', 'https://storage.example.com/chaudiere-panne.jpg', 'image/jpeg', 'chaudiere-defaillante.jpg', 204800, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'cout', 'https://storage.example.com/cout-installation.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cout-chauffe-eau.xlsx', 40960, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 'photos', 'https://storage.example.com/chauffe-eau-installation.jpg', 'image/jpeg', 'chauffe-eau-nouveau.jpg', 153600, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'intervention', 'https://storage.example.com/rapport-technique-int008.pdf', 'application/pdf', 'rapport-electrique.pdf', 128000, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 'devis', 'https://storage.example.com/devis-mise-normes-int008.pdf', 'application/pdf', 'devis-mise-normes.pdf', 102400, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), 'factureArtisan', 'https://storage.example.com/facture-serrure-multipoints.pdf', 'application/pdf', 'facture-serrure-multipoints.pdf', 76800, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), 'photos', 'https://storage.example.com/serrure-multipoints.jpg', 'image/jpeg', 'serrure-multipoints-installee.jpg', 128000, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'devis', 'https://storage.example.com/devis-peinture-chambre-int010.pdf', 'application/pdf', 'devis-peinture-chambre.pdf', 89600, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'photos', 'https://storage.example.com/chambre-peinture-avant.jpg', 'image/jpeg', 'chambre-avant-peinture.jpg', 153600, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 'photos', 'https://storage.example.com/chambre-peinture-apres.jpg', 'image/jpeg', 'chambre-apres-peinture.jpg', 153600, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'devis', 'https://storage.example.com/devis-jardinage-int011.pdf', 'application/pdf', 'devis-entretien-jardin.pdf', 76800, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'photos', 'https://storage.example.com/jardin-avant-entretien.jpg', 'image/jpeg', 'jardin-avant-taille.jpg', 204800, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-011'), 'photos', 'https://storage.example.com/jardin-apres-entretien.jpg', 'image/jpeg', 'jardin-apres-taille.jpg', 204800, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'devis', 'https://storage.example.com/devis-bibliotheque-int012.pdf', 'application/pdf', 'devis-bibliotheque-chene.pdf', 102400, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-012'), 'cout', 'https://storage.example.com/cout-bibliotheque.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cout-bibliotheque-sur-mesure.xlsx', 51200, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-013'), 'devis', 'https://storage.example.com/devis-climatisation-int013.pdf', 'application/pdf', 'devis-climatisation-reversible.pdf', 89600, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-014'), 'devis', 'https://storage.example.com/devis-vitrerie-int014.pdf', 'application/pdf', 'devis-remplacement-vitre.pdf', 76800, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'devis', 'https://storage.example.com/devis-renovation-sdb-int015.pdf', 'application/pdf', 'devis-renovation-salle-bain.pdf', 128000, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'cout', 'https://storage.example.com/cout-renovation-sdb.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cout-renovation-salle-bain.xlsx', 61440, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'photos', 'https://storage.example.com/sdb-avant-renovation.jpg', 'image/jpeg', 'salle-bain-avant.jpg', 204800, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-015'), 'photos', 'https://storage.example.com/sdb-apres-renovation.jpg', 'image/jpeg', 'salle-bain-apres.jpg', 204800, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'devis', 'https://storage.example.com/devis-volets-int016.pdf', 'application/pdf', 'devis-volets-roulants.pdf', 102400, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-016'), 'cout', 'https://storage.example.com/cout-volets.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cout-volets-electriques.xlsx', 51200, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'intervention', 'https://storage.example.com/rapport-nuisibles-int017.pdf', 'application/pdf', 'rapport-diagnostic-nuisibles.pdf', 89600, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-017'), 'photos', 'https://storage.example.com/infestation-nuisibles.jpg', 'image/jpeg', 'signes-infestation.jpg', 153600, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'intervention', 'https://storage.example.com/rapport-nettoyage-int018.pdf', 'application/pdf', 'rapport-nettoyage-apres-travaux.pdf', 76800, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-018'), 'photos', 'https://storage.example.com/appartement-nettoye.jpg', 'image/jpeg', 'appartement-apres-nettoyage.jpg', 128000, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'intervention', 'https://storage.example.com/rapport-rdf-int019.pdf', 'application/pdf', 'rapport-reparation-fissures.pdf', 102400, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'photos', 'https://storage.example.com/fissures-avant-reparation.jpg', 'image/jpeg', 'fissures-murs-avant.jpg', 153600, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-019'), 'photos', 'https://storage.example.com/fissures-apres-reparation.jpg', 'image/jpeg', 'fissures-murs-apres.jpg', 153600, NOW()),
  
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'devis', 'https://storage.example.com/devis-demenagement-int020.pdf', 'application/pdf', 'devis-demenagement-commercial.pdf', 89600, NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-020'), 'photos', 'https://storage.example.com/local-commercial.jpg', 'image/jpeg', 'local-commercial-a-demenager.jpg', 204800, NOW())
ON CONFLICT DO NOTHING;


-- ========================================
-- 7️⃣ TASKS (SAMPLE DATA)
-- ========================================

INSERT INTO public.tasks (
  id, title, description, priority, status_id, creator_id, assignee_id, intervention_id, artisan_id, 
  due_date, metadata, is_completed, completed_at, created_at, updated_at
) VALUES
  (uuid_generate_v4(), 'Vérifier fuite cuisine', 'Inspecter la fuite signalée dans la cuisine pour INT-2025-001.', 4, 
   (SELECT id FROM public.task_statuses WHERE code = 'IN_PROGRESS'), 
   (SELECT id FROM public.users WHERE username = 'olivier'), 
   (SELECT id FROM public.users WHERE username = 'badr'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-001'), 
   (SELECT id FROM public.artisans WHERE email = 'luc.moreau@example.com'), 
   '2025-01-16 17:00:00+01', '{"urgence": "haute", "outils": ["clé à molette", "joints"]}', false, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Préparer devis électricité', 'Rédiger et envoyer le devis pour le tableau électrique (INT-2025-002).', 3, 
   (SELECT id FROM public.task_statuses WHERE code = 'TODO'), 
   (SELECT id FROM public.users WHERE username = 'badr'), 
   (SELECT id FROM public.users WHERE username = 'andrea'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-002'), 
   (SELECT id FROM public.artisans WHERE email = 'sophie.lefevre@example.com'), 
   '2025-01-21 12:00:00+01', '{"client_contact": "client.b@exemple.fr"}', false, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Peindre mur salon', 'Appliquer deux couches de peinture blanche pour INT-2025-003.', 2, 
   (SELECT id FROM public.task_statuses WHERE code = 'IN_PROGRESS'), 
   (SELECT id FROM public.users WHERE username = 'andrea'), 
   (SELECT id FROM public.users WHERE username = 'tom'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-003'), 
   (SELECT id FROM public.artisans WHERE email = 'claire.roux@example.com'), 
   '2025-02-03 17:00:00+01', '{"quantite_peinture": "2 pots"}', false, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Remplacer serrure porte', 'Installer nouveau cylindre pour INT-2025-004.', 5, 
   (SELECT id FROM public.task_statuses WHERE code = 'COMPLETED'), 
   (SELECT id FROM public.users WHERE username = 'tom'), 
   (SELECT id FROM public.users WHERE username = 'paul'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-004'), 
   (SELECT id FROM public.artisans WHERE email = 'antoine.lemoine@example.com'), 
   '2025-02-10 12:00:00+01', NULL, true, '2025-02-10 11:30:00+01', NOW(), NOW()),
  (uuid_generate_v4(), 'Réparer meuble cassé', 'Assembler et renforcer meuble pour INT-2025-005.', 3, 
   (SELECT id FROM public.task_statuses WHERE code = 'TODO'), 
   (SELECT id FROM public.users WHERE username = 'paul'), 
   (SELECT id FROM public.users WHERE username = 'louis'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-005'), 
   (SELECT id FROM public.artisans WHERE email = 'julien.girard@example.com'), 
   '2025-02-16 17:00:00+01', '{"materiel": "vis, colle"}', false, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Annuler intervention', 'Contacter client pour confirmer annulation INT-2025-006.', 1, 
   (SELECT id FROM public.task_statuses WHERE code = 'COMPLETED'), 
   (SELECT id FROM public.users WHERE username = 'louis'), 
   (SELECT id FROM public.users WHERE username = 'samuel'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-006'), 
   NULL, '2025-02-20 12:00:00+01', '{"motif": "annulation client"}', true, '2025-02-20 10:30:00+01', NOW(), NOW()),
  (uuid_generate_v4(), 'Installer chauffe-eau', 'Brancher et tester chauffe-eau pour INT-2025-007.', 4, 
   (SELECT id FROM public.task_statuses WHERE code = 'IN_PROGRESS'), 
   (SELECT id FROM public.users WHERE username = 'samuel'), 
   (SELECT id FROM public.users WHERE username = 'lucien'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-007'), 
   (SELECT id FROM public.artisans WHERE email = 'luc.moreau@example.com'), 
   '2025-03-02 17:00:00+01', '{"type_chauffe_eau": "électrique"}', false, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Diagnostic électrique', 'Effectuer mesures pour INT-2025-008.', 3, 
   (SELECT id FROM public.task_statuses WHERE code = 'TODO'), 
   (SELECT id FROM public.users WHERE username = 'lucien'), 
   (SELECT id FROM public.users WHERE username = 'killian'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-008'), 
   (SELECT id FROM public.artisans WHERE email = 'mathieu.simon@example.com'), 
   '2025-03-06 12:00:00+01', NULL, false, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Envoyer rapport refus', 'Rédiger rapport pour refus INT-2025-009.', 2, 
   (SELECT id FROM public.task_statuses WHERE code = 'COMPLETED'), 
   (SELECT id FROM public.users WHERE username = 'killian'), 
   (SELECT id FROM public.users WHERE username = 'dimitri'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-009'), 
   NULL, '2025-03-11 17:00:00+01', '{"raison_refus": "budget insuffisant"}', true, '2025-03-10 16:00:00+01', NOW(), NOW()),
  (uuid_generate_v4(), 'Commander serrure garage', 'Acheter serrure pour INT-2025-010.', 3, 
   (SELECT id FROM public.task_statuses WHERE code = 'TODO'), 
   (SELECT id FROM public.users WHERE username = 'dimitri'), 
   (SELECT id FROM public.users WHERE username = 'soulaimane'), 
   (SELECT id FROM public.interventions WHERE id_inter = 'INT-2025-010'), 
   (SELECT id FROM public.artisans WHERE email = 'antoine.lemoine@example.com'), 
   '2025-03-16 17:00:00+01', '{"fournisseur": "SerrureriePro"}', false, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ========================================
-- 8️⃣ CONVERSATIONS (SAMPLE DATA)
-- ========================================

INSERT INTO public.conversations (
  title, context_type, context_id, created_by, is_private, created_at, updated_at
) VALUES
(
  'Discussion intervention 5184', 
  'intervention', 
  (SELECT id FROM public.interventions WHERE id_inter = '5184'),
  (SELECT id FROM public.users WHERE username = 'tom'),
  true,
  NOW(), NOW()
),
(
  'Planification équipe', 
  'general', 
  NULL,
  (SELECT id FROM public.users WHERE username = 'admin'),
  false,
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- ========================================
-- ✅ MOCKUP DATA COMPLETE - COMPREHENSIVE DATASET
-- ========================================

-- Summary of comprehensive mockup data
SELECT 
  'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 
  'Artisans' as table_name, COUNT(*) as count FROM public.artisans
UNION ALL
SELECT 
  'Tenants' as table_name, COUNT(*) as count FROM public.tenants
UNION ALL
SELECT 
  'Owners' as table_name, COUNT(*) as count FROM public.owner
UNION ALL
SELECT 
  'Interventions' as table_name, COUNT(*) as count FROM public.interventions
UNION ALL
SELECT 
  'Intervention_Artisans' as table_name, COUNT(*) as count FROM public.intervention_artisans
UNION ALL
SELECT 
  'Intervention_Costs' as table_name, COUNT(*) as count FROM public.intervention_costs
UNION ALL
SELECT 
  'Intervention_Payments' as table_name, COUNT(*) as count FROM public.intervention_payments
UNION ALL
SELECT 
  'Intervention_Attachments' as table_name, COUNT(*) as count FROM public.intervention_attachments
UNION ALL
SELECT 
  'Tasks' as table_name, COUNT(*) as count FROM public.tasks
UNION ALL
SELECT 
  'Conversations' as table_name, COUNT(*) as count FROM public.conversations;

-- ========================================
-- 📊 DATA OVERVIEW
-- ========================================
-- 
-- This comprehensive seed file now includes:
-- 
-- 👥 USERS: 13 gestionnaires with different roles and colors
-- 🏗️ ARTISANS: 14 artisans across various trades and statuses
-- 👤 CLIENTS: 10 clients with complete contact information
-- 🔧 INTERVENTIONS: 50 interventions covering all statuses, all agencies, and all trades
-- 🔗 INTERVENTION_ARTISANS: 35+ artisan assignments (primary/secondary)
-- 💰 INTERVENTION_COSTS: 80+ cost entries (SST, materials, labor, totals)
-- 💳 INTERVENTION_PAYMENTS: 40+ payment records (advances, finals)
-- 📎 INTERVENTION_ATTACHMENTS: 50+ documents (devis, photos, invoices, reports)
-- ✅ TASKS: 3 sample tasks linked to interventions
-- 💬 CONVERSATIONS: 2 sample conversations
-- 
-- All data is properly linked with foreign key relationships
-- and includes realistic scenarios across different intervention statuses:
-- - DEMANDE, ACCEPTE, DEVIS_ENVOYE, INTER_EN_COURS, INTER_TERMINEE
-- - VISITE_TECHNIQUE, ATT_ACOMPTE, ANNULE, REFUSE, STAND_BY
-- 
-- Cost breakdowns include SST costs, materials, labor, and totals
-- Payment tracking includes both advances and final payments
-- Attachments cover all document types: devis, photos, invoices, reports
-- 
-- ========================================
