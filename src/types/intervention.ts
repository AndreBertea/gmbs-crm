import type { Intervention } from "@/lib/api/v2/common/types";

export interface InterventionStatus {
  id: string;
  code: string;
  label: string;
  color: string;
  sort_order: number | null;
}

export interface InterventionWithStatus extends Intervention {
  status?: InterventionStatus | null;
}
