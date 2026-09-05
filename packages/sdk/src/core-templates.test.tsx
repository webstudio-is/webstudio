import { expect, test } from "vitest";
import { contentBlockMdxTemplateDescriptors } from "./content-block";

test("marks structural-only MDX semantics as unavailable in insertion menus", () => {
  expect(
    contentBlockMdxTemplateDescriptors
      .filter(({ insertable }) => insertable === false)
      .map(({ resolutionKey }) => resolutionKey)
  ).toEqual([
    "element:li",
    "element:br",
    "element:em",
    "element:strong",
    "element:del",
    "element:code",
    "element:input",
    "element:thead",
    "element:tbody",
    "element:tr",
    "element:th",
    "element:td",
  ]);
});
