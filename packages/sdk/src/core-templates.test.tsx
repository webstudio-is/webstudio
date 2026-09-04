import { expect, test } from "vitest";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";
import { blockComponent, blockTemplateComponent } from "./core-metas";
import { coreTemplates } from "./core-templates";
import {
  contentBlockMdxTemplateDescriptors,
  getContentBlockMdxTemplateDescriptor,
} from "./content-block";

const expectCodeTextDefaultsToStayImplicit = (
  template: TemplateMeta | undefined
) => {
  if (template === undefined) {
    throw new Error("Expected Code Text template");
  }
  const fragment = renderTemplate(template.template);
  const codeText = fragment.instances.find(
    ({ component }) => component === "CodeText"
  );
  expect(codeText?.children).toEqual([
    { type: "text", value: 'const status = "ready";' },
  ]);
  expect(
    fragment.props.filter(({ instanceId }) => instanceId === codeText?.id)
  ).toEqual([]);
};

test("keeps standalone Code Text defaults out of instance props", () => {
  expectCodeTextDefaultsToStayImplicit(
    (coreTemplates as Record<string, TemplateMeta>).code_text
  );
});

test("keeps Content Block Code Text defaults out of template props", () => {
  expectCodeTextDefaultsToStayImplicit(coreTemplates[blockComponent]);
});

test("keeps the Content Block Image template representable as Markdown", () => {
  const template = coreTemplates[blockComponent];
  if (template === undefined) {
    throw new Error("Expected Content Block template");
  }
  const fragment = renderTemplate(template.template);
  const image = fragment.instances.find(
    ({ component }) => component === "Image"
  );
  if (image === undefined) {
    throw new Error("Expected Image template");
  }

  expect(
    fragment.styleSourceSelections.filter(
      ({ instanceId }) => instanceId === image.id
    )
  ).toEqual([]);
});

test("generates the ordered semantic defaults from their descriptors", () => {
  const template = coreTemplates[blockComponent];
  if (template === undefined) {
    throw new Error("Expected Content Block template");
  }
  const fragment = renderTemplate(template.template);
  const instances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const templates = fragment.instances.find(
    ({ component }) => component === blockTemplateComponent
  );
  if (templates === undefined) {
    throw new Error("Expected Templates container");
  }
  const defaults = templates.children.map((child, index) => {
    if (child.type !== "id") {
      throw new Error("Expected template instance child");
    }
    const instance = instances.get(child.value);
    if (instance === undefined) {
      throw new Error("Expected template instance");
    }
    const descriptor = getContentBlockMdxTemplateDescriptor(instance);
    if (descriptor === undefined) {
      return {
        type: "custom" as const,
        index,
        component: instance.component,
        label: instance.label,
      };
    }
    return {
      type: "semantic" as const,
      resolutionKey: descriptor.resolutionKey,
      label: instance.label,
    };
  });

  const expectedSemanticDefaults = contentBlockMdxTemplateDescriptors.map(
    ({ resolutionKey, label }) => ({
      type: "semantic" as const,
      resolutionKey,
      label,
    })
  );
  expect(
    new Set(expectedSemanticDefaults.map(({ resolutionKey }) => resolutionKey))
      .size
  ).toBe(expectedSemanticDefaults.length);
  expect(defaults.filter(({ type }) => type === "semantic")).toEqual(
    expectedSemanticDefaults
  );
  expect(defaults.filter(({ type }) => type === "custom")).toEqual([
    {
      type: "custom",
      index: contentBlockMdxTemplateDescriptors.findIndex(
        ({ resolutionKey }) => resolutionKey === "component:CodeText"
      ),
      component: "HtmlEmbed",
      label: undefined,
    },
  ]);
});

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
