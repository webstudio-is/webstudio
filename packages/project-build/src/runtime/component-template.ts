import { type Instance, type WebstudioFragment } from "@webstudio-is/sdk";
import type { GeneratedTemplateMeta } from "@webstudio-is/template";
import { throwBuilderRuntimeError } from "./errors";

export type ComponentTemplateRegistry = ReadonlyMap<
  Instance["component"],
  { template: WebstudioFragment } & Partial<
    Omit<GeneratedTemplateMeta, "template">
  >
>;

export const createEmptyWebstudioFragment = (): WebstudioFragment => ({
  children: [],
  instances: [],
  props: [],
  dataSources: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
  breakpoints: [],
  assets: [],
  resources: [],
});

export const createComponentTemplateFragment = ({
  component,
  templates,
  getFallbackError,
  createId,
}: {
  component: Instance["component"];
  templates: ComponentTemplateRegistry;
  getFallbackError?: (component: Instance["component"]) => string | undefined;
  createId: () => string;
}): WebstudioFragment => {
  const template = templates.get(component)?.template;
  if (template !== undefined) {
    return template;
  }
  const fallbackError = getFallbackError?.(component);
  if (fallbackError !== undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", fallbackError);
  }
  const instance: Instance = {
    type: "instance",
    id: createId(),
    component,
    children: [],
  };
  return {
    ...createEmptyWebstudioFragment(),
    children: [{ type: "id", value: instance.id }],
    instances: [instance],
  };
};
