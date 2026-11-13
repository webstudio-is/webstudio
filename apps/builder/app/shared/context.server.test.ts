import { beforeEach, describe, expect, test, vi } from "vitest";

const env = vi.hoisted(() => ({
  TRPC_SERVER_API_TOKEN: undefined as string | undefined,
  POSTGREST_URL: "http://test-postgrest",
  POSTGREST_API_KEY: "",
  PUBLISHER_HOST: "wstd.work",
}));

const authenticator = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
}));
const builderAuthenticator = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
}));
const isBuilder = vi.hoisted(() => vi.fn(() => false));
const isCanvas = vi.hoisted(() => vi.fn(() => false));

vi.mock("~/env/env.server", () => ({
  default: env,
}));

vi.mock("~/env/env.static.server", () => ({
  staticEnv: {},
}));

vi.mock("~/services/auth.server", () => ({
  authenticator,
}));

vi.mock("~/services/builder-auth.server", () => ({
  builderAuthenticator,
}));

vi.mock("~/services/trpc.server", () => ({
  trpcSharedClient: {
    domain: {},
    deployment: {},
  },
}));

vi.mock("~/shared/entri/entri-api.server", () => ({
  entryApi: {},
}));

vi.mock("@webstudio-is/plans", () => ({
  defaultPlanFeatures: {},
}));

vi.mock("@webstudio-is/plans/index.server", () => ({
  getAuthorizationOwnerId: vi.fn(),
  getPlanInfo: vi.fn(),
}));

vi.mock("~/services/session.server", () => ({
  readLoginSessionBloomFilter: vi.fn(),
}));

vi.mock("./router-utils", () => ({
  isBuilder,
  isCanvas,
}));

import { createTestServer, db, json } from "@webstudio-is/postgrest/testing";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { procedure, router } from "@webstudio-is/trpc-interface/index.server";
import { createContext, extractAuthFromRequest } from "./context.server";

const server = createTestServer();

describe("extractAuthFromRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.TRPC_SERVER_API_TOKEN = undefined;
    authenticator.isAuthenticated.mockResolvedValue(undefined);
    builderAuthenticator.isAuthenticated.mockResolvedValue(undefined);
    isBuilder.mockReturnValue(false);
    isCanvas.mockReturnValue(false);
  });

  test("does not treat an empty service token as service authorization", async () => {
    env.TRPC_SERVER_API_TOKEN = "";
    const request = new Request("https://webstudio.is/trpc", {
      headers: { Authorization: "" },
    });

    const auth = await extractAuthFromRequest(request);

    expect(auth.isServiceCall).toBe(false);
  });

  test("accepts a matching non-empty service token", async () => {
    env.TRPC_SERVER_API_TOKEN = "service-token";
    const request = new Request("https://webstudio.is/trpc", {
      headers: { Authorization: "service-token" },
    });

    const auth = await extractAuthFromRequest(request);

    expect(auth.isServiceCall).toBe(true);
    expect(authenticator.isAuthenticated).not.toHaveBeenCalled();
  });

  test("prefers an explicit token without reading the cookie session", async () => {
    const request = new Request("https://webstudio.is/trpc", {
      headers: { "x-auth-token": "project-token" },
    });

    const auth = await extractAuthFromRequest(request);

    expect(auth.authToken).toBe("project-token");
    expect(auth.sessionData).toBeUndefined();
    expect(authenticator.isAuthenticated).not.toHaveBeenCalled();
  });

  test("reads the cookie session when no explicit credential is available", async () => {
    const sessionData = { userId: "user-1", createdAt: 1 };
    authenticator.isAuthenticated.mockResolvedValue(sessionData);

    const auth = await extractAuthFromRequest(
      new Request("https://webstudio.is/trpc")
    );

    expect(auth.authToken).toBeUndefined();
    expect(auth.sessionData).toBe(sessionData);
  });
});

describe("invalid token authorization", () => {
  const appRouter = router({ check: procedure.query(() => "authorized") });
  const request = () =>
    fetchRequestHandler({
      endpoint: "/trpc",
      req: new Request("http://localhost/trpc/check", {
        headers: { "x-auth-token": "private-token" },
      }),
      router: appRouter,
      createContext: ({ req }) => createContext(req),
    });

  test.each([
    { scenario: "revoked token", rows: [] },
    { scenario: "unavailable project", rows: [{ project: null }] },
    {
      scenario: "project without an owner",
      rows: [{ project: { userId: null } }],
    },
  ])("returns a structured 401 for $scenario", async ({ rows }) => {
    server.use(db.get("AuthorizationToken", () => json(rows)));
    const response = await request();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      error: {
        data: { code: "UNAUTHORIZED", webstudioCode: "INVALID_AUTH_TOKEN" },
      },
    });
    expect(JSON.stringify(body)).not.toContain("private-token");
  });

  test("reports a database outage as a server failure rather than invalid credentials", async () => {
    server.use(
      db.get("AuthorizationToken", () =>
        json(
          { code: "08006", message: "Database unavailable" },
          { status: 503 }
        )
      )
    );
    const response = await request();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({
      error: { data: { code: "INTERNAL_SERVER_ERROR" } },
    });
    expect(body).not.toMatchObject({
      error: { data: { webstudioCode: "INVALID_AUTH_TOKEN" } },
    });
    expect(JSON.stringify(body)).not.toContain("private-token");
  });
});
