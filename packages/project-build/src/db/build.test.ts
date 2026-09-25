import { describe, test, expect, vi } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import {
  loadRawBuildById,
  loadBuildById,
  loadDevBuildContentEngineDataByProjectId,
  loadDevBuildByProjectId,
  createBuild,
  createProductionBuild,
  unpublishBuild,
  __testing__,
} from "./build";

const server = createTestServer();
const { canTokenPublishDeployment } = __testing__;

const uid = () => `proj-${Math.random().toString(36).slice(2)}`;

const createContext = (userId = "user-1"): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId },
    getOwnerPlanFeatures: async () => ({}),
  }) as unknown as AppContext;

/** hasProjectPermit: return the row when userId param is in the query */
const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

/** Minimal Build row that satisfies parseCompactBuild */
const buildRow = {
  id: "build-1",
  projectId: "proj-1",
  version: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pages: JSON.stringify({
    meta: {},
    homePage: {
      id: "page-1",
      name: "Home",
      path: "/",
      title: '"Home"',
      meta: {},
      rootInstanceId: "body-1",
      systemDataSourceId: undefined,
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

// ---------------------------------------------------------------------------
// loadRawBuildById
// ---------------------------------------------------------------------------

describe("loadRawBuildById (msw)", () => {
  test("returns raw build row", async () => {
    server.use(db.get("Build", () => json([buildRow])));
    const result = await loadRawBuildById(createContext(), "build-1");
    expect(result.id).toBe("build-1");
  });

  test("throws when build not found", async () => {
    server.use(db.get("Build", () => json([])));
    await expect(loadRawBuildById(createContext(), "missing")).rejects.toThrow(
      "0 row(s)"
    );
  });

  test("throws when multiple rows returned", async () => {
    server.use(
      db.get("Build", () => json([buildRow, { ...buildRow, id: "build-2" }]))
    );
    await expect(loadRawBuildById(createContext(), "build-1")).rejects.toThrow(
      "2 row(s)"
    );
  });
});

// ---------------------------------------------------------------------------
// loadBuildById (delegates to loadRawBuildById + parseCompactBuild)
// ---------------------------------------------------------------------------

describe("loadBuildById (msw)", () => {
  test("returns parsed build with id and projectId", async () => {
    server.use(db.get("Build", () => json([buildRow])));
    const result = await loadBuildById(createContext(), "build-1");
    expect(result.id).toBe("build-1");
    expect(result.projectId).toBe("proj-1");
    expect(result.marketplaceProduct).toBeUndefined();
  });

  test("rejects invalid persisted data sources", async () => {
    server.use(
      db.get("Build", () =>
        json([
          {
            ...buildRow,
            dataSources: JSON.stringify([
              {
                id: "tags-variable",
                type: "variable",
                name: "tags",
                value: { type: "string[]", value: ["news"] },
              },
            ]),
          },
        ])
      )
    );

    await expect(loadBuildById(createContext(), "build-1")).rejects.toThrow();
  });

  test("normalizes persisted Assets resources before publishing or syncing", async () => {
    server.use(
      db.get("Build", () =>
        json([
          {
            ...buildRow,
            resources: JSON.stringify([
              {
                id: "assets",
                name: "Assets",
                control: "system",
                method: "get",
                url: '"/$resources/assets"',
                searchParams: [],
                headers: [],
              },
            ]),
          },
        ])
      )
    );

    const result = await loadBuildById(createContext(), "build-1");

    expect(result.resources).toMatchObject([
      {
        id: "assets",
        method: "post",
        headers: [
          {
            name: "Content-Type",
            value: '"application/json"',
          },
        ],
      },
    ]);
    expect(result.resources[0].body).toContain("limit: 1000");
  });

  test("migrates project settings from legacy pages", async () => {
    server.use(
      db.get("Build", () =>
        json([
          {
            ...buildRow,
            pages: JSON.stringify({
              ...JSON.parse(buildRow.pages),
              meta: { siteName: "Legacy site" },
              compiler: { atomicStyles: false },
            }),
            projectSettings: undefined,
          },
        ])
      )
    );

    const result = await loadBuildById(createContext(), "build-1");

    expect(result.projectSettings).toEqual({
      meta: { siteName: "Legacy site" },
      compiler: { atomicStyles: false },
    });
    expect(result.pages.meta).toBeUndefined();
    expect(result.pages.compiler).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// loadDevBuildByProjectId
// ---------------------------------------------------------------------------

describe("loadDevBuildByProjectId (msw)", () => {
  test("returns the dev build (no deployment)", async () => {
    server.use(db.get("Build", () => json([buildRow])));
    const result = await loadDevBuildByProjectId(createContext(), "proj-1");
    expect(result.projectId).toBe("proj-1");
  });

  test("throws when no dev build found", async () => {
    server.use(db.get("Build", () => json([])));
    await expect(
      loadDevBuildByProjectId(createContext(), "proj-1")
    ).rejects.toThrow("No dev build found");
  });

  test("cancels the full Build request with the caller signal", async () => {
    server.use(db.get("Build", () => json([buildRow])));
    const controller = new AbortController();
    controller.abort();

    await expect(
      loadDevBuildByProjectId(createContext(), "proj-1", controller.signal)
    ).rejects.toMatchObject({
      message: expect.stringContaining("AbortError"),
    });
  });
});

describe("loadDevBuildContentEngineDataByProjectId (msw)", () => {
  test("selects only the Build fields used by the content engine", async () => {
    let requestedUrl: URL | undefined;
    server.use(
      db.get("Build", ({ request }) => {
        requestedUrl = new URL(request.url);
        return json([
          {
            props: JSON.stringify([]),
            dataSources: JSON.stringify([]),
            resources: JSON.stringify([]),
          },
        ]);
      })
    );

    const result = await loadDevBuildContentEngineDataByProjectId(
      createContext(),
      "proj-1"
    );

    expect(requestedUrl?.searchParams.get("select")).toBe(
      "props,dataSources,resources"
    );
    expect(requestedUrl?.searchParams.get("projectId")).toBe("eq.proj-1");
    expect(requestedUrl?.searchParams.get("deployment")).toBe("is.null");
    expect(result).toEqual({ props: [], dataSources: [], resources: [] });
  });

  test("parses the selected fields identically to the full dev Build loader", async () => {
    const row = {
      ...buildRow,
      props: JSON.stringify([
        {
          id: "title-prop",
          instanceId: "body-1",
          name: "title",
          type: "string",
          value: "Blog",
        },
      ]),
      dataSources: JSON.stringify([
        {
          type: "resource",
          id: "posts-data-source",
          name: "posts",
          resourceId: "assets",
        },
      ]),
      resources: JSON.stringify([
        {
          id: "assets",
          name: "Assets",
          control: "system",
          method: "get",
          url: '"/$resources/assets"',
          searchParams: [],
          headers: [],
        },
      ]),
    };
    server.use(db.get("Build", () => json([row])));

    const contentEngineData = await loadDevBuildContentEngineDataByProjectId(
      createContext(),
      "proj-1"
    );
    const fullBuild = await loadDevBuildByProjectId(createContext(), "proj-1");

    expect(contentEngineData).toEqual({
      props: fullBuild.props,
      dataSources: fullBuild.dataSources,
      resources: fullBuild.resources,
    });
  });

  test("cancels the partial Build request with the caller signal", async () => {
    server.use(
      db.get("Build", () =>
        json([
          {
            props: JSON.stringify([]),
            dataSources: JSON.stringify([]),
            resources: JSON.stringify([]),
          },
        ])
      )
    );
    const controller = new AbortController();
    controller.abort();

    await expect(
      loadDevBuildContentEngineDataByProjectId(
        createContext(),
        "proj-1",
        controller.signal
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining("AbortError"),
    });
  });
});

// ---------------------------------------------------------------------------
// createBuild
// ---------------------------------------------------------------------------

describe("createBuild (msw)", () => {
  test("inserts a new build row", async () => {
    let insertedRow: unknown;
    server.use(
      db.post("Build", async ({ request }) => {
        insertedRow = await request.json();
        return empty({ status: 201 });
      })
    );

    await createBuild({ projectId: "proj-1" }, createContext());
    expect(insertedRow).toMatchObject({ projectId: "proj-1" });
  });

  test("throws when insert fails", async () => {
    server.use(
      db.post("Build", () =>
        json({ message: "constraint violation" }, { status: 409 })
      )
    );

    await expect(
      createBuild({ projectId: "proj-1" }, createContext())
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createProductionBuild
// ---------------------------------------------------------------------------

describe("createProductionBuild (msw)", () => {
  test.each([
    {
      label: "Free owner, custom domain",
      allowed: false,
      domains: ["example.com"],
      headers: [{ name: "X-Frame-Options", value: "DENY" }],
      denied: true,
      checkPlan: true,
    },
    {
      label: "Free owner, legacy null fallback",
      allowed: false,
      domains: ["example.com"],
      headers: [{ name: "X-Frame-Options", value: null }],
      denied: false,
      checkPlan: false,
    },
    {
      label: "Free owner, route rule",
      allowed: false,
      domains: ["example.com"],
      headers: [
        {
          route: "/private/*",
          name: "Referrer-Policy",
          value: "no-referrer",
        },
      ],
      denied: true,
      checkPlan: true,
    },
    {
      label: "Free owner, mixed domains",
      allowed: false,
      domains: ["project-domain", "example.com"],
      headers: [{ name: "X-Frame-Options", value: "DENY" }],
      denied: true,
      checkPlan: true,
    },
    {
      label: "Free owner, staging",
      allowed: false,
      domains: ["project-domain"],
      headers: [{ name: "X-Frame-Options", value: "DENY" }],
      denied: false,
      checkPlan: false,
    },
    {
      label: "Pro owner, custom domain",
      allowed: true,
      domains: ["example.com"],
      headers: [{ name: "X-Frame-Options", value: "DENY" }],
      denied: false,
      checkPlan: true,
    },
    {
      label: "Free owner, deleted headers",
      allowed: false,
      domains: ["example.com"],
      headers: [],
      denied: false,
      checkPlan: false,
    },
    {
      label: "Free owner, explicit defaults",
      allowed: false,
      domains: ["example.com"],
      headers: [
        { name: "content-security-policy", value: "frame-ancestors 'self'" },
        { name: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
      denied: false,
      checkPlan: false,
    },
  ])(
    "enforces custom header publishing for $label",
    async ({ allowed, domains, headers, denied, checkPlan }) => {
      const context = createContext();
      // A collaborator's own plan must not determine the project's entitlement.
      context.planFeatures = {
        ...context.planFeatures,
        allowDynamicData: !allowed,
      };
      const getOwnerPlanFeatures = vi.fn(async () => ({
        ...context.planFeatures,
        allowDynamicData: allowed,
      }));
      context.getOwnerPlanFeatures = getOwnerPlanFeatures;
      const createBuild = vi.fn(() => json("build-prod"));
      const removeBuild = vi.fn(() => empty({ status: 204 }));
      server.use(
        db.get("Project", () =>
          json({
            id: "proj-1",
            userId: "project-owner",
            domain: "project-domain",
          })
        ),
        db.get("Build", () =>
          json([
            {
              ...buildRow,
              projectSettings: JSON.stringify({
                meta: { customHeaders: headers },
                compiler: {},
              }),
            },
          ])
        ),
        db.post("rpc/create_production_build", createBuild),
        db.delete("Build", removeBuild)
      );
      const result = createProductionBuild(
        {
          projectId: "proj-1",
          deployment: {
            destination: "saas",
            domains,
            // Deliberately misleading caller-supplied metadata must not bypass the gate.
            target: "staging",
            assetsDomain: domains[0],
          },
        },
        context
      );
      if (denied) {
        await expect(result).rejects.toThrow(
          "Custom headers are a Pro feature"
        );
        expect(removeBuild).toHaveBeenCalledOnce();
      } else {
        await expect(result).resolves.toEqual({ id: "build-prod" });
        expect(removeBuild).not.toHaveBeenCalled();
      }
      expect(createBuild).toHaveBeenCalledOnce();
      if (checkPlan) {
        expect(getOwnerPlanFeatures).toHaveBeenCalledExactlyOnceWith(
          "project-owner"
        );
      } else {
        expect(getOwnerPlanFeatures).not.toHaveBeenCalled();
      }
    }
  );

  test.each([
    { label: "custom value", value: "DENY", allowed: false, staging: false },
    {
      label: "legacy null fallback",
      value: null,
      allowed: false,
      staging: false,
    },
    { label: "Pro owner", value: "DENY", allowed: true, staging: false },
    { label: "staging", value: "DENY", allowed: false, staging: true },
    {
      label: "default value",
      value: "SAMEORIGIN",
      allowed: false,
      staging: false,
    },
  ])(
    "checks the published snapshot after a concurrent edit: $label",
    async ({ value, allowed, staging }) => {
      const context = createContext();
      context.getOwnerPlanFeatures = vi.fn(async () => ({
        ...context.planFeatures,
        allowDynamicData: allowed,
      }));
      const removeBuild = vi.fn(({ request }: { request: Request }) => {
        expect(new URL(request.url).searchParams.get("id")).toBe(
          "eq.build-prod"
        );
        return empty({ status: 204 });
      });
      const readSnapshot = vi.fn();
      server.use(
        db.get("Project", () =>
          json({
            id: "proj-1",
            userId: "project-owner",
            domain: "project-domain",
          })
        ),
        db.get("Build", ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get("id") === "eq.build-prod") {
            readSnapshot();
            expect(url.searchParams.get("select")).toBe("projectSettings");
            return json([
              {
                projectSettings: JSON.stringify({
                  meta: { customHeaders: [{ name: "X-Frame-Options", value }] },
                  compiler: {},
                }),
              },
            ]);
          }
          // Development settings change before the RPC snapshots them.
          return json([buildRow]);
        }),
        db.post("rpc/create_production_build", () => json("build-prod")),
        db.delete("Build", removeBuild)
      );
      const result = createProductionBuild(
        {
          projectId: "proj-1",
          deployment: {
            destination: "saas",
            domains: [staging ? "project-domain" : "example.com"],
          },
        },
        context
      );
      if (!allowed && !staging && value !== "SAMEORIGIN" && value !== null) {
        await expect(result).rejects.toThrow(
          "Custom headers are a Pro feature"
        );
        expect(removeBuild).toHaveBeenCalledOnce();
      } else {
        await expect(result).resolves.toEqual({ id: "build-prod" });
        expect(removeBuild).not.toHaveBeenCalled();
      }
      expect(readSnapshot).toHaveBeenCalledOnce();
    }
  );

  test("fails closed and removes the unpublished build when its settings cannot be verified", async () => {
    const removeBuild = vi.fn(() => empty({ status: 204 }));
    server.use(
      ownershipHandler,
      db.get("Build", ({ request }) =>
        new URL(request.url).searchParams.has("id")
          ? json([])
          : json([buildRow])
      ),
      db.post("rpc/create_production_build", () => json("build-prod")),
      db.delete("Build", removeBuild)
    );
    await expect(
      createProductionBuild(
        {
          projectId: "proj-1",
          deployment: { destination: "saas", domains: ["example.com"] },
        },
        createContext()
      )
    ).rejects.toThrow("Cannot verify published response headers");
    expect(removeBuild).toHaveBeenCalledOnce();
  });

  test("throws when dev build has orphan resource references", async () => {
    let didCreateProductionBuild = false;
    server.use(
      ownershipHandler,
      db.get("Build", () =>
        json([
          {
            ...buildRow,
            dataSources: JSON.stringify([
              {
                type: "resource",
                id: "dataSourceId",
                name: "pinnedAnnouncementData_1",
                resourceId: "missingResourceId",
              },
            ]),
          },
        ])
      ),
      db.post("rpc/create_production_build", () => {
        didCreateProductionBuild = true;
        return json("build-prod");
      })
    );

    await expect(
      createProductionBuild(
        {
          projectId: "proj-1",
          deployment: {
            destination: "saas",
            domains: ["project-domain"],
            assetsDomain: "project-domain",
            excludeWstdDomainFromSearch: false,
          },
        },
        createContext()
      )
    ).rejects.toThrow(
      `Cannot publish: resource variable "pinnedAnnouncementData_1" (dataSourceId) references missing resource "missingResourceId".`
    );
    expect(didCreateProductionBuild).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canTokenPublishDeployment
// ---------------------------------------------------------------------------

describe("canTokenPublishDeployment", () => {
  const token = {
    token: "token-1",
    projectId: "proj-1",
    name: "Share link",
    createdAt: new Date().toISOString(),
    canClone: true,
    canCopy: true,
    canPublish: false,
    canUseApi: false,
  };

  test("allows builder tokens to publish to the staging domain", () => {
    expect(
      canTokenPublishDeployment(
        { ...token, relation: "builders" },
        {
          destination: "saas",
          domains: ["project-domain"],
          assetsDomain: "project-domain",
          excludeWstdDomainFromSearch: false,
        }
      )
    ).toBe(true);
  });

  test("rejects builder tokens publishing to custom domains", () => {
    expect(
      canTokenPublishDeployment(
        { ...token, relation: "builders" },
        {
          destination: "saas",
          domains: ["project-domain", "example.com"],
          assetsDomain: "project-domain",
          excludeWstdDomainFromSearch: true,
        }
      )
    ).toBe(false);
  });

  test("rejects builder tokens publishing static builds", () => {
    expect(
      canTokenPublishDeployment(
        { ...token, relation: "builders" },
        {
          destination: "static",
          name: "build.zip",
          assetsDomain: "project-domain",
          templates: [],
        }
      )
    ).toBe(false);
  });

  test("allows tokens with full publish permission", () => {
    expect(
      canTokenPublishDeployment(
        { ...token, relation: "editors", canPublish: true },
        {
          destination: "saas",
          domains: ["example.com"],
          assetsDomain: "project-domain",
          excludeWstdDomainFromSearch: true,
        }
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// unpublishBuild
// ---------------------------------------------------------------------------

describe("unpublishBuild (msw)", () => {
  test("throws AuthorizationError when caller lacks edit access", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );

    await expect(
      unpublishBuild({ projectId, domain: "example.com" }, createContext())
    ).rejects.toThrow(AuthorizationError);
  });

  test("throws when domain is not published", async () => {
    const projectId = uid();
    server.use(
      ownershipHandler,
      // no builds with deployment containing example.com
      db.get("Build", () => json([]))
    );

    await expect(
      unpublishBuild({ projectId, domain: "example.com" }, createContext())
    ).rejects.toThrow("is not published");
  });

  test("deletes build when it has only the one domain", async () => {
    const projectId = uid();
    let buildDeleted = false;
    const deployment = JSON.stringify({
      destination: "saas",
      domains: ["example.com"],
    });

    server.use(
      ownershipHandler,
      db.get("Build", () => json([{ id: "build-prod", deployment }])),
      db.delete("Build", () => {
        buildDeleted = true;
        return empty({ status: 204 });
      })
    );

    await unpublishBuild({ projectId, domain: "example.com" }, createContext());
    expect(buildDeleted).toBe(true);
  });

  test("updates build deployment when it has multiple domains", async () => {
    const projectId = uid();
    let updatedDeployment: unknown;
    const deployment = JSON.stringify({
      destination: "saas",
      domains: ["example.com", "other.com"],
    });

    server.use(
      ownershipHandler,
      db.get("Build", () => json([{ id: "build-prod", deployment }])),
      db.patch("Build", async ({ request }) => {
        updatedDeployment = await request.json();
        return json({ id: "build-prod" });
      })
    );

    await unpublishBuild({ projectId, domain: "example.com" }, createContext());

    expect(updatedDeployment).toMatchObject({
      deployment: expect.stringContaining("other.com"),
    });
    expect(updatedDeployment).toMatchObject({
      deployment: expect.not.stringContaining("example.com"),
    });
  });
});
