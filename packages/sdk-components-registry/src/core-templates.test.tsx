/** Verifies the registry-owned templates that require real components. */
import { expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  contentBlockMdxTemplateDescriptors,
  getContentBlockMdxTemplateDescriptor,
  getDefaultContentBlockTemplateName,
} from "@webstudio-is/sdk";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";
import { componentIds } from "./components";
import { coreTemplates } from "./core-templates";

const renderCoreTemplate = (template: TemplateMeta | undefined) => {
  if (template === undefined) {
    throw new Error("Expected core template");
  }
  return renderTemplate(template.template, undefined, [], { componentIds });
};

const expectCodeTextDefaultsToStayImplicit = (
  template: TemplateMeta | undefined
) => {
  const fragment = renderCoreTemplate(template);
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

test("keeps Code Text defaults out of standalone and Content Block props", () => {
  expectCodeTextDefaultsToStayImplicit(coreTemplates.code_text);
  expectCodeTextDefaultsToStayImplicit(coreTemplates[blockComponent]);
});

test("keeps the Content Block Image template free of local styles", () => {
  const fragment = renderCoreTemplate(coreTemplates[blockComponent]);
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

test("generates ordered semantic defaults from their descriptors", () => {
  const fragment = renderCoreTemplate(coreTemplates[blockComponent]);
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
    return descriptor === undefined
      ? {
          type: "custom" as const,
          index,
          component: instance.component,
          label: instance.label,
          name: instance.name,
        }
      : {
          type: "semantic" as const,
          resolutionKey: descriptor.resolutionKey,
          label: instance.label,
          name: instance.name,
        };
  });
  const expectedSemanticDefaults = contentBlockMdxTemplateDescriptors.map(
    (descriptor) => ({
      type: "semantic" as const,
      resolutionKey: descriptor.resolutionKey,
      label: descriptor.label,
      name: getDefaultContentBlockTemplateName(
        descriptor.kind === "element"
          ? { component: "ws:element", tag: descriptor.tag }
          : { component: descriptor.component }
      ),
    })
  );

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
      name: "HtmlEmbed",
    },
  ]);
});
