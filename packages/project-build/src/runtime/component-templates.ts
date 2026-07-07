import React from "react";
import {
  renderTemplate,
  type GeneratedTemplateMeta,
  type TemplateMeta,
} from "@webstudio-is/template";
import { canvasComponentLibraries } from "@webstudio-is/sdk-components-registry/canvas";

(
  globalThis as typeof globalThis & {
    React?: typeof React;
  }
).React ??= React;

let componentTemplates: Map<string, GeneratedTemplateMeta> | undefined;

export const getComponentTemplates = () => {
  if (componentTemplates !== undefined) {
    return componentTemplates;
  }
  const templatesByComponent = new Map<string, GeneratedTemplateMeta>();

  for (const library of canvasComponentLibraries) {
    const { templates } = library;
    const namespace = "namespace" in library ? library.namespace : undefined;
    const prefix = namespace === undefined ? "" : `${namespace}:`;
    for (const [componentName, meta] of Object.entries(
      templates as Record<string, TemplateMeta>
    )) {
      const { template, ...generatedMeta } = meta;
      templatesByComponent.set(`${prefix}${componentName}`, {
        ...generatedMeta,
        template: renderTemplate(template),
      });
    }
  }

  componentTemplates = templatesByComponent;
  return componentTemplates;
};
