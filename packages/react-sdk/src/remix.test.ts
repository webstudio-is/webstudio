import { expect, test, describe } from "vitest";
import { generateRemixParams, generateRemixRoute } from "./remix";
import { STATIC_PATHS } from "@webstudio-is/sdk/router-paths.test";

/**
 * These tests use the shared test data from @webstudio-is/sdk to ensure
 * route generation is consistent with schema validation and URLPattern matching.
 */
describe("Shared router path tests - Route generation", () => {
  describe("all valid static paths generate valid routes", () => {
    test.each(STATIC_PATHS)("generates route for: %s", (path) => {
      const route = generateRemixRoute(path);
      // Should produce a non-empty route
      expect(route).toBeTruthy();
      // Should not throw
      expect(typeof route).toBe("string");
    });
  });
});

test("convert home page to remix route", () => {
  expect(generateRemixRoute("")).toEqual("_index");
  expect(generateRemixRoute("/")).toEqual("_index");
});

test("convert path to remix route", () => {
  expect(generateRemixRoute("/blog")).toEqual("[blog]._index");
  expect(generateRemixRoute("/blog/my-introduction")).toEqual(
    "[blog].[my-introduction]._index"
  );
});

describe("non-Latin character routes", () => {
  // When users define redirects with non-Latin characters (e.g., Chinese, Japanese),
  // the generateRemixRoute function must produce valid filenames.
  // Note: The actual HTTP request will have URL-encoded paths, but React Router
  // handles the decoding automatically when matching routes.

  test("convert Chinese path to remix route", () => {
    expect(generateRemixRoute("/关于我们")).toEqual("[关于我们]._index");
    expect(generateRemixRoute("/产品/手机")).toEqual("[产品].[手机]._index");
  });

  test("convert Japanese path to remix route", () => {
    expect(generateRemixRoute("/日本語")).toEqual("[日本語]._index");
    expect(generateRemixRoute("/ブログ/記事")).toEqual(
      "[ブログ].[記事]._index"
    );
  });

  test("convert Korean path to remix route", () => {
    expect(generateRemixRoute("/한국어")).toEqual("[한국어]._index");
  });

  test("convert Cyrillic path to remix route", () => {
    expect(generateRemixRoute("/привет")).toEqual("[привет]._index");
    expect(generateRemixRoute("/блог/статья")).toEqual(
      "[блог].[статья]._index"
    );
  });

  test("convert European diacritics to remix route", () => {
    expect(generateRemixRoute("/über-uns")).toEqual("[über-uns]._index");
    expect(generateRemixRoute("/café")).toEqual("[café]._index");
  });

  test("convert mixed Latin and non-Latin path to remix route", () => {
    expect(generateRemixRoute("/blog/关于")).toEqual("[blog].[关于]._index");
  });
});

test("convert wildcard to remix route", () => {
  expect(generateRemixRoute("/blog/*")).toEqual("[blog].$");
});

test("convert named group with * modifier to remix route", () => {
  expect(generateRemixRoute("/blog/:slug*")).toEqual("[blog].$");
});

test("convert named group with ? modifier to remix route", () => {
  expect(generateRemixRoute("/:id?/:slug?")).toEqual("($id).($slug)._index");
});

test("convert named groups to remix route", () => {
  expect(generateRemixRoute("/blog/:id/:date")).toEqual(
    "[blog].$id.$date._index"
  );
});

test("generate remix params for static pathname", () => {
  expect("\n" + generateRemixParams("/blog/my-post")).toEqual(`
type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params
}
`);
});

test("generate remix params converter with wildcard", () => {
  expect("\n" + generateRemixParams("/blog/*")).toEqual(`
type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  params[0] = params["*"]
  delete params["*"]
  return params
}
`);
});

test("generate remix params converter with named group and * modifier", () => {
  expect("\n" + generateRemixParams("/blog/:name*")).toEqual(`
type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  params["name"] = params["*"]
  delete params["*"]
  return params
}
`);
});
