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
      input: { includeFolders: true },
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession,
    });

    expect(session.read).toHaveBeenCalledWith(
      "pages.list",
      { projectId: "project-1", includeFolders: true },
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
            code: "PROJECT_SESSION_BUSY",
            message: "Project session snapshot changed on disk.",
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
      code: "PROJECT_SESSION_BUSY",
      message: "Project session snapshot changed on disk.",
    });
  });
});
