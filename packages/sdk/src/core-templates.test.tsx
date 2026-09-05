import { expect, test } from "vitest";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";
import { contentBlockMdxTemplateDescriptors } from "./content-block";
import { intrinsicCoreTemplates } from "./core-templates";

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

test.each([
  ["input_label", undefined],
  ["radio", "Radio Field"],
  ["checkbox", "Checkbox Field"],
] as const)("keeps the %s root label", (templateName, expectedLabel) => {
  const template = (intrinsicCoreTemplates as Record<string, TemplateMeta>)[
    templateName
  ];
  if (template === undefined) {
    throw new Error(`Expected ${templateName} template`);
  }

  const fragment = renderTemplate(template.template);

  expect(fragment.instances[0]?.label).toBe(expectedLabel);
});
