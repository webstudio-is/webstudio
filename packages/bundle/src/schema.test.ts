import { describe, expect, test } from "vitest";
import {
  isAssetFileName,
  isAssetFileDataString,
  getBundleVersionMismatchMessage,
  importProjectBundleInputSchema,
  publishedProjectBundleSchema,
  bundleVersion,
} from "./schema";
import { createPublishedProjectBundleFixture } from "./fixtures";

describe("project bundle contract", () => {
  test("validates base64 asset file data", () => {
    expect(isAssetFileDataString("aGVsbG8=")).toBe(true);
    expect(isAssetFileDataString("")).toBe(true);
    expect(isAssetFileDataString("not base64")).toBe(false);
    expect(isAssetFileDataString("a===")).toBe(false);
  });

  test("validates asset file names", () => {
    expect(isAssetFileName("image.png")).toBe(true);
    expect(isAssetFileName("")).toBe(false);
    expect(isAssetFileName(".")).toBe(false);
    expect(isAssetFileName("..")).toBe(false);
    expect(isAssetFileName("../image.png")).toBe(false);
    expect(isAssetFileName("folder\\image.png")).toBe(false);
  });

  test("preserves published project metadata", () => {
    expect(
      publishedProjectBundleSchema.parse(
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

  test("requires published project metadata", () => {
    const data = createPublishedProjectBundleFixture();
    delete (data as Partial<typeof data>).projectTitle;

    expect(() => publishedProjectBundleSchema.parse(data)).toThrow();
  });

  test("requires published project bundle when importing", () => {
    const data = createPublishedProjectBundleFixture();
    delete (data as Partial<typeof data>).projectTitle;

    expect(() =>
      importProjectBundleInputSchema.parse({
        projectId: "project",
        data,
      })
    ).toThrow();
  });

  test("generates the current bundle version", () => {
    expect(bundleVersion).toMatch(/^bundle-0\.0\.0-[0-9a-f]{8}$/);
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
});
