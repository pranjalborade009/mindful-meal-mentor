import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getAuthRedirectPath, getAuthService } from "@/services/auth-service";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Log in — NUTRIFY" },
      {
        name: "description",
        content:
          "Log in to NUTRIFY to continue your nutrition plan, meal tracking, and food discovery.",
      },
      { property: "og:title", content: "Log in — NUTRIFY" },
      {
        property: "og:description",
        content:
          "Log in to NUTRIFY to continue your nutrition plan, meal tracking, and food discovery.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const { redirect } = Route.useSearch();
  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue to your nutrition workspace.">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(undefined);
          setLoading(true);
          try {
            await getAuthService().signIn({ email, password });
            toast.success("You are signed in.");
            window.location.assign(getAuthRedirectPath(redirect));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field id="email" label="Email" error={error}>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-card"
          />
        </Field>
        <Field
          id="password"
          label="Password"
          hint={
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-card pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-forest"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox /> Remember me
        </label>
        <Button type="submit" variant="forest" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to NUTRIFY?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
