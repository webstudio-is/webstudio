import { beforeEach, expect, test, vi } from "vitest";
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
  getProjectPublishLog,
  listProjectPublishes,
  getDeploymentPublishErrorDiagnostics,
  publishProject,
  publishStaticProject,
  unpublishProjectDomains,
} from "./project-domain-api.server";

const server = createTestServer();
beforeEach(() => server.use(db.get("Asset", () => json([]))));
const context = testContext as unknown as AppContext;
const stagingContext = {
  ...context,
  deployment: {
    env: { PUBLISHER_HOST: "wstd.io" },
  } as AppContext["deployment"],
} as AppContext;
const postgrestUrl = "http://test-postgrest";

const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  if (url.searchParams.get("select") === "userId") {
    return json({ userId: "user-1" });
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

const devBuildRow = {
  id: "build-dev",
  projectId: "project-1",
  version: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  pages: JSON.stringify({
    meta: {},
    homePage: {
      id: "page-1",
      name: "Home",
      path: "",
      title: '"Home"',
      meta: {},
      rootInstanceId: "body-1",
    },
    pages: [],
  }),
  breakpoints: JSON.stringify([]),
  styles: JSON.stringify([]),
  styleSources: JSON.stringify([]),
  styleSourceSelections: JSON.stringify([]),
  props: JSON.stringify([]),
  dataSources: JSON.stringify([]),
  resources: JSON.stringify([]),
  instances: JSON.stringify([
    { id: "body-1", type: "instance", component: "Body", children: [] },
  ]),
  deployment: null,
  marketplaceProduct: JSON.stringify({}),
  projectSettings: JSON.stringify({ meta: {}, compiler: {} }),
};

const devBuildHandler = (row: typeof devBuildRow = devBuildRow) =>
  db.get("Build", () => json([row]));

const createPublishContext = (
  publish = vi.fn().mockResolvedValue({ success: true })
) =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    getOwnerPlanFeatures: async () => ({
      allowPublishLogs: false,
    }),
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
    `${postgrestUrl}/rpc/create_production_build_expected`,
    async ({ request }) => {
      onRequest(
        (await request.json()) as { project_id: string; deployment: string }
      );
      return json("build-prod");
    }
  );

const logInput = {
  projectId: "project-1",
  buildId: "build-prod",
  logHandle: "signed-handle",
  cursor: 128,
};

test("checks project and build ownership before fetching publish logs", async () => {
  const query = vi.fn().mockResolvedValue({ availability: "pending" });
  const publishContext = {
    ...createPublishContext(),
    deployment: {
      ...createPublishContext().deployment,
      deploymentTrpc: { getPublishLog: { query } },
    },
  } as unknown as AppContext;
  server.use(
    ownershipHandler,
    db.get("Build", ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get("projectId")).toBe("eq.project-1");
      expect(params.get("id")).toBe("eq.build-prod");
      return empty({ status: 204 });
    })
  );

  await expect(getProjectPublishLog(logInput, publishContext)).resolves.toEqual(
    { availability: "unavailable" }
  );
  await expect(
    getProjectPublishLog(logInput, {
      ...publishContext,
      authorization: { type: "anonymous" },
    } as AppContext)
  ).rejects.toThrow();
  expect(query).not.toHaveBeenCalled();
});

test("uses the Free project owner's plan despite a Pro collaborator", async () => {
  const query = vi.fn().mockResolvedValue({
    availability: "available",
    outcome: "failed",
    logAvailability: "unavailable",
    code: "cancelled",
  });
  const publishContext = {
    ...createPublishContext(),
    planFeatures: { allowPublishLogs: true },
    deployment: {
      ...createPublishContext().deployment,
      deploymentTrpc: { getPublishLog: { query } },
    },
  } as unknown as AppContext;
  server.use(
    ownershipHandler,
    db.get("Build", () => json({ id: "build-prod" }))
  );

  const attemptedOverride = { ...logInput, includeLog: true };
  const result = await getProjectPublishLog(attemptedOverride, publishContext);
  expect(result).toEqual({ availability: "unavailable" });
  expect(query).not.toHaveBeenCalled();
});

