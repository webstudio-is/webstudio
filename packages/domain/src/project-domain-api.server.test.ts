import { expect, test, vi } from "vitest";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { http } from "msw";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  getProjectPublishJob,
  listProjectPublishes,
  publishProject,
  publishStaticProject,
  unpublishProjectDomains,
} from "./project-domain-api.server";

const server = createTestServer();
const context = testContext as unknown as AppContext;
const postgrestUrl = "http://test-postgrest";

const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

const loadedProject = {
  id: "project-1",
  userId: "user-1",
  title: "Project One",
  domain: "project.wstd.io",
  createdAt: "2024-01-01T00:00:00.000Z",
  isDeleted: false,
  marketplaceApprovalStatus: "UNLISTED" as const,
  previewImageAssetId: null,
  tags: [],
  workspaceId: null,
  previewImageAsset: null,
  latestBuildVirtual: null,
  latestStaticBuild: null,
  domainsVirtual: [
    {
      id: "project-domain-1",
      projectId: "project-1",
      domainId: "domain-1",
      domain: "example.com",
      status: "ACTIVE" as const,
      verified: true,
      domainTxtRecord: null,
      expectedTxtRecord: "webstudio=domain-1",
      cname: "proxy.webstudio.is",
      error: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      latestBuildVirtual: null,
    },
  ],
};

const projectResponse = {
  ...loadedProject,
  latestStaticBuild: [],
};

const projectHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: "project-1" });
  }
  return json(projectResponse);
});

const createPublishContext = (
  publish = vi.fn().mockResolvedValue({ success: true })
) =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    deployment: {
      deploymentTrpc: {
        publish: {
          mutate: publish,
        },
        unpublish: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
      },
      env: {
        BUILDER_ORIGIN: "https://apps.webstudio.is",
        GITHUB_REF_NAME: "main",
        GITHUB_SHA: "sha-1",
        PUBLISHER_HOST: "wstd.io",
      },
    },
  }) as unknown as AppContext;

const productionBuildHandler = (
  onRequest: (body: { project_id: string; deployment: string }) => void
) =>
  http.post(
    `${postgrestUrl}/rpc/create_production_build`,
    async ({ request }) => {
      onRequest(
        (await request.json()) as { project_id: string; deployment: string }
      );
      return json("build-prod");
    }
  );

test("publishes saas project through shared domain service", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let productionBuildRequest:
    | { project_id: string; deployment: string }
    | undefined;
  server.use(
    projectHandler,
    productionBuildHandler((body) => {
      productionBuildRequest = body;
    })
  );

  await expect(
    publishProject(
      { project: loadedProject, domains: ["project.wstd.io", "example.com"] },
      createPublishContext(publish)
    )
  ).resolves.toMatchObject({
    build: { id: "build-prod" },
    deploymentNotImplemented: false,
  });

  expect(productionBuildRequest?.project_id).toBe("project-1");
  expect(JSON.parse(productionBuildRequest?.deployment ?? "")).toEqual({
    destination: "saas",
    domains: ["project.wstd.io", "example.com"],
    assetsDomain: "project.wstd.io",
    excludeWstdDomainFromSearch: true,
  });
  expect(publish).toHaveBeenCalledWith({
    builderOrigin: "https://apps.webstudio.is",
    githubSha: "sha-1",
    buildId: "build-prod",
    branchName: "main",
    destination: "saas",
    logProjectName: "Project One - project-1",
  });
});

test("reports local-dev publish when deployment publisher is unavailable", async () => {
  server.use(
    projectHandler,
    productionBuildHandler(() => {})
  );

  await expect(
    publishProject(
      { project: loadedProject, domains: ["project.wstd.io"] },
      createPublishContext(
        vi.fn().mockResolvedValue({ success: false, error: "NOT_IMPLEMENTED" })
      )
    )
  ).resolves.toMatchObject({
    build: { id: "build-prod" },
    deploymentNotImplemented: true,
  });
});

test("publishes static project through shared domain service", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let productionBuildRequest:
    | { project_id: string; deployment: string }
    | undefined;
  server.use(
    projectHandler,
    productionBuildHandler((body) => {
      productionBuildRequest = body;
    })
  );

  await expect(
    publishStaticProject(
      {
        projectId: "project-1",
        name: "project.zip",
        templates: [],
      },
      createPublishContext(publish)
    )
  ).resolves.toMatchObject({
    success: true,
    name: "project.zip",
    build: { id: "build-prod" },
  });

  expect(JSON.parse(productionBuildRequest?.deployment ?? "")).toEqual({
    destination: "static",
    name: "project.zip",
    assetsDomain: "project.wstd.io",
    templates: [],
  });
  expect(publish).toHaveBeenCalledWith({
    builderOrigin: "https://apps.webstudio.is",
    githubSha: "sha-1",
    buildId: "build-prod",
    branchName: "main",
    destination: "static",
    logProjectName: "Project One - project-1",
  });
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

test("lists non-static project publishes", async () => {
  server.use(
    db.get("Build", () =>
      json([
        {
          id: "build-prod",
          version: 3,
          createdAt: "2024-01-03T00:00:00.000Z",
          deployment: JSON.stringify({
            destination: "saas",
            domains: ["example.com", "www.example.com"],
          }),
        },
        {
          id: "build-static",
          version: 2,
          createdAt: "2024-01-02T00:00:00.000Z",
          deployment: JSON.stringify({
            destination: "static",
            name: "project.zip",
          }),
        },
        {
          id: "build-removed",
          version: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
          deployment: null,
        },
      ])
    )
  );

  await expect(listProjectPublishes("project-1", context)).resolves.toEqual({
    publishes: [
      {
        id: "build-prod",
        jobId: "build-prod",
        version: 3,
        target: "production",
        domains: ["example.com", "www.example.com"],
        createdAt: "2024-01-03T00:00:00.000Z",
      },
    ],
  });
});

test("returns publish job status from deployment record", async () => {
  server.use(
    db.get("Build", () =>
      json({
        id: "build-prod",
        version: 3,
        createdAt: "2024-01-03T00:00:00.000Z",
        deployment: JSON.stringify({
          destination: "saas",
          domains: ["example.com"],
        }),
      })
    )
  );

  await expect(
    getProjectPublishJob(
      { projectId: "project-1", jobId: "build-prod" },
      context
    )
  ).resolves.toEqual({
    id: "build-prod",
    version: 3,
    status: "success",
    domains: ["example.com"],
    createdAt: "2024-01-03T00:00:00.000Z",
    completedAt: "2024-01-03T00:00:00.000Z",
  });
});

test("returns undefined when publish job is missing", async () => {
  server.use(db.get("Build", () => empty({ status: 204 })));

  await expect(
    getProjectPublishJob({ projectId: "project-1", jobId: "missing" }, context)
  ).resolves.toBeUndefined();
});
