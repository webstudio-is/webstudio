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
import {
  getPublishAttempt,
  listPublishAttempts,
  toCompactPublishIssues,
  updatePublishAttempt,
} from "./publish-attempt.server";

test("compact publish issues retain errors after the warning limit", () => {
  const findings = [
    ...Array.from({ length: 21 }, (_, index) => ({
      severity: "warning" as const,
      message: `warning ${index}`,
    })),
    { severity: "error" as const, message: "first error" },
    { severity: "error" as const, message: "second error" },
  ];

  const issues = toCompactPublishIssues(findings, "audit");
  expect(issues).toHaveLength(20);
  expect(issues.slice(0, 2)).toEqual([
    { severity: "error", source: "audit", message: "first error" },
    { severity: "error", source: "audit", message: "second error" },
  ]);
  expect(issues.slice(2).map(({ message }) => message)).toEqual(
    Array.from({ length: 18 }, (_, index) => `warning ${index}`)
  );
});

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
    deployment: {
      deploymentTrpc: {
        getPublishReport: {
          query: vi.fn().mockResolvedValue({ availability: "not_found" }),
        },
        storePublishReport: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
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
    planFeatures: {
      allowAdvancedPublishDiagnostics: true,
      publishLogRetentionDays: 1,
      publishActivityRetentionDays: 30,
    },
  }) as unknown as AppContext;

const productionBuildHandler = (
  onRequest: (body: { project_id: string; deployment: string }) => void
) =>
  http.post(
    `${postgrestUrl}/rpc/create_production_build_expected`,
    async ({ request }) => {
      const body = (await request.json()) as {
        project_id: string;
        deployment: string;
      };
      onRequest(body);
      return json("build-prod");
    }
  );

const publishAttemptHandlers = (
  onUpdate?: (attempt: Record<string, unknown>) => void
) => {
  const attempts: Record<string, unknown>[] = [];
  return [
    http.get(`${postgrestUrl}/PublishAttempt`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const attempt = attempts.find(
        (item) =>
          params.get("projectId") === `eq.${item.projectId}` &&
          params.get("idempotencyHash") === `eq.${item.idempotencyHash}`
      );
      return attempt === undefined ? empty({ status: 204 }) : json(attempt);
    }),
    http.post(`${postgrestUrl}/PublishAttempt`, async ({ request }) => {
      const attempt = {
        ...((await request.json()) as Record<string, unknown>),
        buildId: null,
        status: "VALIDATING",
        failureCode: null,
        auditErrorCount: 0,
        auditWarningCount: 0,
        diagnosticErrors: 0,
        diagnosticWarnings: 0,
        issues: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        startedAt: null,
        completedAt: null,
      };
      attempts.push(attempt);
      return json(attempt);
    }),
    http.patch(`${postgrestUrl}/PublishAttempt`, async ({ request }) => {
      const id = new URL(request.url).searchParams
        .get("id")
        ?.replace("eq.", "");
      const index = attempts.findIndex((attempt) => attempt.id === id);
      const attempt = {
        ...attempts[index],
        ...((await request.json()) as object),
      };
      attempts[index] = attempt;
      onUpdate?.(attempt);
      return json(attempt);
    }),
    db.get("Asset", () => json([])),
    db.get("User", () => json({ username: "Publisher" })),
  ];
};

const publishAttemptRow = {
  id: "attempt-1",
  projectId: "project-1",
  buildId: "build-1",
  artifactName: null,
  target: "PRODUCTION",
  targetKeys: ["a"],
  targetLabels: ["a.example"],
  status: "SUCCEEDED",
  failureCode: null,
  auditErrorCount: 0,
  auditWarningCount: 0,
  diagnosticErrors: 0,
  diagnosticWarnings: 0,
  issues: [],
  summary: "Published successfully",
  retentionDays: 0,
  expiresAt: null,
  reportAvailability: "NOT_CREATED",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:01.000Z",
  startedAt: "2026-07-20T00:00:00.000Z",
  completedAt: "2026-07-20T00:00:01.000Z",
};

