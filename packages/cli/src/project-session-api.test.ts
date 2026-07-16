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
