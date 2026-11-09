import type { AuthChangeEvent, EmailOtpType, Session, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase";

type AuthApi = Pick<
  SupabaseClient["auth"],
  | "signUp"
  | "signInWithPassword"
  | "signOut"
  | "getSession"
  | "onAuthStateChange"
  | "resetPasswordForEmail"
  | "exchangeCodeForSession"
  | "verifyOtp"
  | "updateUser"
>;

export class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function providerMessage(error: unknown, fallback: string, linkOperation = false): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.toLowerCase();
  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code.toLowerCase()
      : "";
  if (
    message.includes("rate limit") ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return "Supabase has temporarily limited registration emails. Please wait before trying again.";
  }
  if (message.includes("invalid api key") || message.includes("invalid jwt")) {
    return "Supabase rejected the project credentials. Check the project URL and publishable key configuration.";
  }
  if (message.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (message.includes("email not confirmed"))
    return "Verify your email address before signing in.";
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email may already exist. Try signing in or resetting your password.";
  }
  if (message.includes("password") && (message.includes("weak") || message.includes("short"))) {
    return "Choose a stronger password and try again.";
  }
  if (
    linkOperation &&
    (message.includes("expired") || message.includes("invalid") || message.includes("otp"))
  ) {
    return "This link is invalid or has expired. Request a new link and try again.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Unable to reach the authentication service. Check your connection and try again.";
  }
  return error.message || fallback;
}

function requireSuccess(error: unknown, fallback: string): void {
  if (error) throw new AuthServiceError(providerMessage(error, fallback));
}

export function createAuthService(auth: AuthApi, getOrigin: () => string) {
  const redirectUrl = (path: string) => new URL(path, getOrigin()).toString();

  return {
    async signUp(input: { email: string; password: string; displayName: string }) {
      const { data, error } = await auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: { display_name: input.displayName.trim() },
          emailRedirectTo: redirectUrl("/auth/callback"),
        },
      });
      requireSuccess(error, "Unable to create your account. Please try again.");
      if (!data.user)
        throw new AuthServiceError("The authentication service did not return an account.");
      return {
        user: data.user,
        emailVerificationRequired: data.session === null,
        accountMayAlreadyExist: data.session === null && data.user.identities?.length === 0,
      };
    },

    async signIn(input: { email: string; password: string }) {
      const { data, error } = await auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
      requireSuccess(error, "Unable to sign in. Please try again.");
      if (!data.user || !data.session) {
        throw new AuthServiceError("Sign in did not establish a session. Please try again.");
      }
      return data.user;
    },

    async signOut() {
      const { error } = await auth.signOut({ scope: "local" });
      requireSuccess(error, "Unable to sign out. Please try again.");
    },

    async getCurrentSession(): Promise<Session | null> {
      const { data, error } = await auth.getSession();
      requireSuccess(error, "Unable to read the current authentication session.");
      return data.session;
    },

    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
      const { data } = auth.onAuthStateChange(callback);
      return () => data.subscription.unsubscribe();
    },

    async sendPasswordResetEmail(email: string) {
      const { error } = await auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl("/reset-password"),
      });
      requireSuccess(error, "Unable to request a password reset. Please try again.");
    },

    async completeAuthCallback(input: {
      code?: string | null;
      tokenHash?: string | null;
      type?: string | null;
    }) {
      if (input.code) {
        const { error } = await auth.exchangeCodeForSession(input.code);
        if (error) {
          throw new AuthServiceError(
            providerMessage(
              error,
              "Unable to verify this link. Request a new link and try again.",
              true,
            ),
          );
        }
        return;
      }

      const supportedTypes: EmailOtpType[] = [
        "signup",
        "invite",
        "magiclink",
        "email_change",
        "email",
      ];
      if (input.tokenHash && input.type && supportedTypes.includes(input.type as EmailOtpType)) {
        const { error } = await auth.verifyOtp({
          token_hash: input.tokenHash,
          type: input.type as EmailOtpType,
        });
        if (error) {
          throw new AuthServiceError(
            providerMessage(
              error,
              "Unable to verify this link. Request a new link and try again.",
              true,
            ),
          );
        }
        return;
      }

      throw new AuthServiceError("This verification link is incomplete or has expired.");
    },

    async completePasswordReset(input: {
      code?: string | null;
      tokenHash?: string | null;
      password: string;
    }) {
      if (input.code) {
        const { error } = await auth.exchangeCodeForSession(input.code);
        if (error) {
          throw new AuthServiceError(
            providerMessage(
              error,
              "Unable to verify the password reset link. Request a new one.",
              true,
            ),
          );
        }
      } else if (input.tokenHash) {
        const { error } = await auth.verifyOtp({ token_hash: input.tokenHash, type: "recovery" });
        if (error) {
          throw new AuthServiceError(
            providerMessage(
              error,
              "Unable to verify the password reset link. Request a new one.",
              true,
            ),
          );
        }
      } else {
        throw new AuthServiceError(
          "This reset link is incomplete or has expired. Request a new one.",
        );
      }

      const { error } = await auth.updateUser({ password: input.password });
      requireSuccess(
        error,
        "Unable to update your password. Request a new reset link and try again.",
      );
    },
  };
}

function getOrigin(): string {
  if (typeof window === "undefined") {
    throw new Error("Authentication redirects can only be created in the browser.");
  }
  return window.location.origin;
}

export function getAuthService() {
  return createAuthService(getBrowserSupabaseClient().auth, getOrigin);
}

export function getAuthRedirectPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/dashboard";
  }

  try {
    const parsed = new URL(value, "https://nutrify.invalid");
    if (parsed.origin !== "https://nutrify.invalid") return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
