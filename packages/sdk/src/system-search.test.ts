import { expect, test } from "vitest";
import { appendFormDataToSearchParams, getSystemSearch } from "./system-search";

test("preserves scalar compatibility and every repeated query value", () => {
  const search = getSystemSearch(
    new URLSearchParams(
      "tag=&tag=hello%2Cworld&tag=hello%2Cworld&encoded=%E2%9C%93&single=one&__proto__=safe"
    )
  );
  expect(search.search).toMatchObject({
    tag: "hello,world",
    encoded: "✓",
    single: "one",
  });
  expect(search.searchAll).toMatchObject({
    tag: ["", "hello,world", "hello,world"],
    encoded: ["✓"],
    single: ["one"],
  });
  expect(search.search).toHaveProperty("__proto__", "safe");
  expect(search.searchAll).toHaveProperty("__proto__", ["safe"]);
  expect(Object.getPrototypeOf(search.searchAll)).toBe(Object.prototype);
});

test("a native GET form keeps all selected values in its query", () => {
  const searchParams = new URLSearchParams("source=newsletter&tag=old");
  const formData = new FormData();
  formData.append("tag", "");
  formData.append("tag", "red,blue");
  formData.append("tag", "red,blue");
  formData.append("encoded", "✓&value");
  appendFormDataToSearchParams(searchParams, formData, ["tag", "encoded"]);

  expect(searchParams.toString()).toBe(
    "source=newsletter&tag=&tag=red%2Cblue&tag=red%2Cblue&encoded=%E2%9C%93%26value"
  );
  expect(getSystemSearch(searchParams).searchAll?.tag).toEqual([
    "",
    "red,blue",
    "red,blue",
  ]);

  appendFormDataToSearchParams(searchParams, new FormData(), ["tag"]);
  expect(searchParams.toString()).toBe(
    "source=newsletter&encoded=%E2%9C%93%26value"
  );
});
