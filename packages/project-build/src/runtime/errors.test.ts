import { getInputSchemaMetadata } from "../contracts/input-schema";
import { expect, test } from "vitest";
import { z } from "zod";
import {
  addZodValidationIssue,
  BuilderRuntimeError,
  formatValidationIssues,
  getZodValidationIssues,
  getValidationIssues,
  sanitizeValidationDetail,
  throwBuilderRuntimeError,
  throwBuilderValidationError,
} from "./errors";

test("creates runtime errors with stable code and name", () => {
  const error = new BuilderRuntimeError("BAD_REQUEST", "Invalid input");

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("BuilderRuntimeError");
  expect(error.code).toBe("BAD_REQUEST");
  expect(error.message).toBe("Invalid input");
});

test("throws runtime errors", () => {
  expect(() => throwBuilderRuntimeError("NOT_FOUND", "Missing")).toThrow(
    BuilderRuntimeError
  );
  expect(() => throwBuilderRuntimeError("CONFLICT", "Changed")).toThrow(
    "Changed"
  );
});

test("creates actionable issues from zod constraints", () => {
  const schema = z.object({
    email: z.email(),
    items: z.array(z.object({ count: z.number().int().min(1) })).min(1),
  });
  const result = schema.safeParse({
    email: "invalid",
    items: [{ count: 0 }],
  });
  if (result.success) {
    throw new Error("Expected test input to be invalid");
  }

  const issues = getZodValidationIssues(
    result.error,
    getInputSchemaMetadata(schema).inputJsonSchema
  );

  expect(issues).toEqual([
    expect.objectContaining({
      code: "invalid_format",
      path: ["email"],
      constraint: "format:email",
      example: "user@example.com",
    }),
    expect.objectContaining({
      code: "too_small",
      path: ["items", "0", "count"],
      constraint: "number:minimum:1",
      example: 1,
    }),
  ]);
  expect(formatValidationIssues(issues)).toContain("items.0.count: Too small");
});

test("preserves semantic codes and identifies each unknown key", () => {
  const schema = z
    .object({
      expression: z.string().superRefine((_value, context) => {
        addZodValidationIssue(context, {
          code: "invalid_expression",
          path: [],
          message: "Invalid Webstudio expression",
          constraint: "valid_webstudio_expression",
          example: "item.title",
        });
      }),
    })
    .strict();
  const result = schema.safeParse({ expression: "bad", unexpected: true });
  if (result.success) {
    throw new Error("Expected test input to be invalid");
  }

  expect(getZodValidationIssues(result.error)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "invalid_expression",
        path: ["expression"],
      }),
      expect.objectContaining({
        code: "unrecognized_keys",
        path: ["unexpected"],
        constraint: "recognized_keys_only",
      }),
    ])
  );
});

test("separates legacy display text from the structured issue message", () => {
  const schema = z.string().superRefine((_value, context) => {
    addZodValidationIssue(
      context,
      {
        code: "invalid_resource_url",
        path: [],
        message: "URL is invalid",
        constraint: "absolute_or_root_relative_url",
      },
      { message: "url: URL is invalid" }
    );
  });
  const result = schema.safeParse("invalid");
  if (result.success) {
    throw new Error("Expected test input to be invalid");
  }

  expect(result.error.issues[0]?.message).toBe("url: URL is invalid");
  expect(getZodValidationIssues(result.error)).toEqual([
    expect.objectContaining({
      code: "invalid_resource_url",
      message: "URL is invalid",
    }),
  ]);
});

test("reports the closest union branch with its complete field path", () => {
  const schema = z.object({
    binding: z.union([
      z.object({ type: z.literal("expression"), value: z.string() }),
      z.object({ type: z.literal("resource"), resourceId: z.string() }),
    ]),
  });
  const result = schema.safeParse({
    binding: { type: "resource", resourceId: 42 },
  });
  if (result.success) {
    throw new Error("Expected test input to be invalid");
  }

  expect(
    getZodValidationIssues(
      result.error,
      getInputSchemaMetadata(schema).inputJsonSchema
    )
  ).toEqual([
    expect.objectContaining({
      code: "invalid_type",
      path: ["binding", "resourceId"],
      constraint: "type:string",
      example: "string",
    }),
  ]);
});

test("preserves semantic issue metadata on runtime errors", () => {
  expect(() =>
    throwBuilderValidationError("Invalid title", [
      {
        code: "invalid_expression",
        path: ["values", "title"],
        message: "Invalid Webstudio expression",
        constraint: "valid_webstudio_expression",
        example: 'pageTitle ?? "Pricing"',
        detail: "Unexpected token",
      },
    ])
  ).toThrow(
    expect.objectContaining({
      code: "INVALID_INPUT",
      issues: [
        expect.objectContaining({
          path: ["values", "title"],
          detail: "Unexpected token",
        }),
      ],
    })
  );
});

test("removes stack frames and credentials from parser details", () => {
  expect(
    sanitizeValidationDetail(
      'Unexpected token at 1:4\n    at parse (/private/parser.ts:10:2)\nauthToken=private-value password="two private words" Authorization: "Bearer private header"'
    )
  ).toBe(
    'Unexpected token at 1:4\nauthToken=[redacted] password="[redacted]" Authorization: "[redacted]"'
  );
});

test("reads validation issues from serialized API error data", () => {
  expect(
    getValidationIssues({
      data: {
        issues: [
          {
            code: "invalid_type",
            path: ["name"],
            message: "Expected string",
            constraint: "type:string",
          },
        ],
      },
    })
  ).toEqual([
    expect.objectContaining({
      code: "invalid_type",
      path: ["name"],
    }),
  ]);
});
