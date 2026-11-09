import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { getAuthService } from "@/services/auth-service";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Verifying account — NUTRIFY" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const started = useRef(false);
  const [message, setMessage] = useState("Verifying your email address…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get("code") ?? hashParams.get("code");
    const tokenHash = params.get("token_hash") ?? hashParams.get("token_hash");
    const type = params.get("type") ?? hashParams.get("type");
    const providerError =
      params.has("error") ||
      params.has("error_code") ||
      hashParams.has("error") ||
      hashParams.has("error_code");
    window.history.replaceState({}, document.title, window.location.pathname);

    if (providerError) {
      setMessage(
        "This verification link could not be used. It may have expired; request a new one and try again.",
      );
      return;
    }

    void Promise.resolve()
      .then(() => getAuthService().completeAuthCallback({ code, tokenHash, type }))
      .then(() => {
        window.location.assign("/dashboard");
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify this link. Request a new one and try again.",
        );
      });
  }, []);

  return (
    <AuthLayout title="Verify your account" subtitle={message}>
      <p role="status" className="text-center text-sm text-muted-foreground">
        {message}
      </p>
      {message !== "Verifying your email address…" && (
        <p className="mt-5 text-center text-sm">
          <a href="/login" className="text-primary hover:underline">
            Return to login
          </a>
        </p>
      )}
    </AuthLayout>
  );
}
