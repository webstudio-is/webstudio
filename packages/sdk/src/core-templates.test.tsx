import { expect, test } from "vitest";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";
import { blockComponent } from "./core-metas";
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
