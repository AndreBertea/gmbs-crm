import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useProgressiveLoad } from "@/hooks/useProgressiveLoad";

type Item = { id: string };

describe("useProgressiveLoad", () => {
  it("loads batches progressively until completion", async () => {
    const firstBatch: Item[] = [{ id: "1" }, { id: "2" }];
    const secondBatch: Item[] = [{ id: "3" }, { id: "4" }];

    const fetchBatch = vi.fn<(offset: number, limit: number) => Promise<Item[]>>();
    fetchBatch.mockImplementation(async (offset) => {
      if (offset === 0) return firstBatch;
      if (offset === 2) return secondBatch;
      return [];
    });

    const fetchTotal = vi.fn(async () => 4);

    const { result } = renderHook(() =>
      useProgressiveLoad<Item>({
        initialBatchSize: 2,
        batchSize: 2,
        fetchBatch,
        fetchTotal,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loaded).toBe(2);
      expect(result.current.total).toBe(4);
      expect(result.current.isLoading).toBe(true);
    });

    expect(fetchBatch).toHaveBeenCalledWith(0, 2);

    await waitFor(() => {
      expect(result.current.loaded).toBe(4);
    });

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });

    expect(fetchBatch).toHaveBeenCalledWith(2, 2);
    expect(result.current.data).toHaveLength(4);
    expect(result.current.progress).toBeCloseTo(100, 5);
  });

  it("captures errors thrown by fetchBatch", async () => {
    const error = new Error("Network down");
    const fetchBatch = vi.fn(async () => {
      throw error;
    });

    const { result } = renderHook(() =>
      useProgressiveLoad<Item>({
        initialBatchSize: 1,
        batchSize: 1,
        fetchBatch,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe(error.message);
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.loaded).toBe(0);
    expect(result.current.data).toEqual([]);
  });
});
