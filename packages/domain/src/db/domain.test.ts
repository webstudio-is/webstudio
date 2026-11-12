import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  countTotalDomains,
  create,
  remove,
  updateStatus,
  verify,
} from "./domain";

const server = createTestServer();

const createContext = (overrides: Partial<AppContext> = {}): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "owner-1" },
    getOwnerPlanFeatures: () =>
      Promise.resolve({ maxDomainsAllowedPerUser: 5, maxWorkspaces: 20 }),
    domain: {},
    deployment: {
      deploymentTrpc: {
        unpublish: {
          mutate: () => Promise.resolve({ success: true }),
        },
      },
      env: {
        BUILDER_ORIGIN: "https://apps.webstudio.is",
        GITHUB_REF_NAME: "main",
        GITHUB_SHA: undefined,
        PUBLISHER_HOST: "wstd.io",
      },
    },
    entri: {},
    ...overrides,
  }) as unknown as AppContext;

/**
 * hasProjectPermit checks ownership via:
 *   GET /Project?id=eq.{id}&userId=eq.{userId}
 * Returning a row grants access.
 *
 * loadById (called inside domain.create) queries:
 *   GET /Project?id=eq.{id}&isDeleted=eq.false&select=*,...
 * We dispatch on whether the userId param is present.
 */
const projectHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    // ownership check — confirm user-1 owns proj-1
    return json({ id: "proj-1" });
  }
  // loadById full select
  return json({
    id: "proj-1",
    userId: "owner-1",
    title: "Test",
    domain: "test",
    isDeleted: false,
    previewImageAsset: null,
    latestBuildVirtual: null,
    domainsVirtual: [],
    latestStaticBuild: [],
  });
});

// ---------------------------------------------------------------------------
// countTotalDomains
// Verifies the JOIN-based HEAD query hits the right table and filter.
// ---------------------------------------------------------------------------

describe("countTotalDomains (msw)", () => {
  test("returns count from Content-Range header", async () => {
    server.use(
      db.head("Domain", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("Project.userId")).toBe("eq.owner-1");
        expect(url.searchParams.get("Project.isDeleted")).toBe("eq.false");
        return empty({ headers: { "Content-Range": "*/3" } });
      })
    );

    const count = await countTotalDomains("owner-1", createContext());
    expect(count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// create — domain limit guard
// Verifies that reaching maxDomainsAllowedPerUser returns an error without
// touching the Domain or ProjectDomain tables.
// ---------------------------------------------------------------------------

describe("create — domain limit guard (msw)", () => {
  test("returns error when owner is at the domain limit", async () => {
    server.use(
      projectHandler,
      db.head("Domain", () => empty({ headers: { "Content-Range": "*/5" } }))
    );

    const result = await create(
      {
        projectId: "proj-1",
        domain: "example.com",
      },
      createContext()
    );

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("maximum number of allowed domains"),
    });
  });

  test("creates domain entries when under the limit", async () => {
    server.use(
      projectHandler,
      // countTotalDomains — owner has 0
      db.head("Domain", () => empty({ headers: { "Content-Range": "*/0" } })),
      // upsert into Domain (ignoreDuplicates)
      db.post("Domain", () => empty({ status: 204 })),
      // fetch domain id after upsert
      db.get("Domain", () => json({ id: "domain-id-1" })),
      // insert into ProjectDomain
      db.post("ProjectDomain", () => empty({ status: 201 }))
    );

    const result = await create(
      {
        projectId: "proj-1",
        domain: "example.com",
      },
      createContext()
    );

    expect(result).toEqual({ success: true });
  });

  test("uses project owner's domain limit for workspace member admins", async () => {
    const ownerPlanCalls: string[] = [];
    let projectDomainInserted = false;

    server.use(
      db.get("Project", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("userId")) {
          return json(null);
        }
        return json({
          id: "proj-1",
          userId: "owner-1",
          workspaceId: "ws-1",
          title: "Test",
          domain: "test",
          isDeleted: false,
          previewImageAsset: null,
          latestBuildVirtual: null,
          domainsVirtual: [],
          latestStaticBuild: [],
        });
      }),
      db.get("WorkspaceProjectAuthorization", () =>
        json([{ relation: "administrators" }])
      ),
      db.head("Domain", () => empty({ headers: { "Content-Range": "*/1" } })),
      db.post("Domain", () => empty({ status: 204 })),
      db.get("Domain", () => json({ id: "domain-id-1" })),
      db.post("ProjectDomain", () => {
        projectDomainInserted = true;
        return empty({ status: 201 });
      })
    );

    const result = await create(
      {
        projectId: "proj-1",
        domain: "example.com",
      },
      createContext({
        authorization: { type: "user", userId: "member-1" },
        planFeatures: { maxDomainsAllowedPerUser: 0 },
        getOwnerPlanFeatures: (userId: string) => {
          ownerPlanCalls.push(userId);
          return Promise.resolve({
            maxDomainsAllowedPerUser: 5,
            maxWorkspaces: 20,
          });
        },
      } as unknown as Partial<AppContext>)
    );

    expect(result).toEqual({ success: true });
    expect(projectDomainInserted).toBe(true);
    expect(ownerPlanCalls).toEqual(["owner-1"]);
  });
});

