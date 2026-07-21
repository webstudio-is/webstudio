import { describe, expect, test, vi } from "vitest";
import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadAssetResourceIndexStatus } from "./resource-index-status";

describe("loadAssetResourceIndexStatus authorization", () => {
  test("checks view permission before querying state", async () => {
    const hasProjectPermit = vi.fn().mockResolvedValue(false);
    const from = vi.fn();
    const context = {
      postgrest: { client: { from } },
    } as unknown as AppContext;

    await expect(
      loadAssetResourceIndexStatus(
        {
          projectId: "project-1",
          resourceId: "posts",
          context,
        },
        { hasProjectPermit }
      )
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "view" },
      context
    );
    expect(from).not.toHaveBeenCalled();
  });
});
