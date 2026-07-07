import {
  collectionComponent,
  componentCategories,
  normalizeComponentCategory,
  type Instance,
  type Page,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import type { GeneratedTemplateMeta } from "@webstudio-is/template";

export type ComponentCatalogDocumentType = NonNullable<
  Page["meta"]["documentType"]
>;

export type ComponentCatalogMeta = Pick<
  WsComponentMeta,
  | "category"
  | "contentModel"
  | "deprecated"
  | "description"
  | "icon"
  | "label"
  | "order"
>;

export type ComponentCatalogTemplate = Pick<
  GeneratedTemplateMeta,
  "category" | "description" | "icon" | "label" | "order" | "template"
>;

export type ComponentCatalogItem = {
  catalogId: string;
  name: Instance["component"];
  source: "meta" | "template";
  category: string;
  description?: string;
  icon?: string;
  label: string;
  order?: number;
  firstInstance: { component: string; tag?: string };
};

export type BuilderComponentPanelItem = {
  name: Instance["component"];
  category: string;
  order: undefined | number;
  label: string;
  description: undefined | string;
  icon?: string;
  firstInstance: { component: string; tag?: string };
};

export const isComponentHiddenFromCatalog = (
  meta: ComponentCatalogMeta,
  category = meta.category,
  { showInternal = false }: { showInternal?: boolean } = {}
) => {
  const isFilteredCategory = (category: string | undefined) => {
    const normalized = normalizeComponentCategory(category);
    return (
      normalized === "hidden" ||
      (normalized === "internal" && showInternal === false)
    );
  };
  if (meta.category !== undefined && isFilteredCategory(meta.category)) {
    return true;
  }
  if (category !== undefined && isFilteredCategory(category)) {
    return true;
  }
  if (meta.contentModel?.category === "none") {
    return false;
  }
  return category === undefined && meta.contentModel === undefined;
};

export const isComponentDeprecatedInCatalog = (
  meta: ComponentCatalogMeta | undefined
) => meta?.deprecated === true;

export const isComponentMetaUnavailableInCatalog = (
  meta: ComponentCatalogMeta,
  { showInternal = false }: { showInternal?: boolean } = {}
) => {
  if (isComponentDeprecatedInCatalog(meta)) {
    return true;
  }
  if (meta.category !== undefined) {
    return isComponentHiddenFromCatalog(meta, meta.category, { showInternal });
  }
  return false;
};

export const isComponentAvailableForDocumentType = ({
  component,
  category,
  documentType,
}: {
  component: Instance["component"];
  category?: string;
  documentType: ComponentCatalogDocumentType;
}) => {
  if (documentType === "text") {
    return false;
  }
  if (documentType === "xml") {
    return category === "xml" || component === collectionComponent;
  }
  return category !== "xml";
};

export const getComponentCatalogSortScore = ({
  category,
  order,
}: {
  category?: string;
  order?: number;
}) => {
  const normalizedCategory = normalizeComponentCategory(category);
  const categoryScore = componentCategories.indexOf(normalizedCategory);
  const componentScore = order ?? componentCategories.length;
  return categoryScore * 1000 + componentScore;
};

export const compareComponentCatalogItems = (
  left: Pick<ComponentCatalogItem, "category" | "order">,
  right: Pick<ComponentCatalogItem, "category" | "order">
) => {
  const leftCategory = normalizeComponentCategory(left.category);
  const rightCategory = normalizeComponentCategory(right.category);
  const categoryDelta =
    componentCategories.indexOf(leftCategory) -
    componentCategories.indexOf(rightCategory);
  if (categoryDelta !== 0) {
    return categoryDelta;
  }
  return (
    (left.order ?? Number.MAX_SAFE_INTEGER) -
    (right.order ?? Number.MAX_SAFE_INTEGER)
  );
};

export const listComponentCatalogItems = ({
  metas,
  templates,
  documentType = "html",
  showInternal = false,
  getFallbackLabel = (component) => component,
  getMetaLabel = (component, meta) => meta.label ?? getFallbackLabel(component),
  getMetaIcon = (_component, meta) => meta.icon,
  getTemplateIcon = (_component, template, meta) => template.icon ?? meta?.icon,
}: {
  metas: ReadonlyMap<string, ComponentCatalogMeta>;
  templates: ReadonlyMap<string, ComponentCatalogTemplate>;
  documentType?: ComponentCatalogDocumentType;
  showInternal?: boolean;
  getFallbackLabel?: (component: string) => string;
  getMetaLabel?: (component: string, meta: ComponentCatalogMeta) => string;
  getMetaIcon?: (
    component: string,
    meta: ComponentCatalogMeta
  ) => string | undefined;
  getTemplateIcon?: (
    component: string,
    template: ComponentCatalogTemplate,
    meta: ComponentCatalogMeta | undefined
  ) => string | undefined;
}) => {
  const items: ComponentCatalogItem[] = [];

  for (const [name, meta] of metas) {
    const category = meta.category ?? "hidden";
    if (isComponentDeprecatedInCatalog(meta)) {
      continue;
    }
    if (isComponentHiddenFromCatalog(meta, category, { showInternal })) {
      continue;
    }
    if (
      isComponentAvailableForDocumentType({
        component: name,
        category,
        documentType,
      }) === false
    ) {
      continue;
    }
    items.push({
      catalogId: `meta:${name}`,
      name,
      source: "meta",
      category,
      description: meta.description,
      icon: getMetaIcon(name, meta),
      label: getMetaLabel(name, meta),
      order: meta.order,
      firstInstance: { component: name },
    });
  }

  for (const [name, template] of templates) {
    const componentMeta = metas.get(name);
    const category = template.category ?? "hidden";
    if (
      componentMeta !== undefined &&
      isComponentMetaUnavailableInCatalog(componentMeta, { showInternal })
    ) {
      continue;
    }
    if (
      isComponentHiddenFromCatalog(
        { category, contentModel: componentMeta?.contentModel },
        category,
        { showInternal }
      )
    ) {
      continue;
    }
    if (
      isComponentAvailableForDocumentType({
        component: name,
        category,
        documentType,
      }) === false
    ) {
      continue;
    }
    items.push({
      catalogId: `template:${name}`,
      name,
      source: "template",
      category,
      description: template.description,
      icon: getTemplateIcon(name, template, componentMeta),
      label: template.label ?? componentMeta?.label ?? getFallbackLabel(name),
      order: template.order,
      firstInstance: template.template.instances[0] ?? { component: name },
    });
  }

  return items.sort(compareComponentCatalogItems);
};

export const listComponentCatalogAvailableComponents = ({
  metas,
  templates,
}: {
  metas: ReadonlyMap<string, ComponentCatalogMeta>;
  templates: ReadonlyMap<string, ComponentCatalogTemplate>;
}) => {
  return new Set([...metas.keys(), ...templates.keys()]);
};

export const listBuilderComponentPanelItems = ({
  metas,
  templates,
  documentType = "html",
  showInternal = false,
  getFallbackLabel = (component) => component,
  getMetaLabel = (component) => getFallbackLabel(component),
  getTemplateIcon = (_component, template) => template.icon,
}: {
  metas: ReadonlyMap<string, ComponentCatalogMeta>;
  templates: ReadonlyMap<string, ComponentCatalogTemplate>;
  documentType?: ComponentCatalogDocumentType;
  showInternal?: boolean;
  getFallbackLabel?: (component: string) => string;
  getMetaLabel?: (component: string, meta: ComponentCatalogMeta) => string;
  getTemplateIcon?: (
    component: string,
    template: ComponentCatalogTemplate,
    meta: ComponentCatalogMeta | undefined
  ) => string | undefined;
}) => {
  const items: BuilderComponentPanelItem[] = [];
  for (const [name, meta] of metas) {
    if (isComponentDeprecatedInCatalog(meta)) {
      continue;
    }
    items.push({
      name,
      category: meta.category ?? "hidden",
      order: meta.order,
      label: getMetaLabel(name, meta),
      description: meta.description,
      firstInstance: { component: name },
    });
  }
  for (const [name, template] of templates) {
    const meta = metas.get(name);
    if (meta !== undefined && isComponentMetaUnavailableInCatalog(meta)) {
      continue;
    }
    items.push({
      name,
      category: template.category ?? "hidden",
      order: template.order,
      label: template.label ?? meta?.label ?? getFallbackLabel(name),
      description: template.description,
      icon: getTemplateIcon(name, template, meta),
      firstInstance: template.template.instances[0] ?? { component: name },
    });
  }
  const itemsByCategory = new Map<string, BuilderComponentPanelItem[]>();
  const visibleCategories = componentCategories.filter((category) => {
    if (category === "hidden") {
      return false;
    }
    if (documentType === "xml") {
      return category === "xml" || category === "data";
    }
    if (category === "xml") {
      return false;
    }
    if (showInternal === false && category === "internal") {
      return false;
    }
    return true;
  });
  for (const category of visibleCategories) {
    const categoryItems = items.filter((item) => {
      if (item.category !== category) {
        return false;
      }
      if (documentType === "xml" && item.category === "data") {
        return item.name === collectionComponent;
      }
      return true;
    });
    if (categoryItems.length === 0) {
      continue;
    }
    categoryItems.sort((left, right) => {
      return (
        (left.order ?? Number.MAX_SAFE_INTEGER) -
        (right.order ?? Number.MAX_SAFE_INTEGER)
      );
    });
    itemsByCategory.set(category, categoryItems);
  }
  return itemsByCategory;
};

export const flattenBuilderComponentPanelItems = (
  itemsByCategory: ReadonlyMap<string, readonly BuilderComponentPanelItem[]>
) => {
  const items: BuilderComponentPanelItem[] = [];
  for (const category of componentCategories) {
    const categoryItems = itemsByCategory.get(category) ?? [];
    items.push(...categoryItems);
  }
  return items;
};
