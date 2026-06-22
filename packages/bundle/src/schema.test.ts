import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  isAssetFileName,
  isAssetFileDataString,
  getBundleVersionMismatchMessage,
  importProjectBundleInputSchema,
  publishedProjectBundleSchema,
  bundleVersion,
} from "./schema";
import { createContractVersion } from "./contract-version";
import { createPublishedProjectBundleFixture } from "./fixtures";

type StringRefinement = z.RefinementEffect<string>["refinement"];

const createLengthRefinement = ({
  contractLength,
  validateLength = contractLength,
}: {
  contractLength: number;
  validateLength?: number;
}) =>
  Object.assign(
    (value: string, context: z.RefinementCtx) => {
      if (value.length < validateLength) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Must be at least ${validateLength} characters`,
        });
      }
    },
    { contract: { minLength: contractLength } }
  );

const versionForRefinement = (refinement: StringRefinement) =>
  createContractVersion(z.string().superRefine(refinement), "1");

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

  test("changes version when explicit refinement contract changes", () => {
    expect(
      versionForRefinement(createLengthRefinement({ contractLength: 2 }))
    ).not.toBe(
      versionForRefinement(createLengthRefinement({ contractLength: 3 }))
    );
  });

  test("ignores refinement function source", () => {
    expect(
      versionForRefinement(
        createLengthRefinement({ contractLength: 2, validateLength: 2 })
      )
    ).toBe(
      versionForRefinement(
        createLengthRefinement({ contractLength: 2, validateLength: 3 })
      )
    );

    expect(
      createContractVersion(
        z.string().superRefine((value, context) => {
          if (value.length < 2) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Must be at least 2 characters",
            });
          }
        }),
        "1"
      )
    ).toBe(
      createContractVersion(
        z.string().superRefine((value, context) => {
          if (value.length < 3) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Must be at least 3 characters",
            });
          }
        }),
        "1"
      )
    );
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
