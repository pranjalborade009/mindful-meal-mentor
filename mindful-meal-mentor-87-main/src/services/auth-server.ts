import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getCookies, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase";

const createRequestSupabaseClient = createServerOnlyFn(() => {
  const { url, publishableKey } = getServerSupabaseConfig();
  return createServerClient(url, publishableKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, {
            ...options,
            secure: import.meta.env.PROD,
            sameSite: "lax",
            path: "/",
          });
        }
        for (const [name, value] of Object.entries(headers)) {
          setResponseHeader(name, value);
        }
      },
    },
  });
});

export const getRequestAuthenticatedUser = createServerOnlyFn(async () => {
  setResponseHeader("cache-control", "private, no-store");
  const supabase = createRequestSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    const message = error.message.toLowerCase();
    const expiredSession =
      error.name === "AuthSessionMissingError" ||
      error.status === 401 ||
      message.includes("invalid refresh token") ||
      message.includes("refresh token not found") ||
      message.includes("jwt expired");
    if (expiredSession) return { supabase, user: null };
    throw new Error("Unable to verify your session. Please try again.");
  }

  return { supabase, user: data.user };
});

export const getAuthenticatedUser = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("cache-control", "private, no-store");
  const { supabase, user } = await getRequestAuthenticatedUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load your user profile.");

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? user.user_metadata["display_name"] ?? null,
  };
});