test("uses the Pro project owner's plan despite a Free collaborator", async () => {
  const response = {
    availability: "available" as const,
    outcome: "succeeded" as const,
    logAvailability: "available" as const,
    log: { encoding: "base64url" as const, chunk: "c2VjcmV0", complete: true },
  };
  const publishContext = {
    ...createPublishContext(),
    planFeatures: { allowPublishLogs: false },
    getOwnerPlanFeatures: async () => ({
      allowPublishLogs: true,
    }),
    deployment: {
      ...createPublishContext().deployment,
      deploymentTrpc: {
        getPublishLog: { query: vi.fn().mockResolvedValue(response) },
      },
    },
  } as unknown as AppContext;
  server.use(
    ownershipHandler,
    db.get("Build", () => json({ id: "build-prod" }))
  );
  await expect(getProjectPublishLog(logInput, publishContext)).resolves.toEqual(
    response
  );
  expect(
    publishContext.deployment.deploymentTrpc.getPublishLog.query
  ).toHaveBeenCalledWith({
    buildId: "build-prod",
    logHandle: "signed-handle",
    cursor: 128,
    includeLog: true,
  });
});

test("keeps Free publish failure status without downloading logs", async () => {
  const query = vi.fn().mockResolvedValue({
    availability: "available",
    outcome: "failed",
    logAvailability: "unavailable",
    code: "startup_failure",
  });
  const publishContext = {
    ...createPublishContext(),
    planFeatures: { allowPublishLogs: false },
    deployment: {
      ...createPublishContext().deployment,
      deploymentTrpc: {
        getPublishLog: { query },
      },
    },
  } as unknown as AppContext;
  server.use(
    ownershipHandler,
    db.get("Build", ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get("projectId")).toBe("eq.project-1");
      expect(params.get("id")).toBe("eq.build-prod");
      return json({
        id: "build-prod",
        version: 3,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:01:00.000Z",
        publishStatus: "PENDING",
        deployment: JSON.stringify({
          destination: "saas",
          target: "production",
          domains: ["example.com"],
        }),
      });
    })
  );
  await expect(
    getProjectPublishJob(
      {
        projectId: "project-1",
        jobId: "build-prod",
        logHandle: "signed-handle",
      },
      publishContext
    )
  ).resolves.toMatchObject({ status: "failed", code: "startup_failure" });
  expect(query).toHaveBeenCalledWith({
    buildId: "build-prod",
    logHandle: "signed-handle",
    includeLog: false,
  });
});

test.each([
  {
    label: "pending",
    response: { availability: "pending" },
    durableStatus: "PUBLISHED",
    status: "pending",
    code: undefined,
    completedAt: undefined,
  },
  {
    label: "succeeded",
    response: {
      availability: "available",
      outcome: "succeeded",
      completedAt: "2024-01-03T00:02:00.000Z",
    },
    durableStatus: "PENDING",
    status: "success",
    code: undefined,
    completedAt: "2024-01-03T00:02:00.000Z",
  },
  {
    label: "failed",
    response: {
      availability: "available",
      outcome: "failed",
      code: "cancelled",
    },
    durableStatus: "PUBLISHED",
    status: "failed",
    code: "cancelled",
    completedAt: undefined,
  },
  {
    label: "unavailable",
    response: { availability: "unavailable" },
    durableStatus: "PUBLISHED",
    status: "success",
    code: undefined,
    completedAt: "2024-01-03T00:01:00.000Z",
  },
] as const)(
  "uses $label verified runner status without log transfer",
  async ({ response, durableStatus, status, code, completedAt }) => {
    const query = vi.fn().mockResolvedValue(response);
    const publishContext = {
      ...createPublishContext(),
      deployment: {
        ...createPublishContext().deployment,
        deploymentTrpc: { getPublishLog: { query } },
      },
    } as unknown as AppContext;
    server.use(
      db.get("Build", () =>
        json({
          id: "build-prod",
          version: 3,
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:01:00.000Z",
          publishStatus: durableStatus,
          deployment: JSON.stringify({
            destination: "saas",
            target: "production",
            domains: ["example.com"],
          }),
        })
      )
    );
    const result = await getProjectPublishJob(
      {
        projectId: "project-1",
        jobId: "build-prod",
        logHandle: "signed-handle",
      },
      publishContext
    );
    expect(result).toMatchObject({ status });
    expect(result?.completedAt).toBe(completedAt);
    if (code === undefined) {
      expect(result).not.toHaveProperty("code");
    } else {
      expect(result).toHaveProperty("code", code);
    }
    expect(query).toHaveBeenCalledWith({
      buildId: "build-prod",
      logHandle: "signed-handle",
      includeLog: false,
    });
    expect(result).not.toHaveProperty("log");
  }
);

