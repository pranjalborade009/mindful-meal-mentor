import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getAuthService } from "@/services/auth-service";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — NUTRIFY" },
      {
        name: "description",
        content: "Create a NUTRIFY account to save your assessment and food diary.",
      },
      { property: "og:title", content: "Create account — NUTRIFY" },
      {
        property: "og:description",
        content: "Create a NUTRIFY account to save your assessment and food diary.",
      },
    ],
  }),
  component: RegisterPage,
});

export function RegisterPage() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const navigate = useNavigate();
  const updateField = (field: "name" | "email" | "pw" | "pw2", value: string) => {
    if (field === "name") setName(value);
    if (field === "email") setEmail(value);
    if (field === "pw") setPw(value);
    if (field === "pw2") setPw2(value);
    setErrors((current) => {
      const { form: _formError, [field]: _fieldError, ...remaining } = current;
      return remaining;
    });
    setMessage(undefined);
  };
  return (
    <AuthLayout title="Create your account" subtitle="Start building your nutrition profile.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting.current) return;

          const next: Record<string, string> = {};
          if (!name.trim()) next["name"] = "Enter your name.";
          if (!email.includes("@")) next["email"] = "Enter a valid email address.";
          if (pw.length < 8) next["pw"] = "Use at least 8 characters.";
          if (pw !== pw2) next["pw2"] = "Passwords do not match.";
          if (!terms) next["terms"] = "Please accept the terms to continue.";
          setErrors(next);
          if (Object.keys(next).length) return;
          submitting.current = true;
          setMessage(undefined);
          setLoading(true);
          try {
            const result = await getAuthService().signUp({
              email,
              password: pw,
              displayName: name,
            });
            if (result.emailVerificationRequired) {
              if (result.accountMayAlreadyExist) {
                setMessage(
                  "If this address can be registered, a verification email will arrive shortly. If you already have an account, sign in or reset your password.",
                );
              } else {
                setMessage(
                  "Your account was created. Check your email to verify your address before signing in.",
                );
                toast.success("Account created. Check your email to verify it.");
              }
            } else {
              toast.success("Your account was created.");
              navigate({ to: "/dashboard" });
            }
          } catch (err) {
            setErrors((current) => ({
              ...current,
              form:
                err instanceof Error
                  ? err.message
                  : "Unable to create your account. Please try again.",
            }));
          } finally {
            submitting.current = false;
            setLoading(false);
          }
        }}
      >
        <Field id="name" label="Full name" error={errors["name"]}>
          <Input
            id="name"
            value={name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Your name"
            className="h-11 bg-card"
          />
        </Field>
        <Field id="email" label="Email" error={errors["email"]}>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="you@example.com"
            className="h-11 bg-card"
          />
        </Field>
        <Field id="pw" label="Password" error={errors["pw"]}>
          <div className="relative">
            <Input
              id="pw"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => updateField("pw", e.target.value)}
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
        <Field id="pw2" label="Confirm password" error={errors["pw2"]}>
          <Input
            id="pw2"
            type={show ? "text" : "password"}
            value={pw2}
            onChange={(e) => updateField("pw2", e.target.value)}
            className="h-11 bg-card"
          />
        </Field>
        <div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} className="mt-0.5" />I
            agree to the terms and understand NUTRIFY does not provide medical advice.
          </label>
          {errors["terms"] && <p className="mt-1 text-xs text-destructive">{errors["terms"]}</p>}
        </div>
        {errors["form"] && (
          <p role="alert" className="text-sm text-destructive">
            {errors["form"]}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        )}
        <Button type="submit" variant="forest" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
