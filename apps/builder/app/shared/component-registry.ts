import type { Instance, WsComponentMeta } from "@webstudio-is/sdk";

type WebstudioRegistryItemMeta = Partial<WsComponentMeta> & {
  component?: string;
  source?: {
    package?: string;
  };
};

type WebstudioComponentRegistryItemMeta = Partial<WsComponentMeta> & {
  component: string;
};

type WebstudioRegistryItem = {
  meta?: WebstudioRegistryItemMeta | Record<string, unknown>;
};

type WebstudioRegistry = {
  items: WebstudioRegistryItem[];
};

const toComponentMeta = (meta: WebstudioRegistryItemMeta): WsComponentMeta => ({
  category: meta.category,
  contentModel: meta.contentModel,
  indexWithinAncestor: meta.indexWithinAncestor,
  label: meta.label,
  description: meta.description,
  icon: meta.icon,
  presetStyle: meta.presetStyle,
  states: meta.states,
  order: meta.order,
  initialProps: meta.initialProps,
  props: meta.props,
});

const isComponentMeta = (
  meta: WebstudioRegistryItem["meta"]
): meta is WebstudioComponentRegistryItemMeta =>
  typeof meta?.component === "string" && meta.component.length > 0;

const getSourcePackage = (
  meta: WebstudioRegistryItem["meta"]
): string | undefined => {
  const source =
    meta !== undefined &&
    typeof meta === "object" &&
    "source" in meta &&
    typeof meta.source === "object" &&
    meta.source !== null
      ? meta.source
      : undefined;
  if (
    source !== undefined &&
    "package" in source &&
    typeof source.package === "string" &&
    source.package.length > 0
  ) {
    return source.package;
  }
};

export const getComponentMetasFromRegistry = (
  registry: WebstudioRegistry
): Map<Instance["component"], WsComponentMeta> => {
  const metas = new Map<Instance["component"], WsComponentMeta>();
  for (const item of registry.items) {
    const meta = item.meta;
    if (isComponentMeta(meta) === false) {
      continue;
    }
    metas.set(meta.component, toComponentMeta(meta));
  }
  return metas;
};

export const getNamespacedComponentMetasFromRegistry = ({
  registry,
  namespace,
}: {
  registry: WebstudioRegistry;
  namespace?: string;
}): Map<Instance["component"], WsComponentMeta> => {
  const prefix = namespace === undefined ? "" : `${namespace}:`;
  const metas = new Map<Instance["component"], WsComponentMeta>();
  for (const [component, meta] of getComponentMetasFromRegistry(registry)) {
    metas.set(`${prefix}${component}`, meta);
  }
  return metas;
};

export const getPackageNamespaceFromRegistry = (
  registry: WebstudioRegistry
): string | undefined => {
  const namespaces = new Set<string>();
  for (const item of registry.items) {
    const sourcePackage = getSourcePackage(item.meta);
    if (sourcePackage !== undefined) {
      namespaces.add(sourcePackage);
    }
  }
  if (namespaces.size === 1) {
    return namespaces.values().next().value;
  }
  return undefined;
};

export const getPackageNamespacedComponentMetasFromRegistry = (
  registry: WebstudioRegistry
): Map<Instance["component"], WsComponentMeta> =>
  getNamespacedComponentMetasFromRegistry({
    registry,
    namespace: getPackageNamespaceFromRegistry(registry),
  });
