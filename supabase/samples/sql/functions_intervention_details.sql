-- Fonction SQL pour récupérer les détails d'une intervention
-- Usage: SELECT * FROM get_intervention_details('uuid-de-l-intervention');

CREATE OR REPLACE FUNCTION get_intervention_details(intervention_uuid uuid)
RETURNS TABLE (
    -- Informations de base
    intervention_id uuid,
    intervention_external_id text,
    intervention_date timestamptz,
    intervention_adresse text,
    intervention_ville text,
    intervention_code_postal text,
    contexte_intervention text,
    consigne_intervention text,
    
    -- Statut
    statut_nom text,
    statut_color text,
    
    -- Métier
    metier_nom text,
    
    -- Gestionnaire
    gestionnaire_prenom text,
    gestionnaire_nom text,
    gestionnaire_nom_complet text,
    gestionnaire_email text,
    
    -- Artisan principal
    artisan_prenom text,
    artisan_nom text,
    artisan_plain_nom text,
    artisan_email text,
    artisan_telephone text,
    artisan_statut_nom text,
    artisan_statut_color text,
    
    -- Coûts
    cout_total numeric,
    cout_sst numeric,
    cout_materiel numeric,
    cout_intervention numeric,
    
    -- Locataire
    tenant_prenom text,
    tenant_nom text,
    tenant_nom_complet text,
    tenant_email text,
    tenant_telephone text,
    
    -- Propriétaire
    owner_prenom text,
    owner_nom text,
    owner_nom_complet text,
    owner_email text,
    owner_telephone text,
    
    -- Agence
    agence_nom text,
    
    -- Timestamps
    intervention_created_at timestamptz,
    intervention_updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH intervention_data AS (
        SELECT 
            i.id,
            i.id_inter,
            i.date,
            i.adresse,
            i.ville,
            i.code_postal,
            i.contexte_intervention,
            i.consigne_intervention,
            i.statut_id,
            i.metier_id,
            i.assigned_user_id,
            i.agence_id,
            i.tenant_id,
            i.owner_id,
            i.created_at,
            i.updated_at
        FROM interventions i
        WHERE i.id = intervention_uuid AND i.is_active = true
    ),
    costs_summary AS (
        SELECT 
            intervention_id,
            SUM(CASE WHEN cost_type = 'marge' THEN amount ELSE 0 END) as cout_total,
            SUM(CASE WHEN cost_type = 'sst' THEN amount ELSE 0 END) as cout_sst,
            SUM(CASE WHEN cost_type = 'materiel' THEN amount ELSE 0 END) as cout_materiel,
            SUM(CASE WHEN cost_type = 'intervention' THEN amount ELSE 0 END) as cout_intervention
        FROM intervention_costs
        WHERE intervention_id = intervention_uuid
        GROUP BY intervention_id
    )
    SELECT 
        -- Informations de base
        id.id as intervention_id,
        id.id_inter as intervention_external_id,
        id.date as intervention_date,
        id.adresse as intervention_adresse,
        id.ville as intervention_ville,
        id.code_postal as intervention_code_postal,
        id.contexte_intervention,
        id.consigne_intervention,
        
        -- Statut
        ist.label as statut_nom,
        ist.color as statut_color,
        
        -- Métier
        m.label as metier_nom,
        
        -- Gestionnaire
        u.first_name as gestionnaire_prenom,
        u.last_name as gestionnaire_nom,
        CONCAT(u.first_name, ' ', u.last_name) as gestionnaire_nom_complet,
        u.email as gestionnaire_email,
        
        -- Artisan principal
        a.prenom as artisan_prenom,
        a.nom as artisan_nom,
        a.plain_nom as artisan_plain_nom,
        a.email as artisan_email,
        a.telephone as artisan_telephone,
        
        -- Statut artisan
        ast.label as artisan_statut_nom,
        ast.color as artisan_statut_color,
        
        -- Coûts
        COALESCE(cs.cout_total, 0) as cout_total,
        COALESCE(cs.cout_sst, 0) as cout_sst,
        COALESCE(cs.cout_materiel, 0) as cout_materiel,
        COALESCE(cs.cout_intervention, 0) as cout_intervention,
        
        -- Locataire
        t.firstname as tenant_prenom,
        t.lastname as tenant_nom,
        CONCAT(t.firstname, ' ', t.lastname) as tenant_nom_complet,
        t.email as tenant_email,
        t.telephone as tenant_telephone,
        
        -- Propriétaire
        o.owner_firstname as owner_prenom,
        o.owner_lastname as owner_nom,
        CONCAT(o.owner_firstname, ' ', o.owner_lastname) as owner_nom_complet,
        o.email as owner_email,
        o.telephone as owner_telephone,
        
        -- Agence
        ag.label as agence_nom,
        
        -- Timestamps
        id.created_at as intervention_created_at,
        id.updated_at as intervention_updated_at

    FROM intervention_data id
        LEFT JOIN intervention_statuses ist ON id.statut_id = ist.id
        LEFT JOIN metiers m ON id.metier_id = m.id
        LEFT JOIN users u ON id.assigned_user_id = u.id
        LEFT JOIN agencies ag ON id.agence_id = ag.id
        LEFT JOIN tenants t ON id.tenant_id = t.id
        LEFT JOIN owner o ON id.owner_id = o.id
        LEFT JOIN intervention_artisans ia ON id.id = ia.intervention_id AND ia.is_primary = true
        LEFT JOIN artisans a ON ia.artisan_id = a.id
        LEFT JOIN artisan_statuses ast ON a.statut_id = ast.id
        LEFT JOIN costs_summary cs ON id.id = cs.intervention_id;
END;
$$;

-- ========================================
-- FONCTION SIMPLIFIÉE (juste les données demandées)
-- ========================================

CREATE OR REPLACE FUNCTION get_intervention_summary(intervention_uuid uuid)
RETURNS TABLE (
    artisan_plain_nom text,
    cout_intervention numeric,
    statut_nom text,
    gestionnaire_nom text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.plain_nom as artisan_plain_nom,
        COALESCE(SUM(ic.amount), 0) as cout_intervention,
        ist.label as statut_nom,
        CONCAT(u.first_name, ' ', u.last_name) as gestionnaire_nom
    FROM interventions i
        LEFT JOIN intervention_artisans ia ON i.id = ia.intervention_id AND ia.is_primary = true
        LEFT JOIN artisans a ON ia.artisan_id = a.id
        LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
        LEFT JOIN intervention_statuses ist ON i.statut_id = ist.id
        LEFT JOIN users u ON i.assigned_user_id = u.id
    WHERE i.id = intervention_uuid AND i.is_active = true
    GROUP BY a.plain_nom, ist.label, u.first_name, u.last_name;
END;
$$;

-- ========================================
-- EXEMPLES D'UTILISATION
-- ========================================

-- Exemple 1: Récupérer tous les détails d'une intervention
-- SELECT * FROM get_intervention_details('123e4567-e89b-12d3-a456-426614174000');

-- Exemple 2: Récupérer juste le résumé d'une intervention
-- SELECT * FROM get_intervention_summary('123e4567-e89b-12d3-a456-426614174000');

-- Exemple 3: Utiliser la requête directe avec paramètre
-- SELECT artisan_plain_nom, cout_intervention, statut_nom, gestionnaire_nom
-- FROM get_intervention_summary('123e4567-e89b-12d3-a456-426614174000');

-- Exemple 4: Requête pour plusieurs interventions
-- SELECT i.id, s.* 
-- FROM interventions i
-- CROSS JOIN LATERAL get_intervention_summary(i.id) s
-- WHERE i.is_active = true
-- LIMIT 10;
