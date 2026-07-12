import { afterEach, describe, expect, test, vi } from "vitest";
import { bundleVersion } from "@webstudio-is/protocol";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import { buildRouter, __testing__ } from "./build-router.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { getApiCompatibilityPayload } from "@webstudio-is/trpc-interface/api-compatibility";

const {
  assertCliBundleVersion,
  createImportProjectBundleHandler,
  prepareProjectBundleForClient,
} = __testing__;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("build router project bundle compatibility", () => {
  test("requires the current bundle contract from CLI clients", () => {
    const ctx = { apiClient: { type: "cli" } } as never;
    let error: unknown;
    try {
      assertCliBundleVersion(ctx, undefined);
    } catch (caught) {
      error = caught;
    }
    expect(getApiCompatibilityPayload(error)).toMatchObject({
      reason: "clientVersionUnsupported",
      target: "cli",
      action: { type: "updateCli" },
    });
    expect(() => assertCliBundleVersion(ctx, bundleVersion)).not.toThrow();
  });

  test("removes agent instructions from non-CLI bundles", async () => {
    const bundle = createPublishedProjectBundleFixture({
      build: {
        projectSettings: {
          meta: { siteName: "Acme", agentInstructions: "Internal guidance" },
          compiler: {},
        },
      },
    });

    const result = await prepareProjectBundleForClient(
      { apiClient: { type: "browser" } } as never,
      bundle
    );

    expect(result.build.projectSettings?.meta).toEqual({ siteName: "Acme" });
    expect(bundle.build.projectSettings?.meta.agentInstructions).toBe(
      "Internal guidance"
    );
  });

  test("keeps agent instructions for authorized CLI bundles", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const bundle = createPublishedProjectBundleFixture({
      build: {
        projectSettings: {
          meta: { agentInstructions: "Internal guidance" },
          compiler: {},
        },
      },
    });

    const result = await prepareProjectBundleForClient(
      { apiClient: { type: "cli" } } as never,
      bundle
    );

    expect(result.build.projectSettings?.meta.agentInstructions).toBe(
      "Internal guidance"
    );
  });
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
