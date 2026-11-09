import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the personal assessment page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/assessment");

    expect(matches.at(-1)?.routeId).toBe("/_workspace/assessment");
  });

  it("matches the food diary page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/diary");

    expect(matches.at(-1)?.routeId).toBe("/_workspace/diary");
  });

  it("matches the password reset and email verification destinations", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/reset-password").at(-1)?.routeId).toBe("/reset-password");
    expect(router.matchRoutes("/auth/callback").at(-1)?.routeId).toBe("/auth/callback");
  });
});
