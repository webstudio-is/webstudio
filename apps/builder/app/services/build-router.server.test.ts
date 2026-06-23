import { describe, expect, test, vi } from "vitest";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import { __testing__ } from "./build-router.server";

const { createImportProjectBundleHandler } = __testing__;

describe("build router project bundle import", () => {
  test("imports staged project bundle data and removes the upload", async () => {
    const data = createPublishedProjectBundleFixture();
    const importPublishedProjectBundle = vi.fn().mockResolvedValue({
      version: 2,
    });
    const readStagedUploadText = vi
      .fn()
      .mockResolvedValue(JSON.stringify(data));
    const removeStagedUpload = vi.fn().mockResolvedValue(undefined);
    const handler = createImportProjectBundleHandler({
      importPublishedProjectBundle,
      readStagedUploadText,
      removeStagedUpload,
    });
    const ctx = { context: true } as never;

    await expect(
      handler({
        ctx,
        input: {
          ignoreVersionCheck: true,
          projectId: "project-id",
          uploadId: "upload-id",
        },
      })
    ).resolves.toEqual({ version: 2 });

    expect(readStagedUploadText).toHaveBeenCalledWith({
      projectId: "project-id",
      uploadId: "upload-id",
    });
    expect(importPublishedProjectBundle).toHaveBeenCalledWith({
      ctx,
      data,
      ignoreVersionCheck: true,
      projectId: "project-id",
    });
    expect(removeStagedUpload).toHaveBeenCalledWith("upload-id");
  });

  test("removes staged upload when staged data is invalid", async () => {
    const importPublishedProjectBundle = vi.fn();
    const readStagedUploadText = vi.fn().mockResolvedValue("{");
    const removeStagedUpload = vi.fn().mockResolvedValue(undefined);
    const handler = createImportProjectBundleHandler({
      importPublishedProjectBundle,
      readStagedUploadText,
      removeStagedUpload,
    });

    await expect(
      handler({
        ctx: {} as never,
        input: {
          projectId: "project-id",
          uploadId: "upload-id",
        },
      })
    ).rejects.toThrow();

    expect(importPublishedProjectBundle).not.toHaveBeenCalled();
    expect(removeStagedUpload).toHaveBeenCalledWith("upload-id");
  });

  test("keeps direct project bundle import unchanged", async () => {
    const data = createPublishedProjectBundleFixture();
    const importPublishedProjectBundle = vi.fn().mockResolvedValue({
      version: 3,
    });
    const readStagedUploadText = vi.fn();
    const removeStagedUpload = vi.fn();
    const handler = createImportProjectBundleHandler({
      importPublishedProjectBundle,
      readStagedUploadText,
      removeStagedUpload,
    });
    const ctx = { context: true } as never;

    await expect(
      handler({
        ctx,
        input: {
          data,
          projectId: "project-id",
        },
      })
    ).resolves.toEqual({ version: 3 });

    expect(importPublishedProjectBundle).toHaveBeenCalledWith({
      ctx,
      data,
      ignoreVersionCheck: undefined,
      projectId: "project-id",
    });
    expect(readStagedUploadText).not.toHaveBeenCalled();
    expect(removeStagedUpload).not.toHaveBeenCalled();
  });
});
