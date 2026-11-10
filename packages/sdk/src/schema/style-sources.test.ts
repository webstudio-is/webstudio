import { describe, expect, test } from "vitest";
import { getTagFromStyleId, getTagStyleId, styleSource } from "./style-sources";

describe("StyleSource", () => {
  test("accepts an html Tag style for Global root", () => {
    const id = getTagStyleId("html");
    expect(id).toBe("tag-style:html");
    expect(getTagFromStyleId(id)).toBe("html");
    expect(styleSource.parse({ type: "tag", id, tag: "html" })).toEqual({
      type: "tag",
      id,
      tag: "html",
    });
  });
  test("parses unlocked tokens without locked field", () => {
    expect(
      styleSource.parse({
        id: "token",
        type: "token",
        name: "Token",
      })
    ).toEqual({
      id: "token",
      type: "token",
      name: "Token",
    });
  });

  test("parses locked tokens", () => {
    expect(
      styleSource.parse({
        id: "token",
        type: "token",
        name: "Token",
        locked: true,
      })
    ).toEqual({
      id: "token",
      type: "token",
      name: "Token",
      locked: true,
    });
  });
});
