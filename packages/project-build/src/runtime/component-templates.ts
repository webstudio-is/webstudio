import React from "react";
import {
  renderTemplate,
  type GeneratedTemplateMeta,
  type TemplateMeta,
} from "@webstudio-is/template";
import { canvasComponentLibraries } from "@webstudio-is/sdk-components-registry/canvas";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import type { ComponentCatalogSourceInfo } from "./component-catalog";

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
        template: renderTemplate(template, undefined, [], { componentMetas }),
      });
    }
  }

  componentTemplates = templatesByComponent;
  return componentTemplates;
};

let componentCatalogSources:
  | Map<string, ComponentCatalogSourceInfo>
  | undefined;

export const getComponentCatalogSources = () => {
  if (componentCatalogSources !== undefined) {
    return componentCatalogSources;
  }
  const sources = new Map<string, ComponentCatalogSourceInfo>();

  for (const library of canvasComponentLibraries) {
    const namespace = "namespace" in library ? library.namespace : undefined;
    const prefix = namespace === undefined ? "" : `${namespace}:`;
    const importSource =
      Object.keys(library.components).length === 0
        ? undefined
        : (namespace ?? "@webstudio-is/sdk-components-react/components");
    const provenance = importSource === undefined ? "core" : "sdk";
    for (const exportName of new Set([
      ...Object.keys(library.metas),
      ...Object.keys(library.templates),
    ])) {
      const component = `${prefix}${exportName}`;
      sources.set(component, {
        namespace,
        exportName,
        importSource,
        componentExport: exportName in library.components,
        templateExport: exportName in library.templates,
        hooks: "hooks" in library && exportName in library.hooks,
        provenance,
      });
    }
  }

  componentCatalogSources = sources;
  return componentCatalogSources;
};
