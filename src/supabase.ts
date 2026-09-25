import { createClient } from "@supabase/supabase-js";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "";
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";

// Supabase client must receive only the project root URL.
// This also protects the app if /rest/v1, /auth/v1 or a trailing slash was accidentally pasted.
function normalizeSupabaseUrl(value: string) {
  if (!value) return "";
  try {
    const u = new URL(value);
    u.pathname = "";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/(rest|auth|storage)\/v1.*$/i, "").replace(/\/$/, "");
  }
}

const url = normalizeSupabaseUrl(rawUrl);
export const supabaseConfigured = Boolean(url && anon);

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
