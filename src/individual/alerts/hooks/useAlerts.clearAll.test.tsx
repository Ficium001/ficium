// useClearAll — optimistic clear + rollback-on-error behaviour.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useClearAll, NotificationQueryKeys } from "./useAlerts";
import type { AppNotification } from "../api/notifications";

const clearAllNotifications = vi.hoisted(() => vi.fn());
vi.mock("../api/notifications", () => ({
  clearAllNotifications,
  getMyNotifications: vi.fn(),
  markAllRead: vi.fn(),
  markOneRead: vi.fn(),
}));
vi.mock("@/shared/notifications/useUnreadCount", () => ({
  useUnreadCount: vi.fn(),
}));

const SEED: AppNotification[] = [
  { id: "n1", kind: "bid_received", title: "New bid", body: null, link: null, readAt: null, createdAt: new Date().toISOString() },
  { id: "n2", kind: "system",       title: "Welcome", body: null, link: null, readAt: null, createdAt: new Date().toISOString() },
];

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  qc.setQueryData(NotificationQueryKeys.list, SEED);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe("useClearAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("optimistically empties the list and calls the API", async () => {
    clearAllNotifications.mockResolvedValueOnce(undefined);
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useClearAll(), { wrapper });

    act(() => result.current.mutate());

    await waitFor(() =>
      expect(qc.getQueryData(NotificationQueryKeys.list)).toEqual([]),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clearAllNotifications).toHaveBeenCalledTimes(1);
  });

  it("rolls back to the previous list when the delete fails", async () => {
    clearAllNotifications.mockRejectedValueOnce(new Error("boom"));
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useClearAll(), { wrapper });

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(qc.getQueryData(NotificationQueryKeys.list)).toEqual(SEED);
  });
});
