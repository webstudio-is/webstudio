import { describe, expect, test, vi } from "vitest";
import { showContentDatabasePublishWarning } from "./content-database-publish-warning";

describe("showContentDatabasePublishWarning", () => {
  test("starts diagnostics without making publishing wait for them", () => {
    const loadDiagnostics = vi.fn(() => new Promise<never>(() => {}));

    const result = showContentDatabasePublishWarning({
      projectId: "project-id",
      setWarning: vi.fn(),
      loadDiagnostics,
    });

    expect(result).toBeUndefined();
    expect(loadDiagnostics).toHaveBeenCalledWith({ projectId: "project-id" });
  });

  test("does not surface a diagnostics failure as a publish failure", async () => {
    const loadDiagnostics = vi.fn().mockRejectedValue(new Error("timed out"));
    const setWarning = vi.fn();

    showContentDatabasePublishWarning({
      projectId: "project-id",
      setWarning,
      loadDiagnostics,
    });

    await vi.waitFor(() => expect(loadDiagnostics).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(setWarning).not.toHaveBeenCalled();
  });

  test("still shows completed diagnostics warnings", async () => {
    const setWarning = vi.fn();

    showContentDatabasePublishWarning({
      projectId: "project-id",
      setWarning,
      loadDiagnostics: async () => ({
        stats: undefined,
        affectedResources: [],
        mdxOmissions: [
          {
            assetId: "asset-id",
            blockInstanceId: "block-id",
            filename: "post.mdx",
            templateName: "Post",
          },
        ],
      }),
    });

    await vi.waitFor(() => expect(setWarning).toHaveBeenCalledTimes(1));
  });
});
