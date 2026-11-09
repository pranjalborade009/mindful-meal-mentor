import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck, ArrowLeft } from "lucide-react";
import { AuthLayout, Field } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAuthService } from "@/services/auth-service";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — NUTRIFY" },
      { name: "description", content: "Request a password reset link for your NUTRIFY account." },
      { property: "og:title", content: "Reset password — NUTRIFY" },
      {
        property: "og:description",
        content: "Request a password reset link for your NUTRIFY account.",
      },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter the email linked to your account and we'll send a reset link."
    >
      {sent ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <MailCheck className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-medium text-forest">
            If an account matches that email, a reset link has been sent.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your inbox and follow the link to choose a new password.
          </p>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(undefined);
            setLoading(true);
            try {
              await getAuthService().sendPasswordResetEmail(email);
              setSent(true);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to request a password reset. Please try again.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <Field id="email" label="Email address" error={error}>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 bg-card"
            />
          </Field>
          <Button type="submit" variant="forest" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
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
