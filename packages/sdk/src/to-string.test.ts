import { expect, test } from "vitest";
import { createJsonStringifyProxy } from "./to-string";

test("preserves arrays when stringifying values with options", () => {
  const formData = createJsonStringifyProxy(
    { tags: ["blue", "green"] },
    { space: 2 }
  );

  expect(String(formData.tags)).toBe('[\n  "blue",\n  "green"\n]');
});

test("filters excluded keys while preserving nested JSON values", () => {
  const formData = createJsonStringifyProxy(
    { visible: { values: ["one", "two"], internal: "secret" } },
    { excludeKeys: ["internal"] }
  );

  expect(String(formData.visible)).toBe('{"values":["one","two"]}');
});
