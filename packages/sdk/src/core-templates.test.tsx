import { expect, test } from "vitest";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";
import { standardMdxTemplateKeys } from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
} from "./core-metas";
import { coreTemplates } from "./core-templates";

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

test("provides one direct template for every standard MDX semantic key", () => {
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
  const keys = templates.children.flatMap((child) => {
    if (child.type !== "id") {
      return [];
    }
    const instance = instances.get(child.value);
    if (
      instance?.component === elementComponent &&
      instance.tag !== undefined
    ) {
      return [`element:${instance.tag}`];
    }
    return instance?.component === "Image" || instance?.component === "CodeText"
      ? [`component:${instance.component}`]
      : [];
  });

  expect(new Set(keys).size).toBe(keys.length);
  expect(keys.toSorted()).toEqual(standardMdxTemplateKeys.toSorted());
});
