import { beforeEach, describe, expect, test, vi } from "vitest";

const hasProjectPermit = vi.hoisted(() => vi.fn());
const readAccessToken = vi.hoisted(() => vi.fn());
const getContentModeCapabilities = vi.hoisted(() =>
  vi.fn(
    (input: {
      instances: Map<string, unknown>;
      metas: Map<string, unknown>;
      props: Map<string, unknown>;
      styleSources: Map<string, unknown>;
      styleSourceSelections: Map<string, unknown>;
      styles: Map<string, unknown>;
      breakpoints: Map<string, unknown>;
    }) => ({
      editablePropIds: new Set(),
      editableInstanceIds: new Set(),
      instances: input.instances,
      metas: input.metas,
      props: input.props,
      htmlTagsByInstanceId: new Map(),
      styleSources: input.styleSources,
      styleSourceSelections: input.styleSourceSelections,
      styles: input.styles,
      breakpoints: input.breakpoints,
      contentRootIds: new Set(),
    })
  )
);
const applyContentModeTransaction = vi.hoisted(() =>
  vi.fn(
    ({
      capabilities,
      transaction,
    }: {
      capabilities: Record<string, unknown>;
      transaction: { id: string; payload: Array<{ namespace: string }> };
    }) => {
      if (transaction.payload.some((change) => change.namespace === "styles")) {
        return { success: false, error: "build-only" };
      }
      return {
        success: true,
        capabilities: { ...capabilities, appliedTransactionId: transaction.id },
      };
    }
  )
);

vi.mock("@webstudio-is/trpc-interface/index.server", () => {
  class AuthorizationError extends Error {}
  return {
    AuthorizationError,
    authorizeProject: { hasProjectPermit },
  };
});

vi.mock("@webstudio-is/project-build/runtime", () => ({
  applyContentModeTransaction,
  getContentModeCapabilities,
}));

vi.mock("~/env/env.server", () => ({
  default: {
    AUTH_WS_CLIENT_SECRET: "secret",
  },
}));

vi.mock("~/services/token.server", () => ({
  readAccessToken,
}));

import {
  authorizePatchEntries,
  createContentModeCapabilities,
  createWriterContext,
} from "./patch-auth.server";
import type { NormalizedPatchRequest } from "./patch-normalize.server";

const buildRow = {
  instances: JSON.stringify([
    { id: "body-1", type: "instance", component: "Body", children: [] },
  ]),
  props: JSON.stringify([]),
  styleSources: JSON.stringify([]),
  styleSourceSelections: JSON.stringify([]),
  styles: JSON.stringify([]),
  breakpoints: JSON.stringify([]),
};

const createContext = () => {
  const context = {
    authorization: { type: "anonymous" },
    createTokenContext: vi.fn(async (authToken: string) => ({
      authorization: { type: "token", authToken },
    })),
    postgrest: {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: buildRow,
                error: undefined,
              })),
            })),
          })),
        })),
      },
    },
  };
  return context;
};

const transaction = (namespace: string, id = `tx-${namespace}`) => ({
  id,
  payload: [{ namespace, patches: [{ op: "replace", path: ["x"], value: 1 }] }],
});

describe("createWriterContext", () => {
  beforeEach(() => {
    readAccessToken.mockReset();
  });

  test("rejects empty and legacy session tokens", async () => {
    const context = createContext();

    await expect(createWriterContext(context as never, "")).rejects.toThrow(
      "Collab writer token is not authorized"
    );
    await expect(
      createWriterContext(context as never, "session")
    ).rejects.toThrow("Collab writer token is not authorized");
  });

  test("creates a user context from a signed collab token", async () => {
    readAccessToken.mockResolvedValue({
      userId: "user-1",
      projectId: "project-1",
    });

    const writerContext = await createWriterContext(
      createContext() as never,
      "signed-token"
    );

    expect(writerContext.authorization).toMatchObject({
      type: "user",
      userId: "user-1",
    });
    const authorization = writerContext.authorization as {
      isLoggedInToBuilder: (projectId: string) => Promise<boolean>;
    };
    expect(await authorization.isLoggedInToBuilder("project-1")).toBe(true);
    expect(await authorization.isLoggedInToBuilder("project-2")).toBe(false);
  });

  test("falls back to the shared-link token context", async () => {
    readAccessToken.mockResolvedValue(undefined);
    const context = createContext();

    const writerContext = await createWriterContext(
      context as never,
      "shared-link-token"
    );

    expect(context.createTokenContext).toHaveBeenCalledWith(
      "shared-link-token"
    );
    expect(writerContext.authorization).toEqual({
      type: "token",
      authToken: "shared-link-token",
    });
  });
});

