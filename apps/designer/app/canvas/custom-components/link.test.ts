import { preserveBuildParams } from "./link";

describe("preserveBuildParams", () => {
  test("absolute url is returned as is", () => {
    const search = "?mode=preview&projectId=123";
    expect(preserveBuildParams("https://example.com", search)).toBe(
      "https://example.com"
    );
    expect(preserveBuildParams("mailto:alice@example.com", search)).toBe(
      "mailto:alice@example.com"
    );
  });

  test("doesn't crash on a weird value", () => {
    expect(preserveBuildParams("http://", "?projectId=123")).toBe("http://");
  });

  test("projectId is preserved", () => {
    expect(preserveBuildParams("/foo", "?projectId=123")).toBe(
      "/foo?projectId=123"
    );
  });

  test("mode is preserved", () => {
    expect(preserveBuildParams("/foo", "?mode=preview")).toBe(
      "/foo?mode=preview"
    );
  });

  test("invalid mode is not preserved", () => {
    expect(preserveBuildParams("/foo", "?mode=invalid")).toBe("/foo");
  });
});
