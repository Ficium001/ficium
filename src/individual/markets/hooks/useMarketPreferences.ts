import { useCallback, useEffect, useState } from "react";
import { supabase , getCachedUser } from "@/shared/lib/supabase";
import {
  DEFAULT_MARKET_PREFERENCES,
  type MarketPreferences,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// useMarketPreferences — loads the signed-in user's market feed preferences
// from public.market_preferences (owner-only RLS) and exposes a save().
//
// Signed-out users get in-memory defaults (no localStorage: prefs only
// persist against a real account, consistent with the platform's stance
// on client-side state for anything account-shaped).
// ─────────────────────────────────────────────────────────────────────────────

interface UseMarketPreferencesReturn {
  preferences: MarketPreferences;
  /** True once the initial load settled (row found or defaulted). */
  isReady: boolean;
  /** True when the user has a persisted row (drives "Personalised" UI state). */
  hasSaved: boolean;
  isSaving: boolean;
  save: (next: MarketPreferences) => Promise<boolean>;
}

interface PreferencesRow {
  categories:   string[] | null;
  currencies:   string[] | null;
  scopes:       string[] | null;
  default_mode: string   | null;
}

function fromRow(row: PreferencesRow): MarketPreferences {
  return {
    categories:  (row.categories  ?? []) as MarketPreferences["categories"],
    currencies:  (row.currencies  ?? []) as MarketPreferences["currencies"],
    scopes:      (row.scopes?.length ? row.scopes : ["local", "global"]) as MarketPreferences["scopes"],
    defaultMode: row.default_mode === "finance" ? "finance" : "everyday",
  };
}

export function useMarketPreferences(): UseMarketPreferencesReturn {
  const [preferences, setPreferences] = useState<MarketPreferences>(DEFAULT_MARKET_PREFERENCES);
  const [isReady,  setIsReady]  = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await getCachedUser();
        if (!auth?.user) return;
        const { data, error } = await supabase
          .from("market_preferences")
          .select("categories,currencies,scopes,default_mode")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (error) {
          console.error("[markets] preferences load error:", error);
          return;
        }
        if (!cancelled && data) {
          setPreferences(fromRow(data as PreferencesRow));
          setHasSaved(true);
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (next: MarketPreferences): Promise<boolean> => {
    setPreferences(next); // optimistic — the feed re-ranks immediately
    const { data: auth } = await getCachedUser();
    if (!auth?.user) return true; // signed-out: in-memory only, still "works"

    setIsSaving(true);
    try {
      const { error } = await supabase.from("market_preferences").upsert({
        user_id:      auth.user.id,
        categories:   next.categories,
        currencies:   next.currencies,
        scopes:       next.scopes,
        default_mode: next.defaultMode,
        updated_at:   new Date().toISOString(),
      });
      if (error) {
        console.error("[markets] preferences save error:", error);
        return false;
      }
      setHasSaved(true);
      return true;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { preferences, isReady, hasSaved, isSaving, save };
}
