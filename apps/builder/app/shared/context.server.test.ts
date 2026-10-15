import { beforeEach, describe, expect, test, vi } from "vitest";

const env = vi.hoisted(() => ({
  TRPC_SERVER_API_TOKEN: undefined as string | undefined,
  POSTGREST_URL: "http://localhost:3000",
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

vi.mock("@webstudio-is/postgrest/index.server", () => ({
  createClient: vi.fn(),
}));

vi.mock("~/services/session.server", () => ({
  readLoginSessionBloomFilter: vi.fn(),
}));

vi.mock("./router-utils", () => ({
  isBuilder,
  isCanvas,
}));

import { createClient } from "@webstudio-is/postgrest/index.server";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { procedure, router } from "@webstudio-is/trpc-interface/index.server";
import { createContext, extractAuthFromRequest } from "./context.server";

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

  test.each([null, { project: null }, { project: { userId: null } }])(
    "returns a structured 401 when the token or its owner is unavailable: %j",
    async (data) => {
      const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
      const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => query),
      } as never);
      const response = await fetchRequestHandler({
        endpoint: "/trpc",
        req: new Request("http://localhost/trpc/check", {
          headers: { "x-auth-token": "private-token" },
        }),
        router: appRouter,
        createContext: ({ req }) => createContext(req),
      });
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toMatchObject({
        error: {
          data: { code: "UNAUTHORIZED", webstudioCode: "INVALID_AUTH_TOKEN" },
        },
      });
      expect(JSON.stringify(body)).not.toContain("private-token");
      expect(maybeSingle).toHaveBeenCalledOnce();
    }
  );

  test("does not classify a database failure as an invalid credential", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: "08006" } }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => query),
    } as never);
    const error = await createContext(
      new Request("http://localhost/trpc/check", {
        headers: { "x-auth-token": "private-token" },
      })
    ).catch((error) => error);
    expect(error).not.toBeInstanceOf(TRPCError);
    expect(error.message).toBe("Failed to verify authorization token");
  });
});
