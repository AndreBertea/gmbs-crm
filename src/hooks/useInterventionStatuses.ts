import { useEffect, useMemo, useState } from "react";

import { interventionsApi } from "@/lib/api/v2";
import type { InterventionStatus } from "@/types/intervention";

interface UseInterventionStatusesReturn {
  statuses: InterventionStatus[];
  statusesById: Map<string, InterventionStatus>;
  statusesByCode: Map<string, InterventionStatus>;
  statusesByLabel: Map<string, InterventionStatus>;
  loading: boolean;
  error: Error | null;
  getStatusById: (id: string) => InterventionStatus | undefined;
  getStatusByCode: (code: string) => InterventionStatus | undefined;
  getStatusByLabel: (label: string) => InterventionStatus | undefined;
}

/**
 * Charge et met en cache la liste des statuts d'intervention.
 * Fournit des maps et helpers pour accéder rapidement aux statuts.
 */
export function useInterventionStatuses(): UseInterventionStatusesReturn {
  const [statuses, setStatuses] = useState<InterventionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStatuses() {
      try {
        setLoading(true);
        const data = await interventionsApi.getAllStatuses();
        if (!active) return;
        setStatuses(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err as Error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStatuses();

    return () => {
      active = false;
    };
  }, []);

  const statusesById = useMemo(() => {
    const map = new Map<string, InterventionStatus>();
    statuses.forEach((status) => {
      map.set(status.id, status);
    });
    return map;
  }, [statuses]);

  const statusesByCode = useMemo(() => {
    const map = new Map<string, InterventionStatus>();
    statuses.forEach((status) => {
      map.set(status.code, status);
    });
    return map;
  }, [statuses]);

  const statusesByLabel = useMemo(() => {
    const map = new Map<string, InterventionStatus>();
    statuses.forEach((status) => {
      map.set(status.label.toLowerCase(), status);
    });
    return map;
  }, [statuses]);

  const getStatusById = (id: string) => statusesById.get(id);
  const getStatusByCode = (code: string) => statusesByCode.get(code);
  const getStatusByLabel = (label: string) => statusesByLabel.get(label.toLowerCase());

  return {
    statuses,
    statusesById,
    statusesByCode,
    statusesByLabel,
    loading,
    error,
    getStatusById,
    getStatusByCode,
    getStatusByLabel,
  };
}
