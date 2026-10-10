import { expect, test } from "vitest";
import {
  appendFormDataToSearchParams,
  appendSystemSearch,
  getSystemSearch,
} from "./system-search";

test("returns scalars for single query values and ordered arrays for repeats", () => {
  const search = getSystemSearch(
    new URLSearchParams(
      "tag=&tag=hello%2Cworld&tag=hello%2Cworld&encoded=%E2%9C%93&single=one&__proto__=safe"
    )
  );
  expect(search.search).toMatchObject({
    tag: ["", "hello,world", "hello,world"],
    encoded: "✓",
    single: "one",
  });
  expect(search.search).toHaveProperty("__proto__", "safe");
  expect(Object.getPrototypeOf(search.search)).toBe(Object.prototype);
});

test("serializes scalar and repeated system search values", () => {
  const searchParams = new URLSearchParams();
  appendSystemSearch(searchParams, {
    source: "newsletter",
    tag: ["red", "blue"],
    absent: undefined,
  });

  expect(searchParams.toString()).toBe("source=newsletter&tag=red&tag=blue");
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
  expect(getSystemSearch(searchParams).search.tag).toEqual([
    "",
    "red,blue",
    "red,blue",
  ]);

  appendFormDataToSearchParams(searchParams, new FormData(), ["tag"]);
  expect(searchParams.toString()).toBe(
    "source=newsletter&encoded=%E2%9C%93%26value"
  );
});
