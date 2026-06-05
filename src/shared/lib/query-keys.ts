// =============================================================
// Ficium — Query Key Registry
//
// Single source of truth for all React Query cache keys.
// Importing from here prevents typos and makes cache
// invalidation patterns explicit and searchable.
//
// Convention:
//   QK.domain           → invalidates everything in domain
//   QK.domain.list      → invalidates list views
//   QK.domain.detail(id)→ invalidates one item
// =============================================================

export const QK = {
  // ── Individual / Client ────────────────────────────────────
  profile:       ["profile"]                              as const,
  snapshot:      ["financial_snapshot"]                   as const,

  requests: {
    all:          ["requests"]                            as const,
    list:         ["requests", "mine"]                    as const,
    detail:       (id: string) => ["requests", id]        as const,
    bids:         (id: string) => ["requests", id, "bids"]as const,
  },

  goals: {
    all:          ["goals"]                               as const,
    list:         ["goals", "mine"]                       as const,
    detail:       (id: string) => ["goals", id]           as const,
  },

  journeys: {
    all:          ["journeys"]                            as const,
    list:         ["journeys", "mine"]                    as const,
    detail:       (id: string) => ["journeys", id]        as const,
  },

  documents:     ["documents"]                            as const,
  notifications: ["notifications"]                        as const,

  // ── Institution ────────────────────────────────────────────
  institution: {
    me:           ["institution"]                         as const,
    members:      ["institution", "members"]              as const,
    myMembership: ["institution", "members", "me"]        as const,
  },

  marketplace:   ["marketplace"]                          as const,

  bids: {
    all:          ["bids"]                                as const,
    mine:         ["bids", "mine"]                        as const,
    forRequest:   (id: string) => ["bids", "request", id]as const,
  },

  pendingActions:["pending_actions"]                      as const,
  products:      ["products"]                             as const,
  webhooks:      ["webhooks"]                             as const,

  // ── Shared ─────────────────────────────────────────────────
  intelligence:  ["intelligence"]                         as const,
  marketData:    ["market_data"]                          as const,
  marketNews:    ["market_news"]                          as const,
  audit:         ["audit"]                                as const,
} as const;
