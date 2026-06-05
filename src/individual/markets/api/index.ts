// ─────────────────────────────────────────────────────────────────────────────
// Markets API surface — single import controls the active data source.
// Switch by changing the export below. Nothing else in the codebase changes.
// ─────────────────────────────────────────────────────────────────────────────

export { fetchMarketData, fetchMarketNews } from "./supabase";

// To fall back to mock during development:
// export { fetchMarketData, fetchMarketNews } from "./mock";
