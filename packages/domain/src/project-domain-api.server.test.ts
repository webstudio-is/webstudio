import { expect, test, vi } from "vitest";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { unpublishProjectDomains } from "./project-domain-api.server";

const server = createTestServer();

const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

test("clears publish records even when deployment unpublish fails", async () => {
  let deletedBuildId: string | undefined;
  server.use(
    ownershipHandler,
    db.get("Build", () =>
      json([
        {
          id: "build-prod",
          deployment: JSON.stringify({
            destination: "saas",
            domains: ["example"],
          }),
        },
      ])
    ),
    db.delete("Build", ({ request }) => {
      const url = new URL(request.url);
      deletedBuildId = url.searchParams.get("id")?.replace("eq.", "");
      return empty({ status: 204 });
    })
  );
  const context = {
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    deployment: {
      deploymentTrpc: {
        unpublish: {
          mutate: vi
            .fn()
            .mockResolvedValue({ success: false, error: "Cloudflare failed" }),
        },
      },
      env: { PUBLISHER_HOST: "wstd.io" },
    },
  } as unknown as AppContext;

  await expect(
    unpublishProjectDomains(
      {
        projectId: "project-1",
        domains: ["example.wstd.io"],
      },
      context
    )
  ).rejects.toThrow("Failed to unpublish example.wstd.io: Cloudflare failed");

  expect(deletedBuildId).toBe("build-prod");
});
