import { describe, expect, test } from "vitest";
import {
  normalizeJsonValue,
  serializeJsonDeterministically,
} from "./stable-json";

describe("portable JSON", () => {
  test("omits optional object properties and preserves canonical values", () => {
    const value = normalizeJsonValue({
      omitted: undefined,
      nested: { value: 1, omitted: undefined },
      list: [true, null],
    });

    expect(value).toEqual({ nested: { value: 1 }, list: [true, null] });
    expect(serializeJsonDeterministically(value)).toBe(
      '{"list":[true,null],"nested":{"value":1}}'
    );
  });

  test("rejects values JSON would otherwise mutate silently", () => {
    expect(() => normalizeJsonValue([undefined])).toThrow("undefined");
    expect(() => normalizeJsonValue(Number.NaN)).toThrow("non-finite");
    expect(() => normalizeJsonValue(new Date())).toThrow("plain objects");
    expect(() => normalizeJsonValue({ value: () => undefined })).toThrow(
      "represented as JSON"
    );
  });
});
