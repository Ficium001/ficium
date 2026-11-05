// Regression: an alert kind the app doesn't know yet must render, not crash the page.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Alerts from "./Alerts";

const now = new Date().toISOString();
vi.mock("../hooks/useAlerts", () => ({
  useNotifications: () => ({
    isLoading: false,
    data: [
      { id: "a", kind: "request_declined_by_provider", title: "A provider declined your request", body: null, link: null, readAt: null, createdAt: now },
      { id: "b", kind: "some_future_kind", title: "Something new", body: null, link: null, readAt: null, createdAt: now },
    ],
  }),
  useMarkAllRead: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkOneRead: () => ({ mutate: vi.fn(), isPending: false }),
  useClearAll: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@example.com" }, isLoading: false, signOut: vi.fn() }),
}));
vi.mock("@/shared/notifications/useUnreadCount", () => ({ useUnreadCount: () => ({ data: 0 }) }));

describe("Alerts", () => {
  it("renders known and unknown kinds without crashing", () => {
    render(<MemoryRouter><Alerts /></MemoryRouter>);
    expect(screen.getByText("A provider declined your request")).toBeTruthy();
    expect(screen.getByText("Something new")).toBeTruthy();
  });
});
