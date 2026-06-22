import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createContractVersion } from "./contract-version";

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

describe("contract version", () => {
  test("changes when schema shape changes", () => {
    expect(
      createContractVersion(z.object({ value: z.string() }), "1")
    ).not.toBe(createContractVersion(z.object({ value: z.number() }), "1"));
  });

  test("changes when explicit refinement contract changes", () => {
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

  test("changes when package version changes", () => {
    const schema = z.object({ value: z.string() });

    expect(createContractVersion(schema, "1.0.0")).not.toBe(
      createContractVersion(schema, "1.0.1")
    );
  });

  test("changes when extra schemas change", () => {
    const schema = z.object({ value: z.string() });

    expect(
      createContractVersion(schema, "1", [z.object({ auth: z.literal(1) })])
    ).not.toBe(
      createContractVersion(schema, "1", [z.object({ auth: z.literal(2) })])
    );
  });

  test("uses short bundle package version", () => {
    expect(
      createContractVersion(z.string(), "0.0.0-webstudio-version")
    ).toMatch(/^bundle-0\.0\.0-[0-9a-f]{8}$/);
  });
});