test("free activity keeps only the latest attempt for each domain", async () => {
  server.use(
    db.get("PublishAttempt", () =>
      json([
        publishAttemptRow,
        {
          ...publishAttemptRow,
          id: "attempt-older",
          buildId: "build-older",
          targetKeys: ["a", "b"],
          targetLabels: ["a.example", "b.example"],
          createdAt: "2026-07-19T00:00:00.000Z",
        },
      ])
    )
  );

  const result = await listProjectPublishes("project-1", {
    ...context,
    planFeatures: {
      ...context.planFeatures,
      publishActivityRetentionDays: 0,
    },
  } as AppContext);

  expect(result.publishes.map(({ id, domains }) => ({ id, domains }))).toEqual([
    { id: "attempt-1", domains: ["a.example"] },
    { id: "attempt-older", domains: ["b.example"] },
  ]);
});

test("free activity includes a target beyond the first page of attempts", async () => {
  const queries: URLSearchParams[] = [];
  const attempts = Array.from({ length: 1000 }, (_, index) => ({
    ...publishAttemptRow,
    id: `attempt-${index}`,
    targetKeys: ["a"],
    targetLabels: ["a.example"],
    createdAt: new Date(Date.now() - index * 1000).toISOString(),
  }));
  attempts.push({
    ...publishAttemptRow,
    id: "other-target",
    targetKeys: ["b"],
    targetLabels: ["b.example"],
    createdAt: new Date(Date.now() - 1000 * 1000).toISOString(),
  });
  server.use(
    db.get("PublishAttempt", ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params);
      const offset = Number(params.get("offset") ?? 0);
      const limit = Number(params.get("limit") ?? attempts.length);
      return json(attempts.slice(offset, offset + limit));
    })
  );

  const result = await listProjectPublishes("project-1", {
    ...context,
    planFeatures: { ...context.planFeatures, publishActivityRetentionDays: 0 },
  } as AppContext);

  expect(result.publishes.map(({ id, domains }) => ({ id, domains }))).toEqual([
    { id: "attempt-0", domains: ["a.example"] },
    { id: "other-target", domains: ["b.example"] },
  ]);
  expect(queries.map((query) => query.get("offset"))).toEqual(["0", "1000"]);
  expect(queries.every((query) => query.get("createdAt") === null)).toBe(true);
  expect(
    queries.every((query) => query.get("order") === "createdAt.desc,id.desc")
  ).toBe(true);
});

test("reading an old active attempt does not prevent a late success", async () => {
  const publishContext = {
    ...context,
    planFeatures: { ...context.planFeatures, publishActivityRetentionDays: 30 },
  } as AppContext;
  let attempt = {
    ...publishAttemptRow,
    status: "BUILDING",
    completedAt: null,
    updatedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  };
  let writes = 0;
  server.use(
    db.get("PublishAttempt", ({ request }) =>
      json(new URL(request.url).searchParams.has("id") ? attempt : [attempt])
    ),
    db.patch("PublishAttempt", async ({ request }) => {
      writes += 1;
      const statusFilter = new URL(request.url).searchParams.get("status");
      if (
        statusFilter === "in.(QUEUED,BUILDING)" &&
        attempt.status !== "QUEUED" &&
        attempt.status !== "BUILDING"
      ) {
        return empty({ status: 204 });
      }
      attempt = { ...attempt, ...((await request.json()) as typeof attempt) };
      return json(attempt);
    })
  );

  const job = await getPublishAttempt(
    { projectId: "project-1", attemptId: attempt.id },
    publishContext
  );
  const activity = await listPublishAttempts("project-1", publishContext);
  expect(job).toMatchObject({ status: "BUILDING" });
  expect(activity[0]).toMatchObject({ status: "BUILDING" });
  expect(writes).toBe(0);

  await updatePublishAttempt(
    attempt.id,
    { status: "SUCCEEDED", completedAt: new Date().toISOString() },
    publishContext,
    ["QUEUED", "BUILDING"]
  );
  expect(writes).toBe(1);
  await expect(
    getPublishAttempt(
      { projectId: "project-1", attemptId: attempt.id },
      publishContext
    )
  ).resolves.toMatchObject({ status: "SUCCEEDED" });
});

