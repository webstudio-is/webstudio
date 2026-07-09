import { afterEach, describe, expect, test, vi } from "vitest";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import { buildRouter, __testing__ } from "./build-router.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";

const { createImportProjectBundleHandler } = __testing__;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("build router jsx fragment conversion", () => {
  test("converts Webstudio JSX through the shared runtime converter", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const caller = buildRouter.createCaller({} as never);

    await expect(
      caller.createJsxFragment({
        projectId: "project-id",
        source: `<$.Box><$.Heading>Title</$.Heading></$.Box>`,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        instances: [
          expect.objectContaining({ component: "Box" }),
          expect.objectContaining({ component: "Heading" }),
        ],
      })
    );
  });

  test("rejects invalid Webstudio JSX with runtime validation messages", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const caller = buildRouter.createCaller({} as never);

    await expect(
      caller.createJsxFragment({
        projectId: "project-id",
        source: `<$.Box {...{"ws:id": "0"}} />`,
      })
    ).rejects.toThrow("Do not set ws:id in JSX fragments");
  });

  test("requires project access before converting JSX", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(false);
    const caller = buildRouter.createCaller({} as never);

    await expect(
      caller.createJsxFragment({
        projectId: "project-id",
        source: `<$.Box />`,
      })
    ).rejects.toThrow("You don't have access to this project");
  });
});

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
