import { expect, test } from "vitest";
import {
  schemaOrgDataSourceSha256,
  schemaOrgDataVersion,
  schemaOrgPropertyRows,
  schemaOrgTypeRows,
} from "./__generated__/schema-org-data";

test("records reproducible Schema.org source provenance", () => {
  expect(schemaOrgDataVersion).toBe("30.0");
  expect(schemaOrgDataSourceSha256).toEqual({
    types: "1ae97702e7bd9b91a90b78df5133b8897a0f025a6f94669491a55c0bf1867626",
    properties:
      "3a6319bd496d2d3dc276e3a8af9b0ff6415993e7d1f6b466072fcbdec1e0d257",
  });
});

test("contains sorted Schema.org type inheritance data", () => {
  const names = schemaOrgTypeRows.map(([name]) => name);
  expect(names).toEqual([...names].sort());
  expect(new Set(names).size).toBe(names.length);
  expect(schemaOrgTypeRows).toContainEqual(["Organization", ["Thing"], ""]);
});

test("contains sorted Schema.org property domain and range data", () => {
  const names = schemaOrgPropertyRows.map(([name]) => name);
  expect(names).toEqual([...names].sort());
  expect(new Set(names).size).toBe(names.length);
  expect(schemaOrgPropertyRows).toContainEqual([
    "name",
    ["Thing"],
    ["Text"],
    "",
  ]);
});
