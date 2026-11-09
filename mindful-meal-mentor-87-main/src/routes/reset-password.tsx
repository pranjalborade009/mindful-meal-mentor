import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthService } from "@/services/auth-service";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — NUTRIFY" },
      { name: "description", content: "Choose a new password for your NUTRIFY account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [recovery, setRecovery] = useState<{ code?: string; tokenHash?: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? undefined;
    const tokenHash = params.get("token_hash") ?? undefined;
    window.history.replaceState({}, document.title, window.location.pathname);
    setRecovery(
      code || tokenHash ? { ...(code ? { code } : {}), ...(tokenHash ? { tokenHash } : {}) } : {},
    );
  }, []);

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter and confirm a new password for your account."
    >
      {complete ? (
        <div className="space-y-4 rounded-xl border bg-card p-6 text-center">
          <p role="status" className="font-medium text-forest">
            Your password has been updated.
          </p>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Continue to login
          </Link>
        </div>
      ) : recovery && !recovery.code && !recovery.tokenHash ? (
        <div className="space-y-3 rounded-xl border bg-card p-6 text-center">
          <p role="alert" className="font-medium text-forest">
            This reset link is missing or expired.
          </p>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Request another reset link
          </Link>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(undefined);
            if (password.length < 8) {
              setError("Use at least 8 characters.");
              return;
            }
            if (password !== confirmation) {
              setError("Passwords do not match.");
              return;
            }
            if (!recovery) return;

            setLoading(true);
            try {
              await getAuthService().completePasswordReset({ ...recovery, password });
              setComplete(true);
              toast.success("Your password has been updated.");
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to update your password. Request a new reset link.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <Field id="password" label="New password" error={error}>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 bg-card pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((visible) => !visible)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-forest"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Field id="confirm-password" label="Confirm new password">
            <Input
              id="confirm-password"
              type={show ? "text" : "password"}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-11 bg-card"
            />
          </Field>
          <Button
            type="submit"
            variant="forest"
            size="lg"
            className="w-full"
            disabled={loading || !recovery}
          >
            {loading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      )}
      <Link
        to="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="size-4" /> Return to login
      </Link>
    </AuthLayout>
  );
}
