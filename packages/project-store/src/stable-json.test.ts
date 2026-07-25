import { describe, expect, test } from "vitest";
import {
  normalizeJsonValue,
  serializeJsonDeterministically,
} from "./stable-json";
import type { JsonValue } from "./types";

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
    const sparse: unknown[] = [];
    sparse.length = 1;
    expect(() => normalizeJsonValue(sparse)).toThrow("sparse");
    const arrayWithProperty = [true] as boolean[] & { label?: string };
    arrayWithProperty.label = "invalid";
    expect(() => normalizeJsonValue(arrayWithProperty)).toThrow(
      "named properties"
    );
    expect(() => normalizeJsonValue(Number.NaN)).toThrow("non-finite");
    expect(() => normalizeJsonValue(new Date())).toThrow("plain objects");
    expect(() => normalizeJsonValue({ value: () => undefined })).toThrow(
      "represented as JSON"
    );
    expect(() => normalizeJsonValue("\ud800")).toThrow("Unicode surrogates");
    expect(() => normalizeJsonValue({ "\udc00": true })).toThrow(
      "Unicode surrogates"
    );
    expect(() => normalizeJsonValue({ [Symbol("key")]: true })).toThrow(
      "symbol properties"
    );
    const circular: unknown[] = [];
    circular.push(circular);
    expect(() => normalizeJsonValue(circular)).toThrow("circular references");
  });

  test("preserves dangerous property names without changing prototypes", () => {
    const value = normalizeJsonValue({
      ["__proto__"]: { polluted: true },
      constructor: "user value",
    });

    expect(Object.hasOwn(value as object, "__proto__")).toBe(true);
    expect((value as Record<string, JsonValue>)["__proto__"]).toEqual({
      polluted: true,
    });
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  test("uses RFC 8785 number and UTF-16 property ordering", () => {
    expect(
      serializeJsonDeterministically({
        literals: [null, true, false],
        numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 1e-27],
        string: '€$\u000f\nA\'B"\\"/',
      })
    ).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\\"\\\\\\\"/"}'
    );

    expect(
      serializeJsonDeterministically({
        "\u20ac": "Euro Sign",
        "\r": "Carriage Return",
        "\ufb33": "Hebrew Letter Dalet With Dagesh",
        "1": "One",
        "😀": "Emoji: Grinning Face",
        "\u0080": "Control",
        ö: "Latin Small Letter O With Diaeresis",
      })
    ).toBe(
      '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}'
    );
  });
});
