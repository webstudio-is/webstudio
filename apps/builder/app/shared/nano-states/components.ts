import type { ExoticComponent } from "react";
import { atom, computed } from "nanostores";
import type { AnyComponent } from "@webstudio-is/react-sdk";
import {
  getIndexesWithinAncestors,
  type Instance,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { $instances } from "../sync/data-stores";
import { $selectedPage } from "./pages";
import {
  renderTemplate,
  type GeneratedTemplateMeta,
  type TemplateMeta,
} from "@webstudio-is/template";

export const $registeredComponents = atom(new Map<string, AnyComponent>());

export const $registeredComponentMetas = atom(
  new Map<string, WsComponentMeta>()
);

export const $indexesWithinAncestors = computed(
  [$registeredComponentMetas, $instances, $selectedPage],
  (metas, instances, page) =>
    getIndexesWithinAncestors(
      metas,
      instances,
      page ? [page.rootInstanceId] : []
    )
);

export const $registeredTemplates = atom(
  new Map<string, GeneratedTemplateMeta>()
);

export const registerComponentLibrary = ({
  namespace,
  components,
  metas,
  templates,
  componentIds = new Map(),
}: {
  namespace?: string;
  // simplify adding component libraries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<Instance["component"], ExoticComponent<any>>;
  metas: Record<Instance["component"], WsComponentMeta>;
  templates: Record<Instance["component"], TemplateMeta>;
  componentIds?: ReadonlyMap<object, Instance["component"]>;
}) => {
  const prefix = namespace === undefined ? "" : `${namespace}:`;

  const prevComponents = $registeredComponents.get();
  const nextComponents = new Map(prevComponents);
  for (const [componentName, component] of Object.entries(components)) {
    nextComponents.set(`${prefix}${componentName}`, component);
  }
  $registeredComponents.set(nextComponents);

  const prevMetas = $registeredComponentMetas.get();
  const nextMetas = new Map(prevMetas);
  for (const [componentName, meta] of Object.entries(metas)) {
    nextMetas.set(`${prefix}${componentName}`, meta);
  }
  $registeredComponentMetas.set(nextMetas);

  const resolvedComponentIds = new Map(componentIds);
  for (const [componentId, component] of nextComponents) {
    resolvedComponentIds.set(component, componentId);
  }

  const prevTemplates = $registeredTemplates.get();
  const nextTemplates = new Map(prevTemplates);
  for (const [componentName, meta] of Object.entries(templates)) {
    const { template, ...generatedMeta } = meta;
    nextTemplates.set(`${prefix}${componentName}`, {
      ...generatedMeta,
      template: renderTemplate(template, undefined, [], {
        componentIds: resolvedComponentIds,
        componentMetas: nextMetas,
      }),
    });
  }
  $registeredTemplates.set(nextTemplates);
};
