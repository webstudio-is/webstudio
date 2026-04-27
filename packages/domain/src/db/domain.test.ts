import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { countTotalDomains, create, remove } from "./domain";

const server = createTestServer();

const createContext = (overrides: Partial<AppContext> = {}): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "owner-1" },
    getOwnerPlanFeatures: () => Promise.resolve({}),
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
        maxDomainsAllowedPerUser: 5,
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
        maxDomainsAllowedPerUser: 5,
      },
      createContext()
    );

    expect(result).toEqual({ success: true });
  });
});

// ---------------------------------------------------------------------------
// remove
// Detaches the domain only after unpublishing and marks unreferenced domains
// inactive so they do not remain ACTIVE orphans.
// ---------------------------------------------------------------------------

describe("remove (msw)", () => {
  test("unpublishes, detaches, and marks an unreferenced domain inactive", async () => {
    let unpublishedDomain: string | undefined;
    let projectDomainDeleted = false;
    let domainUpdate: unknown;

    server.use(
      projectHandler,
      db.get("ProjectDomain", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("domainId")).toBe("eq.domain-id-1");
        expect(url.searchParams.get("projectId")).toBe("eq.proj-1");
        return json({
          domain: {
            id: "domain-id-1",
            domain: "example.com",
          },
        });
      }),
      db.get("Build", () => json([])),
      db.delete("ProjectDomain", () => {
        projectDomainDeleted = true;
        return empty({ status: 204 });
      }),
      db.head("ProjectDomain", () =>
        empty({ headers: { "Content-Range": "*/0" } })
      ),
      db.patch("Domain", async ({ request }) => {
        domainUpdate = await request.json();
        return json({ id: "domain-id-1" });
      })
    );

    const result = await remove(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        deployment: {
          deploymentTrpc: {
            publish: {
              mutate: () => Promise.resolve({ success: true }),
            },
            unpublish: {
              mutate: ({ domain }: { domain: string }) => {
                unpublishedDomain = domain;
                return Promise.resolve({ success: true });
              },
            },
          },
          env: {
            BUILDER_ORIGIN: "https://apps.webstudio.is",
            GITHUB_REF_NAME: "main",
            GITHUB_SHA: undefined,
            PUBLISHER_HOST: "wstd.io",
          },
        },
      })
    );

    expect(result).toEqual({ success: true });
    expect(unpublishedDomain).toBe("example.com");
    expect(projectDomainDeleted).toBe(true);
    expect(domainUpdate).toEqual({
      status: "INITIALIZING",
      error: "Removed from project",
      txtRecord: null,
    });
  });

  test("does not detach when unpublish fails", async () => {
    let projectDomainDeleted = false;

    server.use(
      projectHandler,
      db.get("ProjectDomain", () =>
        json({
          domain: {
            id: "domain-id-1",
            domain: "example.com",
          },
        })
      ),
      db.delete("ProjectDomain", () => {
        projectDomainDeleted = true;
        return empty({ status: 204 });
      })
    );

    const result = await remove(
      { projectId: "proj-1", domainId: "domain-id-1" },
      createContext({
        deployment: {
          deploymentTrpc: {
            publish: {
              mutate: () => Promise.resolve({ success: true }),
            },
            unpublish: {
              mutate: () =>
                Promise.resolve({ success: false, error: "Cloudflare failed" }),
            },
          },
          env: {
            BUILDER_ORIGIN: "https://apps.webstudio.is",
            GITHUB_REF_NAME: "main",
            GITHUB_SHA: undefined,
            PUBLISHER_HOST: "wstd.io",
          },
        },
      })
    );

    expect(result).toEqual({ success: false, error: "Cloudflare failed" });
    expect(projectDomainDeleted).toBe(false);
  });
});
