import type { WsComponentMeta } from "@webstudio-is/sdk";

type WebstudioRegistryItemMeta = Partial<WsComponentMeta> & {
  component?: string;
};

type WebstudioRegistryItem = {
  meta?: WebstudioRegistryItemMeta | Record<string, unknown>;
};

type WebstudioRegistry = {
  items: WebstudioRegistryItem[];
};

const isComponentMeta = (
  meta: WebstudioRegistryItem["meta"]
): meta is WebstudioRegistryItemMeta & { component: string } =>
  typeof meta?.component === "string" && meta.component.length > 0;

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

export const addComponentsFromRegistry = ({
  registry,
  componentPackage,
  components,
  metas,
  namespace = false,
}: {
  registry: WebstudioRegistry;
  componentPackage: string;
  components: Record<string, string>;
  metas: Record<string, WsComponentMeta>;
  namespace?: boolean;
}) => {
  for (const item of registry.items) {
    const meta = item.meta;
    if (isComponentMeta(meta) === false) {
      continue;
    }
    const component = namespace
      ? `${componentPackage}:${meta.component}`
      : meta.component;
    components[component] = `${componentPackage}:${meta.component}`;
    metas[component] = toComponentMeta(meta);
  }
};

export const addComponentOverridesFromExports = ({
  componentExports,
  componentPackage,
  components,
}: {
  componentExports: Record<string, unknown>;
  componentPackage: string;
  components: Record<string, string>;
}) => {
  for (const name of Object.keys(componentExports)) {
    components[name] = `${componentPackage}:${name}`;
  }
};
