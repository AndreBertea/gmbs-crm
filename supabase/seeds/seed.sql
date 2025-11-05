-- ========================================
-- GMBS CRM - Mockup Data for Development
-- ========================================
-- This file contains sample data for development and testing
-- Use this when Google Sheets import is not available
-- Date: 2025-01-01

-- ========================================
-- 1️⃣ USERS (GESTIONNAIRES)
-- ========================================

INSERT INTO public.users (name, prenom, username, email, code_gestionnaire, color, created_at, updated_at) VALUES
('Olivier', 'Gestionnaire', 'olivier', 'olivier@gmbs.fr', 'O', '#A22116', NOW(), NOW()),
('Badr', 'Boujimal', 'badr', 'badr@gmbs.fr', 'B', '#D9ECC0', NOW(), NOW()),
('Admin', 'Système', 'admin', 'admin@gmbs.fr', 'ADMIN', '#FF0000', NOW(), NOW()),
('Andrea', 'GAUTRET', 'andrea', 'andrea@gmbs.fr', 'A', '#C5E0F4', NOW(), NOW()),
('Tom', 'Birckel', 'tom', 'tom@gmbs.fr', 'T', '#A22116', NOW(), NOW()),
('Paul', 'Aguenana', 'paul', 'paul@gmbs.fr', 'P', '#EBF551', NOW(), NOW()),
('Louis', 'Saune', 'louis', 'louis@gmbs.fr', 'J', '#69D9E5', NOW(), NOW()),
('Samuel', 's', 'samuel', 'samuel@gmbs.fr', 'S', '#543481', NOW(), NOW()),
('Lucien', 'L', 'lucien', 'lucien@gmbs.fr', 'L', '#35714E', NOW(), NOW()),
('Killian', 'K', 'killian', 'killian@gmbs.fr', 'K', '#1227A1', NOW(), NOW()),
('Dimitri', 'Montanari', 'dimitri', 'dimitri@gmbs.fr', 'D', '#FBE6A8', NOW(), NOW()),
('Soulaimane', 'Soulaimane', 'soulaimane', 'soulaimane@gmbs.fr', 'SO', '#FF6B6B', NOW(), NOW()),
('Clément', 'Clément', 'clement', 'clement@gmbs.fr', 'C', '#4ECDC4', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- ========================================
-- 2️⃣ ARTISANS (SAMPLE DATA)
-- ========================================

INSERT INTO public.artisans (
  nom_prenom, numero_associe, raison_sociale, siret, statut_juridique, 
  statut_artisan, statut_dossier, adresse_siege_social, ville_siege_social, 
  code_postal_siege_social, email, telephone, date_ajout, 
  suivi_relances_docs, created_at, updated_at
) VALUES
(
  'Adama Sy', '68', 'MABS', '90199093700012', 'AUTO ENTREPRENEUR',
  'POTENTIEL', 'DOSSIER À FINALISER', '6 rue DES MARECHAUX', 'MULHOUSE', '68100',
  'adama.thialy@gmail.com', '07 60 02 22 13', '30/06/2025', NULL,
  NOW(), NOW()
),
(
  'belhares mounir', '69', 'BM PLOMBERIE', '87873843400017', 'AUTO ENTREPRENEUR',
  'NOVICE', 'COMPLET', '8 C AVENUE PIERRE BROSSOLETTE', 'LYON', '69500',
  'mounir.belhares@gmail.com', '06 38 14 72 71', '10/2024', 'Mail relance doc envoyé',
  NOW(), NOW()
),
(
  'Abdel ajgaf', '34', 'SUD Multiservices', '89321105200020', 'EIRL',
  'NOVICE', 'INCOMPLET', '4103 BOULEVARD PAUL VALERY', 'MONTPELLIER', '34070',
  'sudmultiservicescontact@gmail.com', '06 28 56 36 25', '12/2024', NULL,
  NOW(), NOW()
),
(
  'Alexandru Barbaneagra', '67', NULL, '848072930', 'AUTO ENTREPRENEUR',
  'ONE SHOT', 'INCOMPLET', NULL, NULL, NULL,
  'alexodnok9230@gmail.com', '07 53 61 27 91', '9/2024', NULL,
  NOW(), NOW()
),
(
  'Jean Dupont', '70', 'JD SERVICES', '12345678901234', 'SARL',
  'EXPERT', 'COMPLET', '15 Rue de la Paix', 'PARIS', '75001',
  'jean.dupont@example.com', '01 23 45 67 89', '01/2025', NULL,
  NOW(), NOW()
),
(
  'Marie Martin', '71', 'MM ELECTRICITE', '23456789012345', 'EURL',
  'NOVICE', 'DOSSIER À FINALISER', '42 Avenue des Champs', 'LYON', '69000',
  'marie.martin@example.com', '04 56 78 90 12', '02/2025', 'En attente de documents',
  NOW(), NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 3️⃣ ASSOCIATIONS GESTIONNAIRES-ARTISANS
-- ========================================

UPDATE public.artisans SET gestionnaire_id = (SELECT id FROM public.users WHERE username = 'olivier') WHERE nom_prenom = 'Adama Sy';
UPDATE public.artisans SET gestionnaire_id = (SELECT id FROM public.users WHERE username = 'badr') WHERE nom_prenom = 'belhares mounir';
UPDATE public.artisans SET gestionnaire_id = (SELECT id FROM public.users WHERE username = 'admin') WHERE nom_prenom = 'Abdel ajgaf';
UPDATE public.artisans SET gestionnaire_id = (SELECT id FROM public.users WHERE username = 'andrea') WHERE nom_prenom = 'Alexandru Barbaneagra';
UPDATE public.artisans SET gestionnaire_id = (SELECT id FROM public.users WHERE username = 'tom') WHERE nom_prenom = 'Jean Dupont';
UPDATE public.artisans SET gestionnaire_id = (SELECT id FROM public.users WHERE username = 'paul') WHERE nom_prenom = 'Marie Martin';

-- ========================================
-- 4️⃣ ASSOCIATIONS ARTISANS-MÉTIERS
-- ========================================

INSERT INTO public.artisan_metiers (artisan_id, metier_id) VALUES
((SELECT id FROM public.artisans WHERE nom_prenom = 'Adama Sy'), (SELECT id FROM public.metiers WHERE label = 'PLOMBERIE')),
((SELECT id FROM public.artisans WHERE nom_prenom = 'belhares mounir'), (SELECT id FROM public.metiers WHERE label = 'PLOMBERIE')),
((SELECT id FROM public.artisans WHERE nom_prenom = 'Abdel ajgaf'), (SELECT id FROM public.metiers WHERE label = 'Multi-Service')),
((SELECT id FROM public.artisans WHERE nom_prenom = 'Alexandru Barbaneagra'), (SELECT id FROM public.metiers WHERE label = 'Multi-Service')),
((SELECT id FROM public.artisans WHERE nom_prenom = 'Jean Dupont'), (SELECT id FROM public.metiers WHERE label = 'BRICOLAGE')),
((SELECT id FROM public.artisans WHERE nom_prenom = 'Marie Martin'), (SELECT id FROM public.metiers WHERE label = 'ELECTRICITE'))
ON CONFLICT (artisan_id, metier_id) DO NOTHING;

-- ========================================
-- 5️⃣ INTERVENTIONS (SAMPLE DATA)
-- ========================================

INSERT INTO public.interventions (
  id_inter, date, agence, adresse, code_postal, ville, statut, contexte_intervention, type,
  proprietaire, nom_prenom_client, telephone_client, telephone2_client, email_client,
  cout_sst, cout_materiel, cout_intervention,
  demande_intervention, demande_devis, date_demande_intervention, date_demande_devis,
  created_at, updated_at
) VALUES
(
  '5184', '2024-08-23T00:00:00Z', 'Oqoro', '13 Rue D''orbey Strasbourg- Et. 6', NULL, 'Strasbourg', 
  'Inter terminée', '16 Janvier 16H Réparer le placard dont les portes coulissantes ne souvrent pas', 'Bricolage',
  'OQORO', 'Sarah Riofrio', '+593939825448', '["+33658365120", "+59393941456"]', NULL,
  75, NULL, 115,
  '{"texte": "16-12-2024 17:00 - Demande d''intervention ✅ ''brouillon'' à: alexodnok9230@gmail.com avec gmbs.tom@gmail.com"}', NULL,
  '16-12-2024', NULL,
  NOW(), NOW()
),
(
  '5542', '2024-09-10T00:00:00Z', 'ImoDirect', '10 Rue Monge', '34070', 'MONTPELLIER', 
  'Inter terminée', 'Remplacement du barillet de la boîte aux lettres + 90 Diagnostic de panne et tentative de réparation sur Deux volets roulants dont 1 éléctriques ne fonctionnent plus Fuite mitigeur cuisine 75 Robinet wc à remplacer + 50', 'Bricolage',
  'MD002881', 'Madame ALQUIER Edina', '06 33 37 33 68', NULL, NULL,
  215, 66.51, 504.9,
  '{"texte": "18-12-2024 15:56 - Demande d''intervention ✅ ''brouillon'' à: sudmultiservicescontact@gmail.com avec davidl.gmbs@gmail.com"}', NULL,
  '18-12-2024', NULL,
  NOW(), NOW()
),
(
  '5592', '2024-09-17T00:00:00Z', 'Oqoro', '5 Place Saint-Antoine Strasbourg - Et. 5 - Ch 2', NULL, 'Strasbourg', 
  'Inter terminée', 'Num LOC OK TRASNMIS AU SST /// Remise en place de la poignée de porte dévissée.', 'Bricolage',
  'OQORO', 'Laetitia Ngomsu Kwekem', '+237675776317', NULL, NULL,
  75, NULL, 125,
  '{"texte": "16-12-2024 17:00 - Demande d''intervention ✅ ''brouillon'' à: alexodnok9230@gmail.com avec gmbs.tom@gmail.com"}', NULL,
  '16-12-2024', NULL,
  NOW(), NOW()
),
(
  '5690', '2024-09-19T00:00:00Z', 'Oqoro', '1 Rue Curie Strasbourg - Et. 2', NULL, 'Strasbourg', 
  'Stand by', 'LOC NRP /// Refixer prise cuisine', 'Bricolage',
  'OQORO', 'Michaël Tankam Bekou', '+237691591609', '["+33659244690", "+33744829204", "+33661909064", "+33656762239"]', NULL,
  90, NULL, 110,
  '{"texte": "16-12-2024 17:00 - Demande d''intervention ✅ ''brouillon'' à: alexodnok9230@gmail.com avec gmbs.tom@gmail.com"}', NULL,
  '16-12-2024', NULL,
  NOW(), NOW()
),
(
  NULL, '2024-10-07T00:00:00Z', 'Flatlooker', '819 Avenue Raymond Dugrand', NULL, 'Montpellier', 
  'Visite Technique', 'devis pour une fissure se trouvant sur le mur gauche du salon, et une remise en peinture suite à un ancien dégât des eaux', 'Peinture',
  NULL, 'Sarah Lefevre', '0615222801', NULL, NULL,
  NULL, NULL, NULL,
  NULL, '{"texte": "08-10-2024 15:06 - Demande de devis ✅ ''brouillon'' à: sudmultiservicescontact@gmail.com avec antoine.gmbs@gmail.com"}',
  NULL, '08-10-2024',
  NOW(), NOW()
),
(
  '6334', '2024-10-17T00:00:00Z', 'AFEDIM', 'BATIMENT C - 3eme - APT C31 VIVACITY 28 RUE DU BATAILLON DE MARCHE', '67200', 'STRASBOURG', 
  'Inter terminée', 'inter terminer à facturer //- - joint bac à douche - aimant du placard salle d''eau cassée. Charge prop : - joint lavabo salle d''eau - joint évier cuisine.', 'Bricolage',
  'MME LITZELMANN WEIL ALEXINA', 'MME CECILE KASSA', '652514455', NULL, NULL,
  150, NULL, 245,
  '{"texte": "09-01-2025 17:56 - Demande d''intervention ✅ ''brouillon'' à: alexodnok9230@gmail.com avec samuel.gmbs@gmail.com"}', NULL,
  '09-01-2025', NULL,
  NOW(), NOW()
),
(
  '6683', '2024-10-17T00:00:00Z', 'HomePilot', '26 rue de l''Imprimerie à Montpellier', NULL, 'Montpellier', 
  'Visite Technique', 'Les locataires ont subi un dégât des eaux. Le plafond de la salle de bain est endommagé (morceaux de placo se détachent et tombent). Pourriez-vous établir un devis de remise en état pour assurance', 'Peinture',
  NULL, 'Madame Meimoun', '0684684242', '["06 15 88 48 39"]', NULL,
  709, NULL, NULL,
  NULL, '{"texte": "24-10-2024 14:44 - Demande de devis ✅ ''brouillon'' à: sudmultiservicescontact@gmail.com avec antoine.gmbs@gmail.com"}',
  NULL, '24-10-2024',
  NOW(), NOW()
),
(
  '7096', '2024-11-25T00:00:00Z', 'Flatlooker', '221 Rue Des Yuccas', NULL, 'Montpellier', 
  'Annulé', 'devis complémentaire dispo mais pas facturable car rien n''a été fais fournir un devis pour la réparation des portes de la cabine de douche s''il vous plaît ? Les portes ne coulissent plus', 'Plomberie',
  'Stravos Alissandratos', 'Jade Ricard', '33769179374', NULL, NULL,
  60, NULL, 155,
  '{"texte": "17-12-2024 17:03 - Demande d''intervention ✅ ''brouillon'' à: sudmultiservicescontact@gmail.com avec gmbs.paul@gmail.com"}', NULL,
  '17-12-2024', NULL,
  NOW(), NOW()
),
(
  '7530', '2024-11-17T00:00:00Z', 'Flatlooker', '91 Avenue Francis de Pressensé', NULL, 'Vénissieux', 
  'Inter terminée', 'terminer// 29/01 débouchage d''un tuyau entre le lavabo et la douche , eau chaude débit très faible/ doit faire un detartrage du tuyaux', 'Plomberie',
  'francois ducrot', NULL, '07 71 81 14 32', '["749942419"]', NULL,
  80, NULL, 150,
  '{"texte": "19-12-2024 17:38 - Demande d''intervention ✅ ''brouillon'' à: mounir.belhares@gmail.com avec gmbs.paul@gmail.com"}', NULL,
  '19-12-2024', NULL,
  NOW(), NOW()
),
(
  '8396', '2024-11-17T00:00:00Z', 'Flatlooker', '91 Avenue Francis de Pressensé', NULL, 'Vénissieux', 
  'Annulé', 'Inter réalisé mais non concluante TERMINER 17 h devis supp 7530 / detartrage a pas marcher doit faire un devis pour remplacer les tuyau en PER', 'Plomberie',
  'francois ducrot', NULL, '07 71 81 14 32', '["749942419"]', NULL,
  250, NULL, 393.78,
  '{"texte": "07-02-2025 16:45 - Demande d''intervention ✅ ''brouillon'' à: mounir.belhares@gmail.com avec samuel.gmbs@gmail.com"}', NULL,
  '07-02-2025', NULL,
  NOW(), NOW()
)
ON CONFLICT (id_inter) DO NOTHING;

-- ========================================
-- 6️⃣ ASSOCIATIONS GESTIONNAIRES-INTERVENTIONS
-- ========================================

UPDATE public.interventions SET attribue_a = (SELECT id FROM public.users WHERE username = 'tom') WHERE id_inter IN ('5184', '5592', '5690');
UPDATE public.interventions SET attribue_a = (SELECT id FROM public.users WHERE username = 'andrea') WHERE id_inter IN ('5542');
UPDATE public.interventions SET attribue_a = (SELECT id FROM public.users WHERE username = 'dimitri') WHERE id_inter IN ('6683');
UPDATE public.interventions SET attribue_a = (SELECT id FROM public.users WHERE username = 'samuel') WHERE id_inter IN ('6334', '8396');
UPDATE public.interventions SET attribue_a = (SELECT id FROM public.users WHERE username = 'paul') WHERE id_inter IN ('7096', '7530');

-- ========================================
-- 7️⃣ TASKS (SAMPLE DATA)
-- ========================================

INSERT INTO public.tasks (
  title, description, status, priority, creator_id, assignee_id, 
  linked_intervention_id, due_date, created_at, updated_at
) VALUES
(
  'Relancer client pour acompte', 
  'Appeler M. Dupont pour récupérer l''acompte de 150€', 
  'todo', 2, 
  (SELECT id FROM public.users WHERE username = 'tom'), 
  (SELECT id FROM public.users WHERE username = 'tom'),
  (SELECT id FROM public.interventions WHERE id_inter = '5184'),
  NOW() + INTERVAL '2 days',
  NOW(), NOW()
),
(
  'Vérifier devis matériel', 
  'Contrôler les prix des matériaux pour l''intervention 5542', 
  'doing', 3, 
  (SELECT id FROM public.users WHERE username = 'andrea'), 
  (SELECT id FROM public.users WHERE username = 'andrea'),
  (SELECT id FROM public.interventions WHERE id_inter = '5542'),
  NOW() + INTERVAL '1 day',
  NOW(), NOW()
),
(
  'Planifier visite technique', 
  'Prendre RDV avec le client pour la visite technique', 
  'todo', 1, 
  (SELECT id FROM public.users WHERE username = 'dimitri'), 
  (SELECT id FROM public.users WHERE username = 'dimitri'),
  (SELECT id FROM public.interventions WHERE id_inter = '6683'),
  NOW() + INTERVAL '3 days',
  NOW(), NOW()
)
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
-- ✅ MOCKUP DATA COMPLETE
-- ========================================

-- Summary
SELECT 
  'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 
  'Artisans' as table_name, COUNT(*) as count FROM public.artisans
UNION ALL
SELECT 
  'Interventions' as table_name, COUNT(*) as count FROM public.interventions
UNION ALL
SELECT 
  'Tasks' as table_name, COUNT(*) as count FROM public.tasks
UNION ALL
SELECT 
  'Conversations' as table_name, COUNT(*) as count FROM public.conversations;
