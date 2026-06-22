import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  isAssetFileName,
  isAssetFileDataString,
  getProjectBundleVersionMismatchMessage,
  importProjectBundleInputSchema,
  publishedProjectBundleSchema,
  projectBundleVersion,
} from "./schema";
import { createContractVersion } from "./contract-version";
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

  test("changes version when schema shape changes", () => {
    const first = createContractVersion(z.object({ value: z.string() }), "1");
    const second = createContractVersion(z.object({ value: z.number() }), "1");

    expect(first).not.toBe(second);
  });

  test("changes version when refinement implementation changes", () => {
    const first = createContractVersion(
      z.string().superRefine((value, context) => {
        if (value.length < 2) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be at least 2 characters",
          });
        }
      }),
      "1"
    );
    const second = createContractVersion(
      z.string().superRefine((value, context) => {
        if (value.length < 3) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be at least 3 characters",
          });
        }
      }),
      "1"
    );

    expect(first).not.toBe(second);
  });

  test("changes version when package version changes", () => {
    const schema = z.object({ value: z.string() });

    expect(createContractVersion(schema, "1.0.0")).not.toBe(
      createContractVersion(schema, "1.0.1")
    );
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

  test("generates the current project bundle version", () => {
    expect(projectBundleVersion).toMatch(
      /^project-bundle-0\.0\.0-webstudio-version-[0-9a-f]{8}$/
    );
  });

  test("formats project bundle version mismatch messages", () => {
    expect(
      getProjectBundleVersionMismatchMessage({
        ignoreVersionCheckHint: "override the check",
        receivedVersion: undefined,
      })
    ).toBe(
      `Project bundle format is incompatible. Expected version ${projectBundleVersion}, received missing. Sync with a compatible API/CLI version and retry, or override the check.`
    );
  });
});
