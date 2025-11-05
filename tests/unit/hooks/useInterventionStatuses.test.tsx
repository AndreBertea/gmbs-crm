import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useInterventionStatuses } from "@/hooks/useInterventionStatuses";
import { interventionsApi } from "@/lib/api/v2";

const mockStatuses = [
  { id: "1", code: "DEMANDE", label: "Demandé", color: "#3B82F6", sort_order: 1 },
  { id: "2", code: "EN_COURS", label: "En cours", color: "#F59E0B", sort_order: 2 },
];

vi.mock("@/lib/api/v2", () => ({
  interventionsApi: {
    getAllStatuses: vi.fn(),
  },
}));

describe("useInterventionStatuses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads statuses on mount and builds lookup maps", async () => {
    vi.mocked(interventionsApi.getAllStatuses).mockResolvedValue(mockStatuses);

    const { result } = renderHook(() => useInterventionStatuses());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.statuses).toEqual(mockStatuses);
    expect(result.current.getStatusByCode("DEMANDE")).toEqual(mockStatuses[0]);
    expect(result.current.getStatusById("2")?.label).toBe("En cours");
  });

  it("saves error state when fetching fails", async () => {
    const error = new Error("Failed to load");
    vi.mocked(interventionsApi.getAllStatuses).mockRejectedValue(error);

    const { result } = renderHook(() => useInterventionStatuses());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.statuses).toEqual([]);
  });
});
