import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const nav = [
  { label: "Home", to: "/" as const },
  { label: "How It Works", to: "/" as const, hash: "how-it-works" },
  { label: "Food Explorer", to: "/explorer" as const },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link key={n.label} to={n.to} {...(n.hash ? { hash: n.hash } : {})} className="text-sm text-muted-foreground transition-colors hover:text-forest">{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
          <Button variant="forest" asChild><Link to="/register">Get Started</Link></Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-background px-5 pb-6 pt-3 md:hidden">
          {nav.map((n) => (
            <Link key={n.label} to={n.to} {...(n.hash ? { hash: n.hash } : {})} onClick={() => setOpen(false)} className="block py-3 text-base text-forest">{n.label}</Link>
          ))}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" asChild><Link to="/login">Login</Link></Button>
            <Button variant="forest" className="flex-1" asChild><Link to="/register">Get Started</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-forest text-forest-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 md:px-8">
        <div className="md:col-span-2">
          <p className="font-display text-3xl">NUTRIFY</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed opacity-75">
            Explore foods, keep a daily food diary, and review your saved assessment.
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-lime">Food discovery • daily food diary • nutrition tracking</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/explorer" className="opacity-80 hover:opacity-100">Food Explorer</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-forest-foreground/10">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs opacity-60 md:px-8">
          Nutrition information is for general reference and is not a substitute for professional medical or dietary advice.
        </p>
      </div>
    </footer>
  );
}
