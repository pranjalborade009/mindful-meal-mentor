import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  UserRound,
  ClipboardList,
  Search,
  Bookmark,
  BookOpen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getAuthService } from "@/services/auth-service";

const items = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/assessment", label: "Personal Assessment", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/explorer", label: "Food Explorer", icon: Search },
  { to: "/saved", label: "Saved Foods", icon: Bookmark },
  { to: "/diary", label: "Food Diary", icon: BookOpen },
] as const;

type AuthenticatedUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

function NavList({
  user,
  collapsed,
  onNavigate,
}: {
  user: AuthenticatedUser;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = user.displayName || user.email || "NUTRIFY user";
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "NU";

  const logout = async () => {
    setLoggingOut(true);
    try {
      await getAuthService().signOut();
      toast.success("You are signed out.");
      window.location.assign("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-forest",
              collapsed && "justify-center px-0",
            )}
            activeProps={{ className: "!bg-forest !text-forest-foreground [&_svg]:text-lime" }}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>
      <div className={cn("mt-4 flex items-center gap-3 border-t pt-4", collapsed && "flex-col")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage text-sm font-semibold text-forest">
          {initials}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-forest">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email ?? "Signed-in account"}
            </p>
          </div>
        )}
        <button
          aria-label="Log out"
          onClick={() => void logout()}
          disabled={loggingOut}
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-forest"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ user }: { user: AuthenticatedUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(
    () =>
      getAuthService().onAuthStateChange((event, session) => {
        if (!session && event === "SIGNED_OUT") {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          void navigate({ to: "/login", search: { redirect: returnTo } });
        }
      }),
    [navigate],
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar p-4 transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-60",
        )}
      >
        <div
          className={cn("mb-8 flex items-center", collapsed ? "justify-center" : "justify-between")}
        >
          <Logo compact={collapsed} />
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="text-muted-foreground hover:text-forest"
            >
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="mb-4 self-center text-muted-foreground hover:text-forest"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        <NavList user={user} collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Logo />
          <button onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
        </header>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 bg-sidebar p-5">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="mb-8">
              <Logo />
            </div>
            <NavList user={user} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