test("keeps the durable status when runner status lookup rejects", async () => {
  const query = vi.fn().mockRejectedValue(new Error("runner unavailable"));
  const publishContext = {
    ...createPublishContext(),
    deployment: {
      ...createPublishContext().deployment,
      deploymentTrpc: { getPublishLog: { query } },
    },
  } as unknown as AppContext;
  server.use(
    db.get("Build", () =>
      json({
        id: "build-prod",
        version: 3,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:01:00.000Z",
        publishStatus: "FAILED",
        deployment: JSON.stringify({ destination: "saas", domains: [] }),
      })
    )
  );
  await expect(
    getProjectPublishJob(
      {
        projectId: "project-1",
        jobId: "build-prod",
        logHandle: "signed-handle",
      },
      publishContext
    )
  ).resolves.toMatchObject({ status: "failed" });
  expect(query).toHaveBeenCalledOnce();
});

test("removed and missing jobs never query the runner", async () => {
  const query = vi.fn();
  const publishContext = {
    ...createPublishContext(),
    deployment: {
      ...createPublishContext().deployment,
      deploymentTrpc: { getPublishLog: { query } },
    },
  } as unknown as AppContext;
  server.use(
    db.get("Build", () =>
      json({
        id: "build-prod",
        version: 3,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:01:00.000Z",
        publishStatus: "PUBLISHED",
        deployment: null,
      })
    )
  );
  await expect(
    getProjectPublishJob(
      {
        projectId: "project-1",
        jobId: "build-prod",
        logHandle: "signed-handle",
      },
      publishContext
    )
  ).resolves.toMatchObject({ status: "removed" });
  server.use(db.get("Build", () => empty({ status: 204 })));
  await expect(
    getProjectPublishJob(
      { projectId: "project-1", jobId: "missing", logHandle: "signed-handle" },
      publishContext
    )
  ).resolves.toBeUndefined();
  expect(query).not.toHaveBeenCalled();
});

test("publish error diagnostics expose metadata without response values", () => {
  const secret = "private-response-and-auth-sentinel";
  const error = Object.assign(new Error(secret), {
    meta: {
      response: new Response(secret, {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-vercel-id": "iad1::request-id",
          authorization: secret,
        },
      }),
      responseJSON: [
        { result: { data: secret } },
        { error: { message: secret } },
      ],
    },
  });

  const diagnostics = getDeploymentPublishErrorDiagnostics(error);

  expect(diagnostics).toEqual({
    status: 502,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-vercel-id": "iad1::request-id",
    },
    responseJson: {
      present: true,
      batchSize: 2,
      envelopes: ["result", "error"],
    },
  });
  expect(JSON.stringify(diagnostics)).not.toContain(secret);
  expect(
    getDeploymentPublishErrorDiagnostics(new Error(secret))
  ).toBeUndefined();
});

