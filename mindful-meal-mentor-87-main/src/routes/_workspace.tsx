import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getAuthenticatedUser } from "@/services/auth-server";

// Pathless layout for the application workspace (sidebar + content).
export const Route = createFileRoute("/_workspace")({
  beforeLoad: async ({ location }) => {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user };
  },
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { user } = Route.useRouteContext();
  return <AppShell user={user} />;
}
