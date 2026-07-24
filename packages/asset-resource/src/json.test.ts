import { describe, expect, test } from "vitest";
import { extractJsonProperties } from "./json";

describe("JSON metadata extraction", () => {
  test("extracts a bounded root object with arbitrary safe keys", async () => {
    const source = `\uFEFF{"title":"Post","draft":false,"nested":{"value":1},"__proto__":{"safe":true}}`;
    const result = await extractJsonProperties(source);

    expect(result.sourceBytes).toBe(
      new TextEncoder().encode(source).byteLength
    );
    expect(result.properties).toEqual(
      JSON.parse(
        '{"title":"Post","draft":false,"nested":{"value":1},"__proto__":{"safe":true}}'
      )
    );
    expect(({} as { safe?: boolean }).safe).toBeUndefined();
  });

  test("rejects invalid UTF-8, invalid JSON, and non-object roots", async () => {
    await expect(
      extractJsonProperties(new Uint8Array([0xc3, 0x28]))
    ).rejects.toMatchObject({ code: "JSON_DECODING_FAILED" });
    await expect(extractJsonProperties("{")).rejects.toMatchObject({
      code: "JSON_INVALID",
    });
    await expect(extractJsonProperties("[]")).rejects.toMatchObject({
      code: "JSON_INVALID",
    });
  });

  test("enforces byte, depth, field, string, and numeric limits", async () => {
    await expect(
      extractJsonProperties('{"value":"long"}', { bytes: 5 })
    ).rejects.toMatchObject({ code: "JSON_BYTES_EXCEEDED" });
    await expect(
      extractJsonProperties('{"a":{"b":1}}', { depth: 2 })
    ).rejects.toMatchObject({ code: "JSON_DEPTH_EXCEEDED" });
    await expect(
      extractJsonProperties('{"a":1,"b":2}', { fields: 1 })
    ).rejects.toMatchObject({ code: "JSON_FIELDS_EXCEEDED" });
    await expect(
      extractJsonProperties('{"value":"long"}', { stringBytes: 3 })
    ).rejects.toMatchObject({ code: "JSON_STRING_BYTES_EXCEEDED" });
    await expect(
      extractJsonProperties('{"value":9007199254740993}')
    ).rejects.toMatchObject({ code: "JSON_INVALID" });
  });

  test("stops consuming an async stream after detecting the byte limit", async () => {
    let consumed = 0;
    const source = {
      async *[Symbol.asyncIterator]() {
        for (const chunk of ['{"value":', '"too long"}', "unused"]) {
          consumed += 1;
          yield new TextEncoder().encode(chunk);
        }
      },
    };

    await expect(
      extractJsonProperties(source, { bytes: 10 })
    ).rejects.toMatchObject({ code: "JSON_BYTES_EXCEEDED" });
    expect(consumed).toBe(2);
  });
});
