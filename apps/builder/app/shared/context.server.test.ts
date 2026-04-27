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

vi.mock("@webstudio-is/http-client", () => ({
  parseBuilderUrl: vi.fn(),
}));

import { extractAuthFromRequest } from "./context.server";

describe("extractAuthFromRequest", () => {
  beforeEach(() => {
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
  });
});
