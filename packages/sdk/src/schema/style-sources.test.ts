import { describe, expect, test } from "vitest";
import { getTagFromTokenId, getTagTokenId, styleSource } from "./style-sources";

describe("StyleSource", () => {
  test("accepts an html Tag token for Global root", () => {
    const id = getTagTokenId("html");
    expect(getTagFromTokenId(id)).toBe("html");
    expect(styleSource.parse({ type: "tagToken", id, tag: "html" })).toEqual({
      type: "tagToken",
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
