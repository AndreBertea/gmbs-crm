const {
  artisansApi,
  interventionsApi,
  documentsApi,
  tenantsApi,
  ownersApi,
} = require("../../../src/lib/api/v2");
const { dataValidator } = require("../../data-processing/data-validator");

class DatabaseManager {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      upsert: false,
      batchSize: 50,
      verbose: false,
      ...options,
    };

    // Référence au DataMapper pour les opérations de mapping
    this.dataMapper = options.dataMapper || null;

    // Cache des artisans pour la recherche par email
    this.artisansCache = null;
  }

  log(message, level = "info") {
    if (level === "verbose" && !this.options.verbose) return;
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warning" ? "⚠️" : "✅";
    console.log(`${prefix} [DB-MANAGER] ${message}`);
  }

  // ===== MÉTHODES DE RÉSOLUTION DES RELATIONS =====

  /**
   * Trouve ou crée un tenant (locataire)
   * @param {Object} tenantData - {firstname, lastname, email, telephone}
   * @returns {string} - ID du tenant
   */
  async findOrCreateTenant(tenantData) {
    if (!tenantData || (!tenantData.email && !tenantData.telephone)) {
      throw new Error("Tenant requires email or telephone");
    }

    try {
      // Chercher d'abord par email
      if (tenantData.email) {
        const results = await tenantsApi.searchByEmail(tenantData.email);
        if (results && results.data && results.data.length > 0) {
          return results.data[0].id;
        }
      }

      // Chercher par téléphone
      if (tenantData.telephone) {
        const results = await tenantsApi.searchByPhone(tenantData.telephone);
        if (results && results.data && results.data.length > 0) {
          return results.data[0].id;
        }
      }

      // Créer si non trouvé
      const created = await tenantsApi.create({
        firstname: tenantData.firstname,
        lastname: tenantData.lastname,
        email: tenantData.email,
        telephone: tenantData.telephone,
        telephone2: tenantData.telephone2,
      });

      return created.id;
    } catch (error) {
      throw new Error(`Failed to find or create tenant: ${error.message}`);
    }
  }

  /**
   * Trouve ou crée un owner (propriétaire)
   * @param {Object} ownerData - {firstname, lastname, telephone, email}
   * @returns {string} - ID du owner
   */
  async findOrCreateOwner(ownerData) {
    if (!ownerData || !ownerData.telephone) {
      throw new Error("Owner requires telephone");
    }

    try {
      // Chercher par téléphone
      const results = await ownersApi.searchByPhone(ownerData.telephone);
      if (results && results.data && results.data.length > 0) {
        return results.data[0].id;
      }

      // Créer si non trouvé
      const created = await ownersApi.create({
        owner_firstname: ownerData.firstname,
        owner_lastname: ownerData.lastname,
        telephone: ownerData.telephone,
        email: ownerData.email,
      });

      return created.id;
    } catch (error) {
      throw new Error(`Failed to find or create owner: ${error.message}`);
    }
  }

  /**
   * Insère les coûts d'une intervention
   * @param {string} interventionId - ID de l'intervention
   * @param {Object} costsData - {sst, materiel, materielUrl, intervention, total, numeroSST}
   * @returns {Object} - {success, errors}
   */
  async insertCosts(interventionId, costsData) {
    const results = { success: 0, errors: 0, details: [] };

    if (!costsData || !interventionId) {
      this.log(
        `⚠️ insertCosts appelé sans données (interventionId: ${interventionId}, costsData: ${!!costsData})`,
        "verbose"
      );
      return results;
    }

    // Coût SST
    if (costsData.sst !== null && costsData.sst !== undefined) {
      try {
        await interventionsApi.addCost(interventionId, {
          cost_type: "sst",
          label: "Coût SST",
          amount: costsData.sst,
          currency: "EUR",
        });
        results.success++;
        this.log(`  ✓ Coût SST inséré: ${costsData.sst}€`, "verbose");
      } catch (error) {
        results.errors++;
        results.details.push({ type: "sst", error: error.message });
        this.log(`  ✗ Erreur coût SST: ${error.message}`, "warning");
      }
    }

    // Coût matériel (avec URL et numéro SST en metadata)
    if (costsData.materiel !== null && costsData.materiel !== undefined) {
      try {
        const metadata = {};
        if (costsData.materielUrl) metadata.url = costsData.materielUrl;
        if (costsData.numeroSST) metadata.numero_sst = costsData.numeroSST;

        await interventionsApi.addCost(interventionId, {
          cost_type: "materiel",
          label: "Coût Matériel",
          amount: costsData.materiel,
          currency: "EUR",
          metadata:
            Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
        });
        results.success++;
        this.log(`  ✓ Coût matériel inséré: ${costsData.materiel}€`, "verbose");
      } catch (error) {
        results.errors++;
        results.details.push({ type: "materiel", error: error.message });
        this.log(`  ✗ Erreur coût matériel: ${error.message}`, "warning");
      }
    }

    // Coût intervention
    if (
      costsData.intervention !== null &&
      costsData.intervention !== undefined
    ) {
      try {
        await interventionsApi.addCost(interventionId, {
          cost_type: "intervention",
          label: "Coût Intervention",
          amount: costsData.intervention,
          currency: "EUR",
        });
        results.success++;
        this.log(
          `  ✓ Coût intervention inséré: ${costsData.intervention}€`,
          "verbose"
        );
      } catch (error) {
        results.errors++;
        results.details.push({ type: "intervention", error: error.message });
        this.log(`  ✗ Erreur coût intervention: ${error.message}`, "warning");
      }
    }

    // Coût total (calculé)
    if (costsData.total !== null && costsData.total !== undefined) {
      try {
        await interventionsApi.addCost(interventionId, {
          cost_type: "total",
          label: "Coût Total",
          amount: costsData.total,
          currency: "EUR",
        });
        results.success++;
        this.log(`  ✓ Coût total inséré: ${costsData.total}€`, "verbose");
      } catch (error) {
        results.errors++;
        results.details.push({ type: "total", error: error.message });
        this.log(`  ✗ Erreur coût total: ${error.message}`, "warning");
      }
    }

    return results;
  }

  // ===== MÉTHODES D'INSERTION PAR LOTS =====

  async insertArtisanBatch(artisans, globalIndex = 0) {
    const results = {
      success: 0,
      errors: 0,
      details: [],
    };

    for (let i = 0; i < artisans.length; i++) {
      const artisan = artisans[i];
      const currentGlobalIndex = globalIndex + i;

      if (this.options.dryRun) {
        results.success++;
        results.details.push({
          index: currentGlobalIndex,
          artisan: artisan,
          success: true,
          dryRun: true,
        });
        this.log(
          `[DRY-RUN] Artisan ${currentGlobalIndex + 1}: ${artisan.prenom} ${
            artisan.nom
          }`,
          "verbose"
        );
        
        // Afficher les métiers en mode dry-run
        if (artisan.metiers && artisan.metiers.length > 0) {
          this.log(
            `  → Métiers: ${artisan.metiers.map(m => m.metier_id).join(', ')}`,
            "verbose"
          );
        }
      } else {
        try {
          // Extraire les métiers avant l'upsert
          const metiersData = artisan.metiers || [];
          
          // Nettoyer les données temporaires avant l'upsert
          delete artisan.metiers;

          // Utiliser l'API V2 avec upsertDirect pour éviter les doublons
          const upsertedArtisan = await artisansApi.upsertDirect(artisan);

          // Assigner les métiers après l'upsert
          if (metiersData.length > 0 && upsertedArtisan.id) {
            try {
              // Créer les relations métiers
              for (let j = 0; j < metiersData.length; j++) {
                const metier = metiersData[j];
                try {
                  await artisansApi.assignMetier(
                    upsertedArtisan.id,
                    metier.metier_id,
                    metier.is_primary || false
                  );
                  this.log(
                    `  → Métier assigné: ${metier.metier_id}${metier.is_primary ? ' (principal)' : ''}`,
                    "verbose"
                  );
                } catch (error) {
                  // Ignorer les doublons (contrainte unique)
                  if (
                    error.message &&
                    error.message.includes("duplicate key value violates unique constraint")
                  ) {
                    this.log(`  ℹ️ Métier déjà assigné: ${metier.metier_id}`, "verbose");
                  } else {
                    this.log(
                      `  ⚠️ Erreur assignation métier ${metier.metier_id}: ${error.message}`,
                      "warning"
                    );
                  }
                }
              }
            } catch (error) {
              this.log(
                `  ⚠️ Erreur lors de l'assignation des métiers: ${error.message}`,
                "warning"
              );
            }
          }

          results.success++;
          results.details.push({
            index: currentGlobalIndex,
            artisan: upsertedArtisan,
            success: true,
          });
          this.log(
            `✅ Artisan ${currentGlobalIndex + 1}: ${artisan.prenom} ${
              artisan.nom
            }`,
            "verbose"
          );
        } catch (error) {
          results.errors++;

          // Améliorer le message d'erreur
          let errorMessage = error.message || "Erreur lors de l'insertion";

          results.details.push({
            index: currentGlobalIndex,
            artisan: artisan,
            error: errorMessage,
          });
          this.log(
            `❌ Erreur artisan ${currentGlobalIndex + 1}: ${errorMessage}`,
            "error"
          );
        }
      }
    }

    return results;
  }

  async insertInterventionBatch(interventions, globalIndex = 0) {
    const results = {
      success: 0,
      errors: 0,
      details: [],
    };

    for (let i = 0; i < interventions.length; i++) {
      const intervention = interventions[i];
      const currentGlobalIndex = globalIndex + i;

      if (this.options.dryRun) {
        results.success++;
        results.details.push({
          index: currentGlobalIndex,
          intervention: intervention,
          success: true,
          dryRun: true,
        });
        this.log(
          `[DRY-RUN] Intervention ${currentGlobalIndex + 1}: ${
            intervention.id_inter
          }`,
          "verbose"
        );
      } else {
        // Validation avec InterventionValidator
        const validation = dataValidator.validate(intervention, "intervention");

        if (!validation.isValid) {
          this.log(
            `⚠️ Intervention ${
              currentGlobalIndex + 1
            } ignorée: ${validation.errors.join(", ")}`,
            "warning"
          );

          results.errors++;
          results.details.push({
            index: currentGlobalIndex,
            intervention: intervention,
            error: `Validation échouée: ${validation.errors.join(", ")}`,
            skipped: true,
          });

          continue; // Passer à l'intervention suivante
        }

        // Afficher les warnings (non bloquants)
        if (validation.warnings && validation.warnings.length > 0) {
          this.log(
            `  ℹ️ Warnings: ${validation.warnings.join(", ")}`,
            "verbose"
          );
        }

        try {
          // Extraire les données complémentaires
          const tenantData = intervention.tenant;
          const ownerData = intervention.owner;
          const costsData = intervention.costs;
          const artisanSSTId = intervention.artisanSST;

          // Résoudre les relations (find or create)
          if (tenantData && (tenantData.email || tenantData.telephone)) {
            try {
              intervention.tenant_id = await this.findOrCreateTenant(tenantData);
              this.log(`  → Tenant lié: ${intervention.tenant_id}`, "verbose");
            } catch (error) {
              this.log(`  ⚠️ Erreur tenant: ${error.message}`, "warning");
            }
          }

          if (ownerData && ownerData.telephone) {
            try {
              intervention.owner_id = await this.findOrCreateOwner(ownerData);
              this.log(`  → Owner lié: ${intervention.owner_id}`, "verbose");
            } catch (error) {
              this.log(`  ⚠️ Erreur owner: ${error.message}`, "warning");
            }
          }

          // Nettoyer les données temporaires avant l'upsert
          delete intervention.tenant;
          delete intervention.owner;
          delete intervention.costs;
          delete intervention.artisanSST;

          // Créer l'intervention
          const upsertedIntervention = await interventionsApi.upsertDirect(
            intervention
          );

          // Assigner l'artisan SST (si trouvé)
          if (artisanSSTId && upsertedIntervention.id) {
            try {
              await interventionsApi.assignArtisan(
                upsertedIntervention.id,
                artisanSSTId,
                "primary"
              );
              this.log(`  → Artisan SST assigné`, "verbose");
            } catch (error) {
              // Ignorer les doublons
              if (
                error.message &&
                error.message.includes(
                  "duplicate key value violates unique constraint"
                )
              ) {
                this.log(`  ℹ️ Artisan SST déjà assigné`, "verbose");
              } else {
                this.log(
                  `  ⚠️ Erreur assignation artisan SST: ${error.message}`,
                  "warning"
                );
              }
            }
          }

          // Créer les coûts
          if (costsData && upsertedIntervention.id) {
            try {
              await this.insertCosts(upsertedIntervention.id, costsData);
            } catch (error) {
              this.log(`  ⚠️ Erreur coûts: ${error.message}`, "warning");
            }
          }

          results.success++;
          results.details.push({
            index: currentGlobalIndex,
            intervention: upsertedIntervention,
            success: true,
          });
          this.log(
            `✅ Intervention ${currentGlobalIndex + 1}: ${
              intervention.id_inter
            }`,
            "verbose"
          );
        } catch (error) {
          results.errors++;

          let errorMessage = error.message || "Erreur lors de l'insertion";

          results.details.push({
            index: currentGlobalIndex,
            intervention: intervention,
            error: errorMessage,
          });
          this.log(
            `❌ Erreur intervention ${currentGlobalIndex + 1}: ${errorMessage}`,
            "error"
          );
        }
      }
    }

    return results;
  }

  // ===== MÉTHODES PRINCIPALES D'INSERTION =====

  async insertArtisans(artisans) {
    this.log(`📥 Insertion de ${artisans.length} artisans...`, "info");

    const results = {
      success: 0,
      errors: 0,
      details: [],
    };

    // Traitement par lots
    for (let i = 0; i < artisans.length; i += this.options.batchSize) {
      const batch = artisans.slice(i, i + this.options.batchSize);
      const batchResults = await this.insertArtisanBatch(batch, i);

      results.success += batchResults.success;
      results.errors += batchResults.errors;
      results.details.push(...batchResults.details);

      this.log(
        `📊 Lot ${Math.floor(i / this.options.batchSize) + 1}: ${
          batchResults.success
        } succès, ${batchResults.errors} erreurs`,
        "info"
      );
    }

    this.log(
      `✅ Insertion artisans terminée: ${results.success} succès, ${results.errors} erreurs`,
      "success"
    );
    return results;
  }

  async insertInterventions(interventions) {
    this.log(
      `📥 Insertion de ${interventions.length} interventions...`,
      "info"
    );

    const results = {
      success: 0,
      errors: 0,
      details: [],
    };

    // Traitement par lots
    for (let i = 0; i < interventions.length; i += this.options.batchSize) {
      const batch = interventions.slice(i, i + this.options.batchSize);
      const batchResults = await this.insertInterventionBatch(batch, i);

      results.success += batchResults.success;
      results.errors += batchResults.errors;
      results.details.push(...batchResults.details);

      this.log(
        `📊 Lot ${Math.floor(i / this.options.batchSize) + 1}: ${
          batchResults.success
        } succès, ${batchResults.errors} erreurs`,
        "info"
      );
    }

    this.log(
      `✅ Insertion interventions terminée: ${results.success} succès, ${results.errors} erreurs`,
      "success"
    );
    return results;
  }
}

module.exports = { DatabaseManager };