test("paid activity asks PostgREST for only the retained window", async () => {
  let createdAtFilter: string | null = null;
  server.use(
    db.get("PublishAttempt", ({ request }) => {
      createdAtFilter = new URL(request.url).searchParams.get("createdAt");
      return json([]);
    }),
    db.get("Build", () => json([]))
  );

  await listProjectPublishes("project-1", {
    ...context,
    planFeatures: {
      ...context.planFeatures,
      publishActivityRetentionDays: 30,
    },
  } as AppContext);

  expect(createdAtFilter).toMatch(/^gte\./);
});

test("attempt list errors do not fall back to builds", async () => {
  let buildReads = 0;
  server.use(
    db.get("PublishAttempt", () =>
      json(
        { code: "PGRST500", message: "Attempt read failed" },
        { status: 500 }
      )
    ),
    db.get("Build", () => {
      buildReads += 1;
      return json([]);
    })
  );

  await expect(
    listProjectPublishes("project-1", createPublishContext())
  ).rejects.toBeDefined();
  expect(buildReads).toBe(0);
});

test("attempt job errors do not fall back to builds", async () => {
  let buildReads = 0;
  server.use(
    db.get("PublishAttempt", () =>
      json(
        { code: "PGRST500", message: "Attempt read failed" },
        { status: 500 }
      )
    ),
    db.get("Build", () => {
      buildReads += 1;
      return json([]);
    })
  );

  await expect(
    getProjectPublishJob(
      { projectId: "project-1", jobId: "attempt-1" },
      createPublishContext()
    )
  ).rejects.toBeDefined();
  expect(buildReads).toBe(0);
});

test("publishes saas project through shared domain service", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let productionBuildRequest:
    | { project_id: string; deployment: string }
    | undefined;
  server.use(
    ...publishAttemptHandlers(),
    projectHandler,
    devBuildHandler(),
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
  expect(publish).toHaveBeenCalledWith(
    expect.objectContaining({
      builderOrigin: "https://apps.webstudio.is",
      githubSha: "sha-1",
      buildId: "build-prod",
      branchName: "main",
      destination: "saas",
      logProjectName: "Project One - project-1",
      reportRetentionDays: 1,
    })
  );
});

