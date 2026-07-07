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
  createContractVersion(z.string().superRefine(refinement));

describe("contract version", () => {
  test("changes when schema shape changes", () => {
    expect(createContractVersion(z.object({ value: z.string() }))).not.toBe(
      createContractVersion(z.object({ value: z.number() }))
    );
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
        })
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
        })
      )
    );
  });

  test("changes when extra schemas change", () => {
    const schema = z.object({ value: z.string() });

    expect(
      createContractVersion(schema, [z.object({ auth: z.literal(1) })])
    ).not.toBe(
      createContractVersion(schema, [z.object({ auth: z.literal(2) })])
    );
  });

  test("uses only the bundle contract hash", () => {
    expect(createContractVersion(z.string())).toMatch(/^bundle-[0-9a-f]{8}$/);
  });
});
