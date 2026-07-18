import { describe, expect, test, vi } from "vitest";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadAssetResourceIndexStatus } from "./resource-index-status";

vi.mock("@webstudio-is/trpc-interface/index.server", () => ({
  authorizeProject: { hasProjectPermit: vi.fn() },
  AuthorizationError: class AuthorizationError extends Error {},
}));

describe("loadAssetResourceIndexStatus authorization", () => {
  test("checks view permission before querying state", async () => {
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(false);
    const from = vi.fn();
    const context = {
      postgrest: { client: { from } },
    } as unknown as AppContext;

    await expect(
      loadAssetResourceIndexStatus({
        projectId: "project-1",
        resourceId: "posts",
        context,
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(authorizeProject.hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "view" },
      context
    );
    expect(from).not.toHaveBeenCalled();
  });
});