test("reports local-dev publish when deployment publisher is unavailable", async () => {
  server.use(
    ...publishAttemptHandlers(),
    projectHandler,
    devBuildHandler(),
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

test.each(["saas", "static"] as const)(
  "stores content warning in the %s attempt and paid report",
  async (destination) => {
    const updates: Record<string, unknown>[] = [];
    server.use(
      ...publishAttemptHandlers((attempt) => updates.push(attempt)),
      projectHandler,
      devBuildHandler(),
      productionBuildHandler(() => {})
    );
    const publish = vi.fn().mockResolvedValue({ success: true });
    const publishContext = createPublishContext(publish);
    const getBuildFindings = vi.fn().mockResolvedValue([
      {
        ruleId: "content-database-truncated",
        severity: "warning",
        message: "Published content is incomplete.",
        location: {},
      },
    ]);

    if (destination === "saas") {
      await publishProject(
        { project: loadedProject, domains: ["project.wstd.io"] },
        publishContext,
        getBuildFindings
      );
    } else {
      await publishStaticProject(
        { projectId: "project-1", templates: [] },
        publishContext,
        getBuildFindings
      );
    }

    expect(getBuildFindings).toHaveBeenCalledWith("build-prod", publishContext);
    expect(updates).toContainEqual(
      expect.objectContaining({
        status: "QUEUED",
        auditWarningCount: 1,
        issues: [
          {
            severity: "warning",
            source: "audit",
            message: "Published content is incomplete.",
          },
        ],
      })
    );
    expect(
      publishContext.deployment.deploymentTrpc.storePublishReport.mutate
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        report: expect.objectContaining({
          auditSnapshot: [
            expect.objectContaining({
              ruleId: "content-database-truncated",
            }),
          ],
        }),
      })
    );
  }
);

test.each(["saas", "static"] as const)(
  "does not dispatch %s when content preparation fails",
  async (destination) => {
    const updates: Record<string, unknown>[] = [];
    server.use(
      ...publishAttemptHandlers((attempt) => updates.push(attempt)),
      projectHandler,
      devBuildHandler(),
      productionBuildHandler(() => {})
    );
    const publish = vi.fn().mockResolvedValue({ success: true });
    const getBuildFindings = vi
      .fn()
      .mockRejectedValue(new Error("Asset read failed"));
    const promise =
      destination === "saas"
        ? publishProject(
            { project: loadedProject, domains: ["project.wstd.io"] },
            createPublishContext(publish),
            getBuildFindings
          )
        : publishStaticProject(
            { projectId: "project-1", templates: [] },
            createPublishContext(publish),
            getBuildFindings
          );

    await expect(promise).rejects.toThrow("Asset read failed");
    expect(updates).toContainEqual(
      expect.objectContaining({
        status: "FAILED",
        failureCode: "validation_failed",
      })
    );
    expect(publish).not.toHaveBeenCalled();
  }
);

test.each(["saas", "static"] as const)(
  "blocks %s when a build finding is an error",
  async (destination) => {
    const updates: Record<string, unknown>[] = [];
    server.use(
      ...publishAttemptHandlers((attempt) => updates.push(attempt)),
      projectHandler,
      devBuildHandler(),
      productionBuildHandler(() => {})
    );
    const publish = vi.fn().mockResolvedValue({ success: true });
    const getBuildFindings = vi.fn().mockResolvedValue([
      {
        ruleId: "content-database",
        severity: "error",
        message: "The content database is invalid.",
        location: {},
      },
    ]);
    const publishContext = createPublishContext(publish);
    const promise =
      destination === "saas"
        ? publishProject(
            { project: loadedProject, domains: ["project.wstd.io"] },
            publishContext,
            getBuildFindings
          )
        : publishStaticProject(
            { projectId: "project-1", templates: [] },
            publishContext,
            getBuildFindings
          );

    await expect(promise).rejects.toThrow("The content database is invalid.");
    expect(updates).toContainEqual(
      expect.objectContaining({
        status: "BLOCKED",
        failureCode: "audit_failed",
      })
    );
    expect(publish).not.toHaveBeenCalled();
  }
);

test.each(["saas", "static"] as const)(
  "keeps %s attempt queued when dispatch acceptance is uncertain",
  async (destination) => {
    const statuses: unknown[] = [];
    server.use(
      ...publishAttemptHandlers((attempt) => statuses.push(attempt.status)),
      projectHandler,
      devBuildHandler(),
      productionBuildHandler(() => {})
    );
    const publish = vi.fn().mockResolvedValue({
      success: false,
      error: "Network failure",
      dispatchUncertain: true,
    });
    if (destination === "saas") {
      await expect(
        publishProject(
          { project: loadedProject, domains: ["project.wstd.io"] },
          createPublishContext(publish)
        )
      ).rejects.toThrow("Network failure");
    } else {
      await expect(
        publishStaticProject(
          { projectId: "project-1", name: "project.zip", templates: [] },
          createPublishContext(publish)
        )
      ).resolves.toMatchObject({ success: false, dispatchUncertain: true });
    }
    expect(statuses).toEqual(["QUEUED"]);
  }
);

test("replays an idempotent publish without creating another build", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let productionBuildCount = 0;
  server.use(
    ...publishAttemptHandlers(),
    projectHandler,
    devBuildHandler(),
    productionBuildHandler(() => {
      productionBuildCount += 1;
    })
  );
  const publishOnce = () =>
    publishProject(
      {
        project: loadedProject,
        domains: ["project.wstd.io"],
        idempotencyKey: "request-1",
      },
      createPublishContext(publish)
    );

  const first = await publishOnce();
  const replay = await publishOnce();

  expect(first.attempt.status).toBe("QUEUED");
  expect(replay.attempt.status).toBe("QUEUED");
  expect(replay.attempt.id).toBe(first.attempt.id);
  expect(productionBuildCount).toBe(1);
  expect(publish).toHaveBeenCalledTimes(1);
});

test("publishes static project through shared domain service", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let productionBuildRequest:
    | { project_id: string; deployment: string }
    | undefined;
  server.use(
    ...publishAttemptHandlers(),
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
  expect(publish).toHaveBeenCalledWith(
    expect.objectContaining({
      builderOrigin: "https://apps.webstudio.is",
      githubSha: "sha-1",
      buildId: "build-prod",
      branchName: "main",
      destination: "static",
      logProjectName: "Project One - project-1",
      reportRetentionDays: 1,
    })
  );
});

