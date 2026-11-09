import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import hero from "@/assets/hero-meal.jpg";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-14">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12 fade-up">
          <h1 className="font-display text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 rounded-lg bg-sage/50 px-3 py-2 text-xs text-muted-foreground">
            Account access and email verification are powered by Supabase Auth.
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-forest lg:block">
        <img
          src={hero}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-80"
          width={1280}
          height={1536}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/20 to-transparent" />
        <div className="absolute bottom-0 p-12 text-forest-foreground">
          <p className="eyebrow text-lime">Personalized nutrition • everyday wellness</p>
          <p className="mt-3 max-w-md font-display text-4xl leading-tight">
            Food choices shaped around your goals and routine.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-forest">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
