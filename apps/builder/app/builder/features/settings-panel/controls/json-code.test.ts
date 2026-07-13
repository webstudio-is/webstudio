import { expect, test } from "vitest";
import {
  formatJsonCode,
  getFixedJsonCodeValue,
  parseJsonCode,
  processJsonCodeValue,
  serializeJsonCode,
  validateJsonCode,
  validateJsonCodeValue,
} from "./json-code";

test("formats stored JSON with two-space indentation", () => {
  expect(formatJsonCode({ name: "Acme", types: ["Organization"] })).toBe(
    '{\n  "name": "Acme",\n  "types": [\n    "Organization"\n  ]\n}'
  );
});

test("formats legacy string JSON as structured JSON", () => {
  expect(formatJsonCode('{"a":1}')).toBe('{\n  "a": 1\n}');
});

test("keeps invalid persisted JSON source editable without quoting it", () => {
  expect(formatJsonCode("not json")).toBe("not json");
});

test("parses editor text into structured JSON", () => {
  expect(parseJsonCode('{ "name": "Acme" }')).toEqual({
    success: true,
    value: { name: "Acme" },
  });
});

test("serializes JSON for storage without formatting", () => {
  expect(serializeJsonCode({ name: "Acme", enabled: true })).toBe(
    '{"name":"Acme","enabled":true}'
  );
});

test("validates and serializes bindings when converting them to fixed code", () => {
  expect(getFixedJsonCodeValue({ name: "Acme" }, "Code")).toEqual({
    success: true,
    value: '{"name":"Acme"}',
  });
  expect(getFixedJsonCodeValue('{"name":"Acme"}', "Code")).toEqual({
    success: true,
    value: '{"name":"Acme"}',
  });
  expect(getFixedJsonCodeValue("not JSON", "Code")).toEqual({
    success: false,
    message: "Code: $ JSON-LD must be a valid JSON object or array.",
  });
});

test.each(["", "invalid", '"text"', "1", "null"])(
  "rejects non-object JSON %j",
  (source) => {
    expect(parseJsonCode(source)).toEqual({ success: false });
  }
);

test("warns when JSON-LD binding values have no top-level context", () => {
  expect(validateJsonCodeValue({ a: 1 }, "Code")).toBe(
    "Code: $ JSON-LD has no top-level @context."
  );
  expect(validateJsonCodeValue([{ a: 1 }], "Code")).toBe(
    "Code: $ JSON-LD has no top-level @context."
  );
  expect(validateJsonCodeValue('{"a":1}', "Code")).toBe(
    "Code: $ JSON-LD has no top-level @context."
  );
  expect(
    validateJsonCodeValue(
      { "@context": "https://schema.org", "@type": "Organization" },
      "Code"
    )
  ).toBeUndefined();
});

test("surfaces Schema.org warnings for JSON-LD binding values", () => {
  expect(
    validateJsonCodeValue(
      { "@context": "https://schema.org", "@type": "MadeUpType" },
      "Code"
    )
  ).toContain('"MadeUpType" is not a known Schema.org type.');
});

test("warns about missing context in fixed JSON-LD code", () => {
  expect(processJsonCodeValue('{"a":1}')).toMatchObject({
    success: true,
    issue: {
      severity: "warning",
      message: "$ JSON-LD has no top-level @context.",
    },
  });
});

test("rejects non-JSON binding values", () => {
  expect(validateJsonCodeValue(1, "Code")).toBe(
    "Code: $ JSON-LD must be a valid JSON object or array."
  );
});

test("validates JSON-LD structure and keeps vocabulary findings as warnings", () => {
  expect(
    validateJsonCode('{"@context":"https://schema.org","@type":1}')
  ).toMatchObject({
    success: false,
    diagnostics: [
      expect.objectContaining({
        severity: "error",
        code: "invalid-keyword-value",
      }),
    ],
  });
  expect(
    validateJsonCode('{"@context":"https://schema.org","@type":"MadeUpType"}')
  ).toMatchObject({
    success: true,
    diagnostics: [
      expect.objectContaining({
        severity: "warning",
        code: "unknown-schema-org-type",
      }),
    ],
  });
});
