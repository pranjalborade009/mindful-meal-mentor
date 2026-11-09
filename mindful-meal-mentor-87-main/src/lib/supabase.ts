import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

function getPublicSupabaseConfig() {
  const url = import.meta.env["VITE_SUPABASE_URL"]?.trim();
  const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  try {
    new URL(url);
  } catch {
    throw new Error("VITE_SUPABASE_URL must be a valid URL.");
  }

  return { url, publishableKey };
}

export function getBrowserSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("The browser Supabase client can only be used in the browser.");
  }
  if (browserClient) return browserClient;

  const { url, publishableKey } = getPublicSupabaseConfig();
  browserClient = createBrowserClient(url, publishableKey, {
    auth: {
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  return browserClient;
}

export function getServerSupabaseConfig() {
  return getPublicSupabaseConfig();
}