test("logs safe metadata when the deployment publish call rejects", async () => {
  const secret = "private-response-and-auth-sentinel";
  const error = Object.assign(new Error("Unable to transform response"), {
    meta: {
      response: new Response(secret, {
        status: 502,
        headers: { "content-type": "application/json", authorization: secret },
      }),
      responseJSON: { error: { message: secret } },
    },
  });
  const publish = vi.fn().mockRejectedValue(error);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  server.use(
    projectHandler,
    devBuildHandler(),
    productionBuildHandler(() => {})
  );

  try {
    await expect(
      publishProject(
        {
          project: loadedProject,
          domains: ["project.wstd.io"],
          target: "staging",
        },
        createPublishContext(publish)
      )
    ).rejects.toBe(error);
    expect(log).toHaveBeenCalledWith("Deployment publish request failed", {
      status: 502,
      headers: { "content-type": "application/json" },
      responseJson: {
        present: true,
        envelopes: ["error"],
      },
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
  } finally {
    log.mockRestore();
  }
});

test("publishes saas project through shared domain service", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let productionBuildRequest:
    | { project_id: string; deployment: string }
    | undefined;
  server.use(
    projectHandler,
    devBuildHandler(),
    productionBuildHandler((body) => {
      productionBuildRequest = body;
    })
  );

  const response = await publishProject(
    {
      project: loadedProject,
      domains: ["project.wstd.io", "example.com"],
      target: "production",
    },
    createPublishContext(publish)
  );
  expect(response).toMatchObject({
    build: { id: "build-prod" },
    deploymentNotImplemented: false,
  });
  expect(response.logHandle).toBeUndefined();
  expect(publish).toHaveBeenCalledOnce();

  expect(productionBuildRequest?.project_id).toBe("project-1");
  expect(JSON.parse(productionBuildRequest?.deployment ?? "")).toEqual({
    destination: "saas",
    target: "production",
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
    devBuildHandler(),
    productionBuildHandler(() => {})
  );

  await expect(
    publishProject(
      {
        project: loadedProject,
        domains: ["project.wstd.io"],
        target: "staging",
      },
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
    devBuildHandler(),
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

test("rejects publishing when dev build has orphan resource references", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let didCreateProductionBuild = false;
  server.use(
    projectHandler,
    devBuildHandler({
      ...devBuildRow,
      dataSources: JSON.stringify([
        {
          type: "resource",
          id: "dataSourceId",
          name: "pinnedAnnouncementData_1",
          resourceId: "missingResourceId",
        },
      ]),
    }),
    productionBuildHandler(() => {
      didCreateProductionBuild = true;
    })
  );

  await expect(
    publishProject(
      {
        project: loadedProject,
        domains: ["project.wstd.io"],
        target: "staging",
      },
      createPublishContext(publish)
    )
  ).rejects.toThrow(
    `Cannot publish: resource variable "pinnedAnnouncementData_1" (dataSourceId) references missing resource "missingResourceId".`
  );

  expect(didCreateProductionBuild).toBe(false);
  expect(publish).not.toHaveBeenCalled();
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

test("infers targets for publish records created before targets were stored", async () => {
  server.use(
    db.get("Build", () =>
      json([
        {
          id: "build-production",
          version: 2,
          createdAt: "2024-01-02T00:00:00.000Z",
          deployment: JSON.stringify({
            destination: "saas",
            domains: ["example.com"],
            assetsDomain: "project.wstd.io",
          }),
        },
        {
          id: "build-staging",
          version: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
          deployment: JSON.stringify({
            destination: "saas",
            domains: ["project.wstd.io"],
            assetsDomain: "project.wstd.io",
          }),
        },
      ])
    )
  );

  const result = await listProjectPublishes("project-1", context);

  expect(result.publishes.map(({ id, target }) => ({ id, target }))).toEqual([
    { id: "build-production", target: "production" },
    { id: "build-staging", target: "staging" },
  ]);
});

test("preserves a production target with one explicit custom domain", async () => {
  let storedDeployment: string | undefined;
  server.use(
    projectHandler,
    devBuildHandler(),
    productionBuildHandler(({ deployment }) => {
      storedDeployment = deployment;
    })
  );

  const published = await publishProject(
    {
      project: loadedProject,
      target: "production",
      domains: ["example.com"],
    },
    createPublishContext()
  );
  expect(published.build.id).toBe("build-prod");
  expect(storedDeployment).toBeDefined();

  const publishRecord = {
    id: "build-prod",
    version: 3,
    createdAt: "2024-01-03T00:00:00.000Z",
    updatedAt: "2024-01-03T00:01:00.000Z",
    publishStatus: "PUBLISHED",
    deployment: storedDeployment,
  };
  server.use(db.get("Build", () => json([publishRecord])));

  await expect(listProjectPublishes("project-1", context)).resolves.toEqual({
    publishes: [
      {
        id: "build-prod",
        jobId: "build-prod",
        version: 3,
        target: "production",
        domains: ["example.com"],
        createdAt: "2024-01-03T00:00:00.000Z",
      },
    ],
  });

  server.use(db.get("Build", () => json(publishRecord)));
  await expect(
    getProjectPublishJob(
      { projectId: "project-1", jobId: "build-prod" },
      context
    )
  ).resolves.toMatchObject({
    id: "build-prod",
    target: "production",
    domains: ["example.com"],
  });
});

test("returns publish job status from deployment record", async () => {
  server.use(
    db.get("Build", () =>
      json({
        id: "build-prod",
        version: 3,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:01:00.000Z",
        publishStatus: "PUBLISHED",
        deployment: JSON.stringify({
          destination: "saas",
          target: "production",
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
    target: "production",
    domains: ["example.com"],
    createdAt: "2024-01-03T00:00:00.000Z",
    completedAt: "2024-01-03T00:01:00.000Z",
  });
});

test.each([
  ["eagle-ethhp", "https://eagle-ethhp.wstd.io"],
  ["eagle-ethhp.wstd.io", "https://eagle-ethhp.wstd.io"],
])(
  "returns the configured staging origin for %s",
  async (domain, stagingUrl) => {
    server.use(
      db.get("Build", () =>
        json({
          id: "build-staging",
          version: 1,
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:01:00.000Z",
          publishStatus: "PUBLISHED",
          deployment: JSON.stringify({
            destination: "saas",
            target: "staging",
            domains: [domain],
            assetsDomain: domain,
          }),
        })
      )
    );
    await expect(
      getProjectPublishJob(
        { projectId: "project-1", jobId: "build-staging" },
        stagingContext
      )
    ).resolves.toMatchObject({ status: "success", stagingUrl });
  }
);

test("does not invent a hosted URL for a custom-only staging publish", async () => {
  server.use(
    db.get("Build", () =>
      json({
        id: "build-staging",
        version: 1,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:01:00.000Z",
        publishStatus: "PUBLISHED",
        deployment: JSON.stringify({
          destination: "saas",
          target: "staging",
          domains: ["custom.example.com"],
          assetsDomain: "project",
        }),
      })
    )
  );

  const result = await getProjectPublishJob(
    { projectId: "project-1", jobId: "build-staging" },
    stagingContext
  );
  expect(result).not.toHaveProperty("stagingUrl");
});

test.each([
  ["PENDING", "pending", undefined],
  ["FAILED", "failed", "2024-01-03T00:01:00.000Z"],
] as const)(
  "maps %s publisher state without claiming success",
  async (publishStatus, status, completedAt) => {
    server.use(
      db.get("Build", () =>
        json({
          id: "build-prod",
          version: 3,
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:01:00.000Z",
          publishStatus,
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
    ).resolves.toMatchObject({ status, completedAt });
  }
);

test("returns undefined when publish job is missing", async () => {
  server.use(db.get("Build", () => empty({ status: 204 })));

  await expect(
    getProjectPublishJob({ projectId: "project-1", jobId: "missing" }, context)
  ).resolves.toBeUndefined();
});