test("replays a static export without a requested name", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  const artifactNames: string[] = [];
  server.use(
    ...publishAttemptHandlers(),
    projectHandler,
    devBuildHandler(),
    productionBuildHandler(({ deployment }) => {
      artifactNames.push(JSON.parse(deployment).name);
    })
  );
  const publishOnce = () =>
    publishStaticProject(
      { projectId: "project-1", templates: [], idempotencyKey: "request-1" },
      createPublishContext(publish)
    );

  const first = await publishOnce();
  const replay = await publishOnce();
  const explicitName = await publishStaticProject(
    {
      projectId: "project-1",
      templates: [],
      name: "named.zip",
      idempotencyKey: "request-1",
    },
    createPublishContext(publish)
  );
  const differentKey = await publishStaticProject(
    { projectId: "project-1", templates: [], idempotencyKey: "request-2" },
    createPublishContext(publish)
  );

  expect(first.success).toBe(true);
  expect(replay.success).toBe(true);
  expect(explicitName.success).toBe(true);
  expect(differentKey.success).toBe(true);
  if (
    first.success &&
    replay.success &&
    explicitName.success &&
    differentKey.success
  ) {
    expect(replay.attempt.id).toBe(first.attempt.id);
    expect(replay.name).toBe(first.name);
    expect(explicitName.attempt.id).not.toBe(first.attempt.id);
    expect(differentKey.attempt.id).not.toBe(first.attempt.id);
    expect(artifactNames).toEqual([first.name, "named.zip", differentKey.name]);
  }
  expect(publish).toHaveBeenCalledTimes(3);
});

test.each(["SUCCEEDED", "FAILED", "BLOCKED"] as const)(
  "replays a terminal %s static attempt without dispatching again",
  async (status) => {
    const publish = vi.fn().mockResolvedValue({ success: true });
    server.use(
      ...publishAttemptHandlers(),
      projectHandler,
      devBuildHandler(),
      productionBuildHandler(() => {})
    );
    const publishContext = createPublishContext(publish);
    const input = {
      projectId: "project-1",
      templates: [] as [],
      idempotencyKey: "request-1",
    };
    const first = await publishStaticProject(input, publishContext);
    expect(first.success).toBe(true);
    if (first.success === false) {
      return;
    }
    await updatePublishAttempt(first.attempt.id, { status }, publishContext);

    const replay = await publishStaticProject(input, publishContext);
    expect(replay).toMatchObject({
      success: true,
      attempt: { id: first.attempt.id, status },
    });
    expect(publish).toHaveBeenCalledOnce();
  }
);

