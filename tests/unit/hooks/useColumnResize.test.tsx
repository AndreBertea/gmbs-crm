import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useColumnResize, type ColumnWidths } from "@/hooks/useColumnResize";

const createPointerEvent = (type: string, clientX: number) => {
  const event = new Event(type) as PointerEvent;
  Object.defineProperty(event, "clientX", {
    value: clientX,
    configurable: true,
  });
  return event;
};

describe("useColumnResize", () => {
  const pointerId = 1;
  let separator: HTMLDivElement;
  let setPointerCapture: ReturnType<typeof vi.fn>;
  let releasePointerCapture: ReturnType<typeof vi.fn>;
  let hasPointerCapture: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    separator = document.createElement("div");
    setPointerCapture = vi.fn();
    releasePointerCapture = vi.fn();
    hasPointerCapture = vi.fn(() => true);
    Object.assign(separator, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates column widths when pointer moves", () => {
    const onWidthsChange = vi.fn();
    const initialWidths: ColumnWidths = { date: 180, statut: 140 };

    const { result } = renderHook(() => useColumnResize(initialWidths, onWidthsChange));

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: separator,
      pointerId,
      clientX: 120,
    };

    act(() => {
      result.current.handlePointerDown(event as any, "date");
    });

    expect(setPointerCapture).toHaveBeenCalledWith(pointerId);

    act(() => {
      document.dispatchEvent(createPointerEvent("pointermove", 220));
    });

    expect(onWidthsChange).toHaveBeenLastCalledWith({
      date: 280,
      statut: 140,
    });

    act(() => {
      document.dispatchEvent(createPointerEvent("pointerup", 220));
    });

    expect(hasPointerCapture).toHaveBeenCalledWith(pointerId);
    expect(releasePointerCapture).toHaveBeenCalledWith(pointerId);

    const callCount = onWidthsChange.mock.calls.length;
    act(() => {
      document.dispatchEvent(createPointerEvent("pointermove", 260));
    });
    expect(onWidthsChange).toHaveBeenCalledTimes(callCount);
  });

  it("clamps width to the minimum value", () => {
    const onWidthsChange = vi.fn();
    const initialWidths: ColumnWidths = { client: 100 };

    const { result } = renderHook(() => useColumnResize(initialWidths, onWidthsChange));

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: separator,
      pointerId,
      clientX: 200,
    };

    act(() => {
      result.current.handlePointerDown(event as any, "client");
    });

    act(() => {
      document.dispatchEvent(createPointerEvent("pointermove", 50));
    });

    expect(onWidthsChange).toHaveBeenLastCalledWith({
      client: 60,
    });
  });

  it("clamps width to the maximum value", () => {
    const onWidthsChange = vi.fn();
    const initialWidths: ColumnWidths = { client: 400 };

    const { result } = renderHook(() => useColumnResize(initialWidths, onWidthsChange));

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: separator,
      pointerId,
      clientX: 100,
    };

    act(() => {
      result.current.handlePointerDown(event as any, "client");
    });

    act(() => {
      document.dispatchEvent(createPointerEvent("pointermove", 1200));
    });

    expect(onWidthsChange).toHaveBeenLastCalledWith({
      client: 800,
    });
  });
});
