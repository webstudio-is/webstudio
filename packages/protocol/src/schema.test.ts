import { describe, expect, test } from "vitest";
import { builderNamespaces } from "@webstudio-is/project-build/contracts";
import { builderPatchTransactionSchema } from "@webstudio-is/project-build/contracts";
import {
  isAssetFileName,
  getMissingImportedAssetFilesMessage,
  parseMissingImportedAssetFilesMessage,
  getBundleVersionMismatchMessage,
  importProjectBundleInput,
  publishedProjectBundle,
  bundleVersion,
  stagedUploadPath,
  stagedUploadProjectIdHeader,
  buildPatchNamespaces,
  buildPatchTransaction,
} from "./schema";
import { createPublishedProjectBundleFixture } from "./fixtures";

describe("project bundle contract", () => {
  test("defines staged upload transport details", () => {
    expect(stagedUploadPath).toBe("/rest/staged-upload");
    expect(stagedUploadProjectIdHeader).toBe("x-webstudio-project-id");
  });

  test("validates asset file names", () => {
    expect(isAssetFileName("image.png")).toBe(true);
    expect(isAssetFileName("")).toBe(false);
    expect(isAssetFileName(".")).toBe(false);
    expect(isAssetFileName("..")).toBe(false);
    expect(isAssetFileName("../image.png")).toBe(false);
    expect(isAssetFileName("folder\\image.png")).toBe(false);
  });

  test("formats and parses missing imported asset file messages", () => {
    const message = getMissingImportedAssetFilesMessage([
      "image.png",
      "font,latin.woff2",
    ]);

    expect(message).toBe(
      'Imported asset files are missing: ["image.png","font,latin.woff2"]'
    );
    expect(parseMissingImportedAssetFilesMessage(new Error(message))).toEqual([
      "image.png",
      "font,latin.woff2",
    ]);
    expect(
      parseMissingImportedAssetFilesMessage("Other error")
    ).toBeUndefined();
  });

  test("parses already-deployed comma-separated missing asset messages", () => {
    expect(
      parseMissingImportedAssetFilesMessage(
        new Error("Imported asset files are missing: image.png, font.woff2")
      )
    ).toEqual(["image.png", "font.woff2"]);
  });

  test("preserves published project metadata", () => {
    expect(
      publishedProjectBundle.parse(
        createPublishedProjectBundleFixture({
          user: { email: "user@example.com" },
        })
      )
    ).toMatchObject({
      projectDomain: "example",
      projectTitle: "Example",
      user: { email: "user@example.com" },
    });
  });

  test("preserves build-versioned marketplace metadata", () => {
    const marketplaceProduct = {
      category: "pageTemplates" as const,
      name: "Marketplace template",
      thumbnailAssetId: "asset-1",
      author: "Webstudio",
      email: "hello@example.com",
      website: "https://example.com",
      issues: "",
      description: "A reusable marketplace template.",
    };

    expect(
      publishedProjectBundle.parse(
        createPublishedProjectBundleFixture({
          build: { marketplaceProduct },
        })
      ).build.marketplaceProduct
    ).toEqual(marketplaceProduct);
  });

  test("requires published project metadata", () => {
    const data = createPublishedProjectBundleFixture();
    delete (data as Partial<typeof data>).projectTitle;

    expect(() => publishedProjectBundle.parse(data)).toThrow();
  });

  test("requires published project bundle when importing", () => {
    const data = createPublishedProjectBundleFixture();
    delete (data as Partial<typeof data>).projectTitle;

    expect(() =>
      importProjectBundleInput.parse({
        projectId: "project",
        data,
      })
    ).toThrow();
  });

  test("accepts staged upload id when importing", () => {
    expect(
      importProjectBundleInput.parse({
        projectId: "project",
        uploadId: "upload",
      })
    ).toEqual({
      projectId: "project",
      uploadId: "upload",
    });
  });

  test("requires non-empty project and upload ids when importing", () => {
    expect(() =>
      importProjectBundleInput.parse({
        projectId: "",
        uploadId: "upload",
      })
    ).toThrow();

    expect(() =>
      importProjectBundleInput.parse({
        projectId: "project",
        uploadId: "",
      })
    ).toThrow();
  });

  test("requires exactly one project bundle import source", () => {
    expect(() =>
      importProjectBundleInput.parse({
        projectId: "project",
      })
    ).toThrow("Provide either project bundle data or an upload id");

    expect(() =>
      importProjectBundleInput.parse({
        projectId: "project",
        data: createPublishedProjectBundleFixture(),
        uploadId: "upload",
      })
    ).toThrow("Provide either project bundle data or an upload id");
  });

  test("generates the current bundle version", () => {
    expect(bundleVersion).toMatch(/^bundle-[a-z0-9]+$/);
  });

  test("formats project bundle version mismatch messages", () => {
    expect(
      getBundleVersionMismatchMessage({
        ignoreVersionCheckHint: "override the check",
        receivedVersion: undefined,
      })
    ).toBe(
      `Project bundle format is incompatible. Expected version ${bundleVersion}, received missing. Sync with a compatible API/CLI version and retry, or override the check.`
    );
  });

  test("validates build patch transactions", () => {
    expect(buildPatchNamespaces).toBe(builderNamespaces);
    expect(buildPatchTransaction).toBe(builderPatchTransactionSchema);

    expect(
      buildPatchTransaction.safeParse({
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [
              {
                op: "replace",
                path: ["meta", "siteName"],
                value: "Site",
              },
            ],
          },
        ],
      }).success
    ).toBe(true);

    expect(
      buildPatchTransaction.safeParse({
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [{ op: "replace", path: ["meta", "siteName"] }],
          },
        ],
      }).success
    ).toBe(false);
  });
});
