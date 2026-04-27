import { beforeEach, describe, expect, test, vi } from "vitest";

const hasProjectPermit = vi.hoisted(() => vi.fn());
const readAccessToken = vi.hoisted(() => vi.fn());

vi.mock("@webstudio-is/trpc-interface/index.server", () => {
  class AuthorizationError extends Error {}
  return {
    AuthorizationError,
    authorizeProject: { hasProjectPermit },
  };
});

vi.mock("@webstudio-is/project/index.server", () => ({
  getRequiredPermitForBuildPatchTransaction: (transaction: {
    payload: Array<{ namespace: string }>;
  }) =>
    transaction.payload.some((change) => change.namespace === "styles")
      ? "build"
      : "edit",
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
  createWriterContext,
} from "./patch-auth.server";
import type { NormalizedPatchRequest } from "./patch-normalize.server";

const createContext = () => {
  const context = {
    authorization: { type: "anonymous" },
    createTokenContext: vi.fn(async (authToken: string) => ({
      authorization: { type: "token", authToken },
    })),
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
  });

  test("checks every transaction with its own writer and required permit", async () => {
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

    const result = await authorizePatchEntries(context as never, patch);

    expect(result.rejected).toEqual([]);
    expect(result.authorized[0].context.authorization).toMatchObject({
      type: "user",
      userId: "user-1",
    });
    expect(hasProjectPermit).toHaveBeenCalledTimes(2);
    expect(hasProjectPermit).toHaveBeenNthCalledWith(
      1,
      { projectId: "project-1", permit: "edit" },
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

  test("returns rejected entries when a writer does not have the required permit", async () => {
    readAccessToken.mockResolvedValue({
      userId: "user-1",
      projectId: "project-1",
    });
    hasProjectPermit.mockResolvedValue(false);

    const result = await authorizePatchEntries(createContext() as never, {
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 1,
      entries: [
        {
          transaction: transaction("styles") as never,
          writer: { type: "token", authToken: "token-1" },
        },
      ],
    });

    expect(result.authorized).toEqual([]);
    expect(result.rejected).toEqual([
      expect.objectContaining({
        errors: "You don't have permission to build this project.",
      }),
    ]);
  });
});
