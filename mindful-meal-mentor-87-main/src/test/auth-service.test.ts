import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { AuthServiceError, createAuthService, getAuthRedirectPath } from "@/services/auth-service";

function makeAuth(overrides: Record<string, unknown> = {}) {
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  };
  return auth as unknown as Pick<
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
}

const origin = () => "https://nutrify.example";

describe("authentication service", () => {
  it("creates an account with normalized email, display name, and email verification callback", async () => {
    const user = { id: "user-1", email: "user@example.com" };
    const auth = makeAuth({
      signUp: vi.fn().mockResolvedValue({ data: { user, session: null }, error: null }),
    });

    const result = await createAuthService(auth, origin).signUp({
      email: " User@Example.com ",
      password: "passphrase",
      displayName: "  User Name ",
    });

    expect(result).toEqual({
      user,
      emailVerificationRequired: true,
      accountMayAlreadyExist: false,
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "passphrase",
      options: {
        data: { display_name: "User Name" },
        emailRedirectTo: "https://nutrify.example/auth/callback",
      },
    });
  });

  it("returns an authenticated registration result when Supabase returns a session", async () => {
    const user = { id: "user-2", email: "new@example.com" };
    const session = { access_token: "signup-session" };
    const auth = makeAuth({
      signUp: vi.fn().mockResolvedValue({ data: { user, session }, error: null }),
    });

    await expect(
      createAuthService(auth, origin).signUp({
        email: " New@Example.com ",
        password: "registration-password",
        displayName: "New User",
      }),
    ).resolves.toMatchObject({
      user,
      emailVerificationRequired: false,
      accountMayAlreadyExist: false,
    });
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        password: "registration-password",
        options: expect.objectContaining({
          emailRedirectTo: "https://nutrify.example/auth/callback",
        }),
      }),
    );
  });

  it("does not misreport a signup API error as an expired verification link", async () => {
    const auth = makeAuth({
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: new Error("Invalid redirect configuration"),
      }),
    });

    await expect(
      createAuthService(auth, origin).signUp({
        email: "user@example.com",
        password: "passphrase",
        displayName: "User",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      message: "Invalid redirect configuration",
    });
  });

  it("explains the Supabase email rate limit without reporting signup success", async () => {
    const auth = makeAuth({
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: Object.assign(new Error("Email rate limit exceeded"), {
          code: "over_email_send_rate_limit",
        }),
      }),
    });

    await expect(
      createAuthService(auth, origin).signUp({
        email: "user@example.com",
        password: "passphrase",
        displayName: "User",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      message:
        "Supabase has temporarily limited registration emails. Please wait before trying again.",
    });
  });

  it("reports duplicate account errors without returning success", async () => {
    const auth = makeAuth({
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: new Error("User already registered"),
      }),
    });

    await expect(
      createAuthService(auth, origin).signUp({
        email: "user@example.com",
        password: "passphrase",
        displayName: "User",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      message: expect.stringContaining("may already exist"),
    });
  });

  it("marks Supabase's non-enumerating duplicate signup response without claiming account creation", async () => {
    const auth = makeAuth({
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: "existing-user", identities: [] }, session: null },
        error: null,
      }),
    });

    await expect(
      createAuthService(auth, origin).signUp({
        email: "user@example.com",
        password: "passphrase",
        displayName: "User",
      }),
    ).resolves.toMatchObject({ emailVerificationRequired: true, accountMayAlreadyExist: true });
  });

  it("signs in and uses a local-scope sign out", async () => {
    const user = { id: "user-1", email: "user@example.com" };
    const auth = makeAuth({
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: { user, session: { access_token: "token" } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    });
    const service = createAuthService(auth, origin);

    await expect(
      service.signIn({ email: " User@Example.com ", password: "passphrase" }),
    ).resolves.toBe(user);
    await service.signOut();

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "passphrase",
    });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("maps invalid credentials to a safe user-facing error", async () => {
    const auth = makeAuth({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: new Error("Invalid login credentials"),
      }),
    });

    await expect(
      createAuthService(auth, origin).signIn({
        email: "user@example.com",
        password: "wrong",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      message: "Email or password is incorrect.",
    });
  });

  it("reads the current session and unsubscribes from auth changes", async () => {
    const session = { access_token: "mock-session" };
    const unsubscribe = vi.fn();
    const auth = makeAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } }),
    });
    const service = createAuthService(auth, origin);
    const callback = vi.fn();

    await expect(service.getCurrentSession()).resolves.toBe(session);
    service.onAuthStateChange(callback)();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("sends reset email to the configured completion path", async () => {
    const auth = makeAuth({ resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }) });

    await createAuthService(auth, origin).sendPasswordResetEmail(" User@Example.com ");

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://nutrify.example/reset-password",
    });
  });

  it("exchanges the recovery code before updating the password", async () => {
    const auth = makeAuth({
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    });

    await createAuthService(auth, origin).completePasswordReset({
      code: "pkce-code",
      password: "new-passphrase",
    });

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-passphrase" });
  });

  it("verifies email links and rejects missing/expired reset tokens", async () => {
    const auth = makeAuth({
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    });
    const service = createAuthService(auth, origin);

    await service.completeAuthCallback({ tokenHash: "email-token", type: "signup" });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "email-token", type: "signup" });
    await expect(
      service.completePasswordReset({ password: "new-passphrase" }),
    ).rejects.toBeInstanceOf(AuthServiceError);
  });

  it("reports expired verification links only while handling a callback", async () => {
    const auth = makeAuth({
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        error: new Error("Token has expired or is invalid"),
      }),
    });

    await expect(
      createAuthService(auth, origin).completeAuthCallback({
        code: "expired-pkce-code",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      message: "This link is invalid or has expired. Request a new link and try again.",
    });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("expired-pkce-code");
  });

  it("does not claim callback success when Supabase code exchange fails", async () => {
    const auth = makeAuth({
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        error: new Error("Network request failed"),
      }),
    });

    await expect(
      createAuthService(auth, origin).completeAuthCallback({
        code: "valid-shaped-but-unverified-code",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      message: "Unable to reach the authentication service. Check your connection and try again.",
    });
  });

  it("keeps expired password-reset-link failures in the reset flow", async () => {
    const auth = makeAuth({
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        error: new Error("Token has expired"),
      }),
    });

    await expect(
      createAuthService(auth, origin).completePasswordReset({
        code: "expired-recovery-code",
        password: "new-passphrase",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      message: "This link is invalid or has expired. Request a new link and try again.",
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("keeps return destinations on this application", () => {
    expect(getAuthRedirectPath("/diary?date=today")).toBe("/diary?date=today");
    expect(getAuthRedirectPath("//evil.example")).toBe("/dashboard");
    expect(getAuthRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(getAuthRedirectPath("/\\evil.example")).toBe("/dashboard");
  });
});