describe("authorizePatchEntries", () => {
  beforeEach(() => {
    hasProjectPermit.mockReset();
    readAccessToken.mockReset();
    getContentModeCapabilities.mockClear();
    applyContentModeTransaction.mockClear();
  });

  test("skips content-mode capabilities for writers with build permit", async () => {
    readAccessToken
      .mockResolvedValueOnce({ userId: "user-1", projectId: "project-1" })
      .mockResolvedValueOnce({ userId: "user-2", projectId: "project-1" });
    hasProjectPermit.mockResolvedValue(true);
    const context = createContext();
    const patch: NormalizedPatchRequest = {
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 1,
      entries: [
        {
          transaction: transaction("props") as never,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          transaction: transaction("styles") as never,
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    };

    const result = await authorizePatchEntries(context as never, patch, () =>
      createContentModeCapabilities(buildRow)
    );

    expect(result.rejected).toEqual([]);
    expect(result.authorized[0].context.authorization).toMatchObject({
      type: "user",
      userId: "user-1",
    });
    expect(result.authorized[1].context.authorization).toMatchObject({
      type: "user",
      userId: "user-2",
    });
    expect(getContentModeCapabilities).not.toHaveBeenCalled();
    expect(applyContentModeTransaction).not.toHaveBeenCalled();
    expect(hasProjectPermit).toHaveBeenCalledTimes(2);
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      1,
      { projectId: "project-1", permit: "build" },
      expect.objectContaining({
        authorization: expect.objectContaining({ userId: "user-1" }),
      })
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      2,
      { projectId: "project-1", permit: "build" },
      expect.objectContaining({
        authorization: expect.objectContaining({ userId: "user-2" }),
      })
    );
  });

  test("falls back to content-mode permissions without build permit", async () => {
    readAccessToken
      .mockResolvedValueOnce({ userId: "user-1", projectId: "project-1" })
      .mockResolvedValueOnce({ userId: "user-2", projectId: "project-1" });
    hasProjectPermit
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    const patch: NormalizedPatchRequest = {
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 1,
      entries: [
        {
          transaction: transaction("props", "tx-edit") as never,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          transaction: transaction("styles", "tx-build") as never,
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    };

    const result = await authorizePatchEntries(
      createContext() as never,
      patch,
      () => createContentModeCapabilities(buildRow)
    );

    expect(result.rejected).toEqual([]);
    expect(result.authorized).toHaveLength(2);
    expect(getContentModeCapabilities).toHaveBeenCalledTimes(1);
    expect(applyContentModeTransaction).toHaveBeenCalledTimes(2);
    expect(applyContentModeTransaction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        transaction: patch.entries[0].transaction,
        capabilities: expect.objectContaining({
          editablePropIds: expect.any(Set),
          instances: expect.any(Map),
          metas: expect.any(Map),
          props: expect.any(Map),
          styleSources: expect.any(Map),
          styleSourceSelections: expect.any(Map),
          styles: expect.any(Map),
          breakpoints: expect.any(Map),
          contentRootIds: expect.any(Set),
        }),
      })
    );
    expect(applyContentModeTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        transaction: patch.entries[1].transaction,
        capabilities: expect.objectContaining({
          appliedTransactionId: patch.entries[0].transaction.id,
        }),
      })
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      1,
      { projectId: "project-1", permit: "build" },
      expect.anything()
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      2,
      { projectId: "project-1", permit: "build" },
      expect.anything()
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      3,
      { projectId: "project-1", permit: "edit" },
      expect.anything()
    );
  });

  test("advances capabilities for build-permit entries in mixed batches", async () => {
    readAccessToken
      .mockResolvedValueOnce({ userId: "user-1", projectId: "project-1" })
      .mockResolvedValueOnce({ userId: "user-2", projectId: "project-1" });
    hasProjectPermit
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const patch: NormalizedPatchRequest = {
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 1,
      entries: [
        {
          transaction: transaction("props", "tx-build") as never,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          transaction: transaction("props", "tx-edit") as never,
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    };

    const result = await authorizePatchEntries(
      createContext() as never,
      patch,
      () => createContentModeCapabilities(buildRow)
    );

    expect(result.rejected).toEqual([]);
    expect(result.authorized).toHaveLength(2);
    expect(getContentModeCapabilities).toHaveBeenCalledTimes(1);
    expect(applyContentModeTransaction).toHaveBeenCalledTimes(2);
    expect(applyContentModeTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        transaction: patch.entries[1].transaction,
        capabilities: expect.objectContaining({
          appliedTransactionId: patch.entries[0].transaction.id,
        }),
      })
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      1,
      { projectId: "project-1", permit: "build" },
      expect.anything()
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      2,
      { projectId: "project-1", permit: "build" },
      expect.anything()
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      3,
      { projectId: "project-1", permit: "edit" },
      expect.anything()
    );
  });

  test("creates content-mode capabilities once for multiple content-mode entries", async () => {
    readAccessToken
      .mockResolvedValueOnce({ userId: "user-1", projectId: "project-1" })
      .mockResolvedValueOnce({ userId: "user-2", projectId: "project-1" });
    hasProjectPermit
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const getInitialContentModeCapabilities = vi.fn(() =>
      createContentModeCapabilities(buildRow)
    );

    const patch: NormalizedPatchRequest = {
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 1,
      entries: [
        {
          transaction: transaction("props", "tx-edit-1") as never,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          transaction: transaction("props", "tx-edit-2") as never,
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    };

    const result = await authorizePatchEntries(
      createContext() as never,
      patch,
      getInitialContentModeCapabilities
    );

    expect(result.rejected).toEqual([]);
    expect(result.authorized).toHaveLength(2);
    expect(getInitialContentModeCapabilities).toHaveBeenCalledTimes(1);
    expect(getContentModeCapabilities).toHaveBeenCalledTimes(1);
    expect(applyContentModeTransaction).toHaveBeenCalledTimes(2);
    expect(applyContentModeTransaction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        transaction: patch.entries[0].transaction,
        capabilities: expect.objectContaining({
          editablePropIds: expect.any(Set),
          instances: expect.any(Map),
          metas: expect.any(Map),
          props: expect.any(Map),
          styleSources: expect.any(Map),
          styleSourceSelections: expect.any(Map),
          styles: expect.any(Map),
          breakpoints: expect.any(Map),
          contentRootIds: expect.any(Set),
        }),
      })
    );
    expect(applyContentModeTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        transaction: patch.entries[1].transaction,
        capabilities: expect.objectContaining({
          appliedTransactionId: patch.entries[0].transaction.id,
        }),
      })
    );
  });

  test("continues authorizing later build-permit entries after a rejected entry", async () => {
    readAccessToken
      .mockResolvedValueOnce({ userId: "user-1", projectId: "project-1" })
      .mockResolvedValueOnce({ userId: "user-2", projectId: "project-1" });
    hasProjectPermit.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const patch: NormalizedPatchRequest = {
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 1,
      entries: [
        {
          transaction: transaction("styles", "tx-build") as never,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          transaction: transaction("props", "tx-edit") as never,
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    };

    const result = await authorizePatchEntries(
      createContext() as never,
      patch,
      () => createContentModeCapabilities(buildRow)
    );

    expect(result.rejected).toEqual([
      expect.objectContaining({
        entry: patch.entries[0],
        errors: "You don't have permission to build this project.",
      }),
    ]);
    expect(result.authorized).toEqual([
      expect.objectContaining({
        entry: patch.entries[1],
      }),
    ]);
    expect(applyContentModeTransaction).toHaveBeenCalledTimes(2);
    expect(applyContentModeTransaction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        transaction: patch.entries[0].transaction,
      })
    );
    expect(applyContentModeTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        transaction: patch.entries[1].transaction,
      })
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      1,
      { projectId: "project-1", permit: "build" },
      expect.anything()
    );
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      2,
      { projectId: "project-1", permit: "build" },
      expect.anything()
    );
  });

  test("returns rejected entries when a writer does not have the required permit", async () => {
    readAccessToken.mockResolvedValue({
      userId: "user-1",
      projectId: "project-1",
    });
    hasProjectPermit.mockResolvedValue(false);

    const result = await authorizePatchEntries(
      createContext() as never,
      {
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 1,
        entries: [
          {
            transaction: transaction("styles") as never,
            writer: { type: "token", authToken: "token-1" },
          },
        ],
      },
      () => createContentModeCapabilities(buildRow)
    );

    expect(result.authorized).toEqual([]);
    expect(result.rejected).toEqual([
      expect.objectContaining({
        errors: "You don't have permission to build this project.",
      }),
    ]);
  });
});
