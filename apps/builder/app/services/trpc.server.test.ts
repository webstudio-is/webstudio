import { expect, test, vi } from "vitest";
import { createTrpcProxyServiceClient } from "@webstudio-is/trpc-interface/index.server";
import { trpcSharedClient } from "./trpc.server";

vi.mock("@webstudio-is/trpc-interface/index.server", () => ({
  createTrpcProxyServiceClient: vi.fn(() => ({})),
}));
vi.mock("~/env/env.server", () => ({
  default: {
    TRPC_SERVER_URL: "https://edge.example.com",
    TRPC_SERVER_API_TOKEN: "edge-api-test-token",
    EMAIL_SERVICE_PREVIEW_TOKEN: "preview-only-test-token",
  },
}));
vi.mock("~/env/env.static.server", () => ({
  staticEnv: { GITHUB_REF_NAME: "main", GITHUB_SHA: "test" },
}));

test("Edge API client uses the Edge API credential, not the Email Preview credential", () => {
  expect(trpcSharedClient).toBeDefined();
  expect(createTrpcProxyServiceClient).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "https://edge.example.com",
      token: "edge-api-test-token",
    })
  );
  expect(createTrpcProxyServiceClient).not.toHaveBeenCalledWith(
    expect.objectContaining({ token: "preview-only-test-token" })
  );
});
