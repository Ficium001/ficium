// ─────────────────────────────────────────────────────────────────────────────
// API surface for the Markets feature.
// This is the ONLY file that decides which adapter is used.
// To go live: swap the import below to a real adapter — nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

export { fetchMarketData, fetchMarketNews } from "./mock";

// Future — just change the import above to one of:
// export { fetchMarketData, fetchMarketNews } from "./bom";
// export { fetchMarketData, fetchMarketNews } from "./supabase";