test("rejects publishing when dev build has orphan resource references", async () => {
  const publish = vi.fn().mockResolvedValue({ success: true });
  let didCreateProductionBuild = false;
  server.use(
    ...publishAttemptHandlers(),
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
      { project: loadedProject, domains: ["project.wstd.io"] },
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
    db.get("PublishAttempt", () => json([])),
    db.get("Build", () =>
      json([
        {
          id: "build-prod",
          version: 3,
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:01:00.000Z",
          publishStatus: "PUBLISHED",
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

  await expect(
    listProjectPublishes("project-1", createPublishContext())
  ).resolves.toEqual({
    publishes: [
      {
        id: "build-prod",
        jobId: "build-prod",
        buildId: "build-prod",
        version: 3,
        target: "production",
        domains: ["example.com", "www.example.com"],
        status: "succeeded",
        summary: "Published successfully",
        auditErrorCount: 0,
        auditWarningCount: 0,
        diagnosticErrors: 0,
        diagnosticWarnings: 0,
        issues: [],
        reportAvailability: "not_created",
        artifact: undefined,
        createdAt: "2024-01-03T00:00:00.000Z",
        completedAt: "2024-01-03T00:01:00.000Z",
      },
    ],
  });
});

test("free legacy activity keeps the latest publish for each domain across pages", async () => {
  const queries: URLSearchParams[] = [];
  const builds = [
    ...Array.from({ length: 1000 }, (_, index) => ({
      id: `build-${index}`,
      version: index,
      createdAt: new Date(Date.now() - index * 1000).toISOString(),
      updatedAt: new Date(Date.now() - index * 1000).toISOString(),
      publishStatus: "PUBLISHED",
      deployment: JSON.stringify({
        destination: "saas",
        domains: ["a.example"],
      }),
    })),
    {
      id: "build-b",
      version: 1000,
      createdAt: new Date(Date.now() - 1000 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 1000).toISOString(),
      publishStatus: "PUBLISHED",
      deployment: JSON.stringify({
        destination: "saas",
        domains: ["a.example", "b.example"],
      }),
    },
    {
      id: "build-c",
      version: 1001,
      createdAt: new Date(Date.now() - 1001 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1001 * 1000).toISOString(),
      publishStatus: "PUBLISHED",
      deployment: JSON.stringify({
        destination: "saas",
        domains: ["b.example", "c.example"],
      }),
    },
  ];
  server.use(
    db.get("PublishAttempt", () => json([])),
    db.get("Build", ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params);
      const offset = Number(params.get("offset") ?? 0);
      const limit = Number(params.get("limit") ?? builds.length);
      return json(builds.slice(offset, offset + limit));
    })
  );

  const result = await listProjectPublishes("project-1", {
    ...context,
    planFeatures: { ...context.planFeatures, publishActivityRetentionDays: 0 },
  } as AppContext);

  expect(
    result.publishes.map(({ id, domains, target }) => ({ id, domains, target }))
  ).toEqual([
    { id: "build-0", domains: ["a.example"], target: "staging" },
    { id: "build-b", domains: ["b.example"], target: "production" },
    { id: "build-c", domains: ["c.example"], target: "production" },
  ]);
  expect(queries.map((query) => query.get("offset"))).toEqual(["0", "1000"]);
  expect(
    queries.every((query) => query.get("order") === "createdAt.desc,id.desc")
  ).toBe(true);
  expect(queries.every((query) => query.get("createdAt") === null)).toBe(true);
});

test("paid legacy activity is limited to the retained window", async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime();
  let createdAtFilter: string | null = null;
  server.use(
    db.get("PublishAttempt", () => json([])),
    db.get("Build", ({ request }) => {
      createdAtFilter = new URL(request.url).searchParams.get("createdAt");
      const rows = [
        { id: "recent", createdAt: new Date(Date.now() - 1000).toISOString() },
        { id: "old", createdAt: new Date(cutoff - 1000).toISOString() },
      ].map((row) => ({
        ...row,
        version: 1,
        updatedAt: row.createdAt,
        publishStatus: "PUBLISHED",
        deployment: JSON.stringify({
          destination: "saas",
          domains: ["a.example"],
        }),
      }));
      return json(
        rows.filter(
          (row) =>
            createdAtFilter === null ||
            new Date(row.createdAt).getTime() >=
              new Date(createdAtFilter.slice(4)).getTime()
        )
      );
    })
  );

  const result = await listProjectPublishes(
    "project-1",
    createPublishContext()
  );

  expect(createdAtFilter).toMatch(/^gte\./);
  expect(result.publishes.map(({ id }) => id)).toEqual(["recent"]);
});

test("returns publish job status from deployment record", async () => {
  server.use(
    http.get(`${postgrestUrl}/PublishAttempt`, () => empty({ status: 204 })),
    db.get("Build", () =>
      json({
        id: "build-prod",
        version: 3,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:01:00.000Z",
        publishStatus: "PUBLISHED",
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
    status: "succeeded",
    domains: ["example.com"],
    createdAt: "2024-01-03T00:00:00.000Z",
    completedAt: "2024-01-03T00:01:00.000Z",
  });
});

test.each([
  ["PENDING", "pending", undefined],
  ["FAILED", "failed", "2024-01-03T00:01:00.000Z"],
] as const)(
  "maps %s publisher state without claiming success",
  async (publishStatus, status, completedAt) => {
    server.use(
      db.get("PublishAttempt", () => empty({ status: 204 })),
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
  server.use(
    http.get(`${postgrestUrl}/PublishAttempt`, () => empty({ status: 204 })),
    db.get("Build", () => empty({ status: 204 }))
  );

  await expect(
    getProjectPublishJob({ projectId: "project-1", jobId: "missing" }, context)
  ).resolves.toBeUndefined();
});