// The RPC handlers stand in for the migration's single-hostname claim. They
// keep the remote call and the final database mutation in a known order.
const domainLink = db.get("ProjectDomain", () =>
  json({
    txtRecord: "txt-1",
    cname: "example.wstd.io",
    domain: { id: "domain-id-1", domain: "example.com" },
  })
);

describe("remove (msw)", () => {
  test("releases the last hostname before detaching its link", async () => {
    const events: string[] = [];
    server.use(
      projectHandler,
      domainLink,
      db.get("Build", () => json([])),
      db.post("rpc/claim_domain_operation", () => {
        events.push("claim");
        return json(1);
      }),
      db.post("rpc/finish_domain_operation", async ({ request }) => {
        expect(await request.json()).toMatchObject({ p_remove: true });
        events.push("finish");
        return json(true);
      })
    );
    const result = await remove(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        domain: {
          domainTrpc: {
            remove: {
              mutate: () => {
                events.push("release hostname");
                return Promise.resolve({ success: true });
              },
            },
          },
        },
        deployment: {
          ...createContext().deployment,
          deploymentTrpc: {
            unpublish: {
              mutate: () => {
                events.push("unpublish");
                return Promise.resolve({ success: true });
              },
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );
    expect(result).toEqual({ success: true });
    expect(events).toEqual([
      "claim",
      "unpublish",
      "release hostname",
      "finish",
    ]);
  });

  test("keeps a shared hostname when detaching one project", async () => {
    let released = false;
    server.use(
      projectHandler,
      domainLink,
      db.get("Build", () => json([])),
      db.post("rpc/claim_domain_operation", () => json(2)),
      db.post("rpc/finish_domain_operation", () => json(true))
    );
    const result = await remove(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        domain: {
          domainTrpc: {
            remove: {
              mutate: () => {
                released = true;
                return Promise.resolve({ success: true });
              },
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );
    expect(result).toEqual({ success: true });
    expect(released).toBe(false);
  });

  test("does not detach when unpublish fails", async () => {
    let finished = false;
    server.use(
      projectHandler,
      domainLink,
      db.post("rpc/claim_domain_operation", () => json(1)),
      db.post("rpc/finish_domain_operation", () => {
        finished = true;
        return json(true);
      }),
      db.post("rpc/release_domain_operation", () => json(true))
    );
    const result = await remove(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        deployment: {
          ...createContext().deployment,
          deploymentTrpc: {
            unpublish: {
              mutate: () =>
                Promise.resolve({ success: false, error: "Cloudflare failed" }),
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );
    expect(result).toEqual({ success: false, error: "Cloudflare failed" });
    expect(finished).toBe(false);
  });

  test("releases the claim and keeps the link when hostname cleanup fails", async () => {
    let finished = false;
    let releasedClaim = false;
    server.use(
      projectHandler,
      domainLink,
      db.get("Build", () => json([])),
      db.post("rpc/claim_domain_operation", () => json(1)),
      db.post("rpc/finish_domain_operation", () => {
        finished = true;
        return json(true);
      }),
      db.post("rpc/release_domain_operation", () => {
        releasedClaim = true;
        return json(true);
      })
    );
    const result = await remove(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        domain: {
          domainTrpc: {
            remove: {
              mutate: () =>
                Promise.resolve({ success: false, error: "Cloudflare failed" }),
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );
    expect(result).toEqual({ success: false, error: "Cloudflare failed" });
    expect(finished).toBe(false);
    expect(releasedClaim).toBe(true);
  });

  test("a competing removal retries after the first link is detached", async () => {
    let links = 2;
    let claimed = false;
    let releases = 0;
    let unblockFirst: () => void = () => {};
    const firstWaiting = new Promise<void>((resolve) => {
      unblockFirst = resolve;
    });
    let signalClaimed: () => void = () => {};
    const claimStarted = new Promise<void>((resolve) => {
      signalClaimed = resolve;
    });
    server.use(
      projectHandler,
      domainLink,
      db.get("Build", () => json([])),
      db.post("rpc/claim_domain_operation", () => {
        if (claimed) {
          return json(-1);
        }
        claimed = true;
        signalClaimed();
        return json(links);
      }),
      db.post("rpc/finish_domain_operation", () => {
        links -= 1;
        claimed = false;
        return json(true);
      })
    );
    const context = createContext({
      domain: {
        domainTrpc: {
          remove: {
            mutate: () => {
              releases += 1;
              return Promise.resolve({ success: true });
            },
          },
        },
      },
      deployment: {
        ...createContext().deployment,
        deploymentTrpc: {
          unpublish: {
            mutate: async () => {
              if (links === 2) {
                await firstWaiting;
              }
              return { success: true };
            },
          },
        },
      },
    } as unknown as Partial<AppContext>);
    const first = remove(
      { projectId: "proj-1", domainId: "domain-id-1" },
      context
    );
    await claimStarted;
    const competing = await remove(
      { projectId: "proj-2", domainId: "domain-id-1" },
      context
    );
    expect(competing.success).toBe(false);
    unblockFirst();
    expect(await first).toEqual({ success: true });
    expect(
      await remove({ projectId: "proj-2", domainId: "domain-id-1" }, context)
    ).toEqual({ success: true });
    expect(links).toBe(0);
    expect(releases).toBe(1);
  });
});

describe("verify (msw)", () => {
  test("claims the hostname before creating it", async () => {
    const events: string[] = [];
    server.use(
      projectHandler,
      domainLink,
      db.post("rpc/claim_domain_operation", () => {
        events.push("claim");
        return json(1);
      }),
      db.patch("Domain", () => {
        events.push("status");
        return json({ id: "domain-id-1" });
      }),
      db.post("rpc/finish_domain_operation", async ({ request }) => {
        expect(await request.json()).toMatchObject({ p_remove: false });
        events.push("finish");
        return json(true);
      })
    );
    const result = await verify(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        domain: {
          domainTrpc: {
            create: {
              mutate: () => {
                events.push("create hostname");
                return Promise.resolve({ success: true });
              },
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );
    expect(result).toEqual({ success: true });
    expect(events).toEqual(["claim", "create hostname", "status", "finish"]);
  });

  test("does not recreate a hostname while removal holds the claim", async () => {
    let created = false;
    server.use(
      projectHandler,
      domainLink,
      db.post("rpc/claim_domain_operation", () => json(-1))
    );
    const result = await verify(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        domain: {
          domainTrpc: {
            create: {
              mutate: () => {
                created = true;
                return Promise.resolve({ success: true });
              },
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );
    expect(result.success).toBe(false);
    expect(created).toBe(false);
  });
});

describe("updateStatus (msw)", () => {
  test("does not check a hostname removed from the project", async () => {
    let checked = false;
    server.use(
      projectHandler,
      db.get("ProjectDomain", () => json([]))
    );

    const result = await updateStatus(
      { projectId: "proj-1", domain: "example.com" },
      createContext({
        domain: {
          domainTrpc: {
            getStatus: {
              query: () => {
                checked = true;
                return Promise.resolve({
                  success: true,
                  data: { status: "active" },
                });
              },
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );

    expect(result.success).toBe(false);
    expect(checked).toBe(false);
  });

  test("checks a hostname still linked to the project", async () => {
    let checked = false;
    server.use(
      projectHandler,
      db.get("ProjectDomain", () =>
        json([{ domain: { id: "domain-id-1", domain: "example.com" } }])
      ),
      db.post("rpc/claim_domain_operation", () => json(1)),
      db.post("rpc/finish_domain_operation", () => json(true)),
      db.patch("Domain", () =>
        json({ id: "domain-id-1", domain: "example.com", status: "ACTIVE" })
      )
    );

    const result = await updateStatus(
      { projectId: "proj-1", domain: "example.com" },
      createContext({
        domain: {
          domainTrpc: {
            getStatus: {
              query: () => {
                checked = true;
                return Promise.resolve({
                  success: true,
                  data: { status: "active" },
                });
              },
            },
          },
        },
      } as unknown as Partial<AppContext>)
    );

    expect(result.success).toBe(true);
    expect(checked).toBe(true);
  });
});
