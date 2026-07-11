import { expect, test } from "vitest";
import {
  formatJsonCode,
  getFixedJsonCodeValue,
  parseJsonCode,
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

test("accepts object, array, and JSON string binding values", () => {
  expect(validateJsonCodeValue({ a: 1 }, "Code")).toBeUndefined();
  expect(validateJsonCodeValue([{ a: 1 }], "Code")).toBeUndefined();
  expect(validateJsonCodeValue('{"a":1}', "Code")).toBeUndefined();
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
