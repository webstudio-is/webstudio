import { describe, expect, test, vi } from "vitest";
import { executeProjectSessionApiOperation } from "./project-session-api";

type CreateProjectSession = NonNullable<
  Parameters<
    typeof executeProjectSessionApiOperation
  >[0]["createProjectSession"]
>;

describe("project session api adapter", () => {
  test("routes local-capable commands through project session runtime", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(async () => ({
        operationId: "pages.list",
        projectId: "project-1",
        source: "local",
        result: ["page"],
        state: { committed: false, freshness: {} },
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [],
      })),
      mutate: vi.fn(),
      refresh: vi.fn(),
      executeServerOperation: vi.fn(),
    };
    const createProjectSession = vi.fn(
      () => session
    ) as unknown as CreateProjectSession;

    const result = await executeProjectSessionApiOperation({
      command: "list-pages",
      input: { limit: 20 },
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession,
    });

    expect(session.read).toHaveBeenCalledWith(
      "pages.list",
      { projectId: "project-1", limit: 20 },
      { permit: "view" }
    );
    expect(result.result).toEqual(["page"]);
  });

  test("keeps configured project id for local-capable commands", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(async () => ({
        operationId: "pages.list",
        projectId: "project-1",
        source: "local",
        result: [],
        state: { committed: false, freshness: {} },
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [],
      })),
      mutate: vi.fn(),
      refresh: vi.fn(),
      executeServerOperation: vi.fn(),
    };

    await executeProjectSessionApiOperation({
      command: "list-pages",
      input: { projectId: "other-project" },
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession: vi.fn(
        () => session
      ) as unknown as CreateProjectSession,
    });

    expect(session.read).toHaveBeenCalledWith(
      "pages.list",
      { projectId: "project-1" },
      { permit: "view" }
    );
  });

  test("does not inject project id into strict audit input", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(async () => ({
        operationId: "project.audit",
        projectId: "project-1",
        source: "local",
        result: { findings: [] },
        state: { committed: false, freshness: {} },
        namespaces: {
          read: [],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [],
      })),
      mutate: vi.fn(),
      refresh: vi.fn(),
      executeServerOperation: vi.fn(),
    };

    await executeProjectSessionApiOperation({
      command: "audit",
      input: { scopes: ["seo"] },
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession: vi.fn(
        () => session
      ) as unknown as CreateProjectSession,
    });

    expect(session.read).toHaveBeenCalledWith(
      "project.audit",
      { scopes: ["seo"] },
      { permit: "view" }
    );
  });

  test("routes server-only commands through project session transport", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(async () => ({
        operationId: "auth.me",
        projectId: "project-1",
        source: "server",
        result: { actor: "token" },
        state: { committed: true, freshness: {} },
        namespaces: { read: [], write: [], invalidated: [], missing: [] },
        diagnostics: [],
      })),
      refresh: vi.fn(),
    };
    const createProjectSession = vi.fn(
      () => session
    ) as unknown as CreateProjectSession;

    const result = await executeProjectSessionApiOperation({
      command: "whoami",
      input: {},
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession,
      getServerApiContract: async () => ({
        clientVersion: "public-api:client",
        serverVersion: "public-api:server",
        supportedOperationIds: new Set(["auth.me"]),
        missingServerOperationIds: [],
        negotiated: true,
      }),
    });

    expect(session.executeServerOperation).toHaveBeenCalledWith(
      {
        id: "auth.me",
        invalidatesNamespaces: [],
        refetchInvalidatedNamespaces: false,
      },
      {}
    );
    expect(result.result).toEqual({ actor: "token" });
  });

  test("projects snapshots to compact summaries and bounded redacted pages", async () => {
    const snapshot = {
      projectId: "project-1",
      buildId: "build-1",
      version: 7,
      resources: [
        {
          id: "resource-1",
          url: "https://user:password@example.com/data",
          headers: [{ name: "Authorization", value: "Bearer secret" }],
        },
        { id: "resource-2", body: "private" },
      ],
    };
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(async () => ({
        operationId: "api.build.get",
        projectId: "project-1",
        source: "server",
        result: snapshot,
        state: { committed: true, freshness: {} },
        namespaces: { read: [], write: [], invalidated: [], missing: [] },
        diagnostics: [],
      })),
      refresh: vi.fn(),
    };
    const connection = {
      projectId: "project-1",
      origin: "https://example.com",
      authToken: "token",
    };
    const getServerApiContract = async () => ({
      clientVersion: "public-api:client",
      serverVersion: "public-api:server",
      supportedOperationIds: new Set(["build.get"]),
      missingServerOperationIds: [],
      negotiated: true,
    });
    const createProjectSession = vi.fn(
      () => session
    ) as unknown as CreateProjectSession;

    const compact = await executeProjectSessionApiOperation({
      command: "snapshot",
      input: { include: ["resources"] },
      connection,
      createProjectSession,
      getServerApiContract,
    });
    expect(compact.result).toEqual({
      projectId: "project-1",
      buildId: "build-1",
      version: 7,
      detail: "compact",
      namespaces: [{ name: "resources", count: 2 }],
    });
    expect(Buffer.byteLength(JSON.stringify(compact))).toBeLessThanOrEqual(
      2 * 1024
    );

    const verbose = await executeProjectSessionApiOperation({
      command: "snapshot",
      input: {
        include: ["resources"],
        verbose: true,
        limit: 1,
        cursor: "0",
      },
      connection,
      createProjectSession,
      getServerApiContract,
    });
    expect(verbose.result).toMatchObject({
      detail: "verbose",
      namespace: "resources",
      total: 2,
      returnedCount: 1,
      nextCursor: "1",
      items: [
        {
          id: "resource-1",
          url: "https://example.com/data",
          headers: "[REDACTED]",
        },
      ],
    });
  });

  test("rejects unsupported server-only commands before dispatch", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(),
      refresh: vi.fn(),
    };

    await expect(
      executeProjectSessionApiOperation({
        command: "whoami",
        input: {},
        connection: {
          projectId: "project-1",
          origin: "https://example.com",
          authToken: "token",
        },
        createProjectSession: vi.fn(
          () => session
        ) as unknown as CreateProjectSession,
        getServerApiContract: async () => ({
          clientVersion: "public-api:client",
          supportedOperationIds: new Set(),
          missingServerOperationIds: ["auth.me"],
          negotiated: false,
        }),
      })
    ).rejects.toThrow('does not advertise server operation "auth.me"');
    expect(session.executeServerOperation).not.toHaveBeenCalled();
  });

  test("refreshes local namespaces before local-capable commands when requested", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      read: vi.fn(async () => ({
        operationId: "pages.list",
        projectId: "project-1",
        source: "local",
        result: ["page"],
        state: { committed: false, freshness: {} },
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [],
      })),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(),
    };

    await executeProjectSessionApiOperation({
      command: "list-pages",
      input: {},
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession: vi.fn(
        () => session
      ) as unknown as CreateProjectSession,
      refresh: true,
    });

    expect(session.refresh).toHaveBeenCalledWith(["pages"]);
  });

  test("explains dry-run is only for local-capable mutations", async () => {
    const createProjectSession = vi.fn() as unknown as CreateProjectSession;

    await expect(
      executeProjectSessionApiOperation({
        command: "list-pages",
        input: {},
        connection: {
          projectId: "project-1",
          origin: "https://example.com",
          authToken: "token",
        },
        createProjectSession,
        dryRun: true,
      })
    ).rejects.toThrow(
      "list-pages does not support --dry-run. Use --dry-run only with local-capable mutation tools; omit it for read or server-only tools."
    );
    expect(createProjectSession).not.toHaveBeenCalled();
  });

  test("preserves project session diagnostic code on operation errors", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(async () => ({
        operationId: "pages.list",
        projectId: "project-1",
        source: "local",
        result: undefined,
        state: { committed: false, freshness: {} },
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [
          {
            level: "error",
            code: "INVALID_INPUT",
            message: "Page input is invalid.",
            issues: [
              {
                code: "invalid_expression",
                path: ["values", "title"],
                message: "Invalid Webstudio expression",
                constraint: "valid_webstudio_expression",
                example: 'pageTitle ?? "Pricing"',
                detail: "Unexpected token",
              },
            ],
          },
        ],
      })),
      mutate: vi.fn(),
      refresh: vi.fn(),
      executeServerOperation: vi.fn(),
    };

    await expect(
      executeProjectSessionApiOperation({
        command: "list-pages",
        input: {},
        connection: {
          projectId: "project-1",
          origin: "https://example.com",
          authToken: "token",
        },
        createProjectSession: vi.fn(
          () => session
        ) as unknown as CreateProjectSession,
      })
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Page input is invalid.",
      issues: [
        expect.objectContaining({
          path: ["values", "title"],
          constraint: "valid_webstudio_expression",
        }),
      ],
    });
  });
});
