import { describe, expect, test } from "vitest";
import { expressionChild } from "./instances";
import { prop } from "./props";

const expressionProp = {
  id: "prop",
  instanceId: "instance",
  name: "title",
  type: "expression" as const,
};

describe("expression binding mode", () => {
  test("keeps ordinary expressions read-only by default", () => {
    expect(
      prop.parse({ ...expressionProp, value: "document.title + '!'" })
    ).toEqual({ ...expressionProp, value: "document.title + '!'" });
    expect(
      expressionChild.parse({ type: "expression", value: "value" })
    ).toEqual({ type: "expression", value: "value" });
    expect(
      expressionChild.parse({
        type: "expression",
        value: "document.frontmatter.title",
        mode: "read",
      })
    ).toMatchObject({ mode: "read" });
  });

  test("accepts readwrite mode only for direct static paths", () => {
    expect(
      prop.parse({
        ...expressionProp,
        value: "document.frontmatter.title",
        mode: "readwrite",
      })
    ).toMatchObject({ mode: "readwrite" });
    expect(
      expressionChild.parse({
        type: "expression",
        value: 'document.frontmatter["title"]',
        mode: "readwrite",
      })
    ).toMatchObject({ mode: "readwrite" });
    expect(
      prop.safeParse({
        ...expressionProp,
        value: "document.frontmatter.title + '!'",
        mode: "readwrite",
      }).success
    ).toBe(false);
    expect(
      expressionChild.safeParse({
        type: "expression",
        value: "document?.frontmatter.title",
        mode: "readwrite",
      }).success
    ).toBe(false);
  });
});
