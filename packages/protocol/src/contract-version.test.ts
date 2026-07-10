import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createContractVersion } from "./contract-version";

type StringRefinement = (value: string) => boolean;

const createLengthRefinement = ({
  contractLength,
  validateLength = contractLength,
}: {
  contractLength: number;
  validateLength?: number;
}) =>
  Object.assign((value: string) => value.length >= validateLength, {
    contract: { minLength: contractLength },
  });

const versionForRefinement = (refinement: StringRefinement) =>
  createContractVersion(z.string().refine(refinement));

describe("contract version", () => {
  test("changes when schema shape changes", () => {
    expect(createContractVersion(z.object({ value: z.string() }))).not.toBe(
      createContractVersion(z.object({ value: z.number() }))
    );
  });

  test("is stable when object fields are declared in different order", () => {
    expect(
      createContractVersion(
        z.object({
          first: z.string(),
          second: z.number(),
        })
      )
    ).toBe(
      createContractVersion(
        z.object({
          second: z.number(),
          first: z.string(),
        })
      )
    );
  });

  test("changes when object unknown key handling or catchall changes", () => {
    const schema = z.object({ value: z.string() });

    expect(createContractVersion(schema)).not.toBe(
      createContractVersion(schema.strict())
    );
    expect(createContractVersion(schema.catchall(z.string()))).not.toBe(
      createContractVersion(schema.catchall(z.number()))
    );
  });

  test("changes when primitive checks change", () => {
    expect(createContractVersion(z.string().min(2))).not.toBe(
      createContractVersion(z.string().min(3))
    );
    expect(createContractVersion(z.number().min(2))).not.toBe(
      createContractVersion(z.number().min(3))
    );
    expect(createContractVersion(z.array(z.string()).min(2))).not.toBe(
      createContractVersion(z.array(z.string()).min(3))
    );
  });

  test("changes when wrappers change", () => {
    const schema = z.string();

    expect(createContractVersion(schema.optional())).not.toBe(
      createContractVersion(schema.nullable())
    );
    expect(createContractVersion(schema.default("first"))).toBe(
      createContractVersion(schema.default("second"))
    );
    expect(createContractVersion(schema.default("first"))).not.toBe(
      createContractVersion(schema)
    );
  });

  test("changes when enum, literal, record, tuple, or union contracts change", () => {
    expect(createContractVersion(z.enum(["a", "b"]))).not.toBe(
      createContractVersion(z.enum(["a", "c"]))
    );
    expect(createContractVersion(z.enum({ A: "a", B: "b" }))).not.toBe(
      createContractVersion(z.enum({ A: "a", C: "c" }))
    );
    expect(createContractVersion(z.literal("a"))).not.toBe(
      createContractVersion(z.literal("b"))
    );
    expect(createContractVersion(z.record(z.string(), z.string()))).not.toBe(
      createContractVersion(z.record(z.string(), z.number()))
    );
    expect(createContractVersion(z.tuple([z.string(), z.number()]))).not.toBe(
      createContractVersion(z.tuple([z.string(), z.boolean()]))
    );
    expect(createContractVersion(z.union([z.string(), z.number()]))).not.toBe(
      createContractVersion(z.union([z.string(), z.boolean()]))
    );
  });

  test("supports discriminated unions, maps, and lazy schemas", () => {
    type Category = {
      name: string;
      children: Category[];
    };
    const category: z.ZodType<Category> = z.lazy(() =>
      z.object({
        name: z.string(),
        children: z.array(category),
      })
    );

    expect(
      createContractVersion(
        z.discriminatedUnion("type", [
          z.object({ type: z.literal("text"), value: z.string() }),
          z.object({ type: z.literal("count"), value: z.number() }),
        ])
      )
    ).toMatch(/^bundle-[a-z0-9]+$/);
    expect(createContractVersion(z.map(z.string(), z.number()))).toMatch(
      /^bundle-[a-z0-9]+$/
    );
    expect(createContractVersion(category)).toMatch(/^bundle-[a-z0-9]+$/);
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
    expect(createContractVersion(z.string())).toMatch(/^bundle-[a-z0-9]+$/);
  });
});
