// =============================================================
// Ficium — Admin data clients
// Thin re-export of the shared Supabase factory.
// =============================================================
import { institutionDb, adminDb, supabase } from "../../shared/lib/supabase";

export { institutionDb, adminDb };
export const publicDb = supabase;
