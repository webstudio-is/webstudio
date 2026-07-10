import {
  collectionComponent,
  componentCategories,
  normalizeComponentCategory,
  parseComponentName,
  type Instance,
  type Page,
  type PropMeta,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import type { GeneratedTemplateMeta } from "@webstudio-is/template";
import type { BuilderNamespace } from "../contracts/namespaces";

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
  | "initialProps"
  | "label"
  | "order"
  | "presetStyle"
  | "props"
  | "states"
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

export type ComponentCatalogSourceInfo = {
  namespace?: string;
  exportName: string;
  importSource?: string;
  componentExport: boolean;
  templateExport: boolean;
  hooks: boolean;
  provenance: "core" | "sdk";
};

/**
 * Shadcn-compatible registry item with Webstudio-specific superset metadata.
 *
 * The top-level shape intentionally follows shadcn registry conventions
 * (`name`, `title`, `type`, `dependencies`, `registryDependencies`, `files`,
 * and `meta`). Webstudio authoring/runtime/insertion semantics live under
 * `meta` so Builder, MCP, and future registry tooling can share one catalog
 * without pretending Webstudio templates are plain installable React files.
 */
export type ComponentRegistryItem = {
  name: string;
  title: string;
  description?: string;
  type: "registry:ui";
  docs?: string;
  dependencies: readonly string[];
  registryDependencies: readonly string[];
  files: readonly {
    path: string;
    type: "registry:component" | "registry:file";
    target?: string;
    content?: string;
  }[];
  meta: {
    catalogId: string;
    source: ComponentCatalogItem["source"];
    component: Instance["component"];
    category: string;
    label: string;
    order?: number;
    icon?: string;
    insert: {
      component: Instance["component"];
      template: boolean;
      firstInstance: { component: string; tag?: string };
    };
    runtime: {
      component: Instance["component"];
      componentExport: string;
      templateExport?: string;
      hooks: boolean;
      namespace?: string;
      category: string;
      contentModel?: WsComponentMeta["contentModel"];
      props: Record<string, PropMeta>;
      initialProps: readonly string[];
      states: NonNullable<WsComponentMeta["states"]>;
      presetStyle?: WsComponentMeta["presetStyle"];
      source: {
        importSource?: string;
        exportName: string;
        provenance: ComponentCatalogSourceInfo["provenance"];
      };
    };
    authoring: {
      compositionFamily?: string;
      role?: string;
      requiredAncestors: readonly string[];
      allowedParents: readonly string[];
      allowedChildren: readonly string[];
      requiredDescendants: readonly string[];
      preferredTree: readonly string[];
      examples: readonly string[];
      dos: readonly string[];
      donts: readonly string[];
      accessibilityNotes: readonly string[];
      insertionStrategy: "insert-component" | "insert-fragment";
    };
    builder: {
      insertTemplate: boolean;
      componentPart: boolean;
      requiredStructure: readonly string[];
      editablePlaceholders: readonly string[];
      expectedNamespaces: readonly BuilderNamespace[];
    };
    examples: readonly {
      name: string;
      description: string;
      tool: "insert-component";
      input: {
        component: Instance["component"];
      };
    }[];
  };
};

const getComponentSourceInfo = (
  component: Instance["component"],
  sources?: ReadonlyMap<Instance["component"], ComponentCatalogSourceInfo>
): ComponentCatalogSourceInfo => {
  const source = sources?.get(component);
  if (source !== undefined) {
    return source;
  }
  const [namespace, exportName] = parseComponentName(component);
  return {
    namespace,
    exportName,
    componentExport: true,
    templateExport: false,
    hooks: false,
    provenance: namespace === undefined ? "core" : "sdk",
  };
};

const getTemplateComponentTree = (
  template: ComponentCatalogTemplate | undefined
) => template?.template.instances.map((instance) => instance.component) ?? [];

const getTemplateEditablePlaceholders = (
  template: ComponentCatalogTemplate | undefined
) => {
  const placeholders: string[] = [];
  for (const instance of template?.template.instances ?? []) {
    for (const [index, child] of instance.children.entries()) {
      if (child.type === "text" && child.placeholder === true) {
        placeholders.push(`${instance.id}.children.${index}`);
      }
    }
  }
  return placeholders;
};

const getTemplateExpectedNamespaces = (
  template: ComponentCatalogTemplate | undefined
): BuilderNamespace[] => {
  const fragment = template?.template;
  if (fragment === undefined) {
    return ["instances"];
  }
  const namespaces: BuilderNamespace[] = [];
  if (fragment.instances.length > 0 || fragment.children.length > 0) {
    namespaces.push("instances");
  }
  if (fragment.props.length > 0) {
    namespaces.push("props");
  }
  if (fragment.dataSources.length > 0) {
    namespaces.push("dataSources");
  }
  if (fragment.resources.length > 0) {
    namespaces.push("resources");
  }
  if (fragment.styleSources.length > 0) {
    namespaces.push("styleSources");
  }
  if (fragment.styleSourceSelections.length > 0) {
    namespaces.push("styleSourceSelections");
  }
  if (fragment.styles.length > 0) {
    namespaces.push("styles");
  }
  if (fragment.breakpoints.length > 0) {
    namespaces.push("breakpoints");
  }
  if (fragment.assets.length > 0) {
    namespaces.push("assets");
  }
  return namespaces;
};

const findComponentsReferencing = ({
  component,
  metas,
  relation,
}: {
  component: Instance["component"];
  metas?: ReadonlyMap<string, ComponentCatalogMeta>;
  relation: "children" | "descendants";
}) => {
  if (metas === undefined) {
    return [];
  }
  const parents: string[] = [];
  for (const [parentComponent, meta] of metas) {
    const references = meta.contentModel?.[relation] ?? [];
    if (references.includes(component)) {
      parents.push(parentComponent);
    }
  }
  return parents.sort();
};

const getAuthoringDos = ({
  item,
  meta,
  template,
}: {
  item: ComponentCatalogItem;
  meta?: ComponentCatalogMeta;
  template?: ComponentCatalogTemplate;
}) => {
  const dos: string[] = [];
  if (item.source === "template") {
    dos.push(
      "Use insert-component when you want Webstudio to create this registered template and required child structure."
    );
  } else {
    dos.push(
      "Use insert-fragment when composing this component into an authored, styled section."
    );
  }
  if ((meta?.states?.length ?? 0) > 0) {
    dos.push(
      `Style exposed states when creating polished examples: ${meta?.states
        ?.map((state) => `${state.label} (${state.selector})`)
        .join(", ")}.`
    );
  }
  if ((template?.template.instances.length ?? 0) > 1) {
    dos.push(
      "Preserve the template structure unless intentionally editing it."
    );
  }
  return dos;
};

const getAuthoringDonts = ({
  componentPart,
  item,
}: {
  componentPart: boolean;
  item: ComponentCatalogItem;
}) => {
  const donts: string[] = [];
  if (componentPart) {
    donts.push(
      "Do not insert this part as a standalone component; create it through its containing root/template component."
    );
  }
  if (item.source === "meta") {
    donts.push(
      "Do not assume Webstudio will add missing required child parts for raw JSX fragments."
    );
  }
  return donts;
};

const getAccessibilityNotes = (meta?: ComponentCatalogMeta) => {
  const notes: string[] = [];
  const propNames = Object.keys(meta?.props ?? {});
  const descendants = meta?.contentModel?.descendants ?? [];
  if (propNames.includes("alt")) {
    notes.push("Provide meaningful alt text for informative media.");
  }
  if (propNames.some((name) => name.startsWith("aria-"))) {
    notes.push(
      "Set required ARIA labels/descriptions when visible text is absent."
    );
  }
  if (
    descendants.some(
      (component) =>
        component.endsWith("Title") || component.endsWith("Description")
    )
  ) {
    notes.push(
      "Keep required title/description parts in the structure, visually hidden if necessary."
    );
  }
  return notes;
};

const getComponentAuthoring = ({
  item,
  template,
  meta,
  metas,
}: {
  item: ComponentCatalogItem;
  template?: ComponentCatalogTemplate;
  meta?: ComponentCatalogMeta;
  metas?: ReadonlyMap<string, ComponentCatalogMeta>;
}): ComponentRegistryItem["meta"]["authoring"] => {
  const contentModel = meta?.contentModel;
  const componentPart = contentModel?.category === "none";
  const preferredTree = getTemplateComponentTree(template);
  const examples = [
    item.source === "template"
      ? "insert-registered-template"
      : "insert-component-instance",
  ];
  return {
    compositionFamily:
      item.category === "radix" || item.category === "animations"
        ? item.category
        : undefined,
    role: item.description,
    requiredAncestors: findComponentsReferencing({
      component: item.name,
      metas,
      relation: "descendants",
    }),
    allowedParents: findComponentsReferencing({
      component: item.name,
      metas,
      relation: "children",
    }),
    allowedChildren: contentModel?.children ?? [],
    requiredDescendants: contentModel?.descendants ?? [],
    preferredTree,
    examples,
    dos: getAuthoringDos({ item, meta, template }),
    donts: getAuthoringDonts({ componentPart, item }),
    accessibilityNotes: getAccessibilityNotes(meta),
    insertionStrategy:
      item.source === "template" ? "insert-component" : "insert-fragment",
  };
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

export const getComponentRegistryItemName = (
  item: Pick<ComponentCatalogItem, "source" | "name">
) => `${item.source === "meta" ? "component" : "template"}:${item.name}`;

export const getComponentRegistryTemplateFilePath = (
  component: Instance["component"]
) => `webstudio/components/${encodeURIComponent(component)}.template.json`;

export const toComponentRegistryItem = (
  item: ComponentCatalogItem,
  template?: ComponentCatalogTemplate,
  meta?: ComponentCatalogMeta,
  sourceInfo?: ComponentCatalogSourceInfo,
  metas?: ReadonlyMap<string, ComponentCatalogMeta>
): ComponentRegistryItem => {
  const templateFilePath = getComponentRegistryTemplateFilePath(item.name);
  const source = sourceInfo ?? getComponentSourceInfo(item.name);
  const preferredTree = getTemplateComponentTree(template);
  const contentModel = meta?.contentModel;
  const componentPart = contentModel?.category === "none";
  return {
    name: getComponentRegistryItemName(item),
    title: item.label,
    description: item.description,
    type: "registry:ui",
    docs: `webstudio://project/components/${encodeURIComponent(item.name)}`,
    dependencies: [],
    registryDependencies: [],
    files:
      item.source === "template"
        ? [
            {
              path: templateFilePath,
              type: "registry:file",
              target: templateFilePath,
              content:
                template?.template === undefined
                  ? undefined
                  : `${JSON.stringify(template.template, null, 2)}\n`,
            },
          ]
        : [],
    meta: {
      catalogId: item.catalogId,
      source: item.source,
      component: item.name,
      category: item.category,
      label: item.label,
      order: item.order,
      icon: item.icon,
      insert: {
        component: item.name,
        template: item.source === "template",
        firstInstance: item.firstInstance,
      },
      runtime: {
        component: item.name,
        componentExport: source.exportName,
        templateExport: source.templateExport ? source.exportName : undefined,
        hooks: source.hooks,
        namespace: source.namespace,
        category: item.category,
        contentModel,
        props: meta?.props ?? {},
        initialProps: meta?.initialProps ?? [],
        states: meta?.states ?? [],
        presetStyle: meta?.presetStyle,
        source: {
          importSource: source.importSource,
          exportName: source.exportName,
          provenance: source.provenance,
        },
      },
      authoring: getComponentAuthoring({ item, template, meta, metas }),
      builder: {
        insertTemplate: item.source === "template",
        componentPart,
        requiredStructure: preferredTree,
        editablePlaceholders: getTemplateEditablePlaceholders(template),
        expectedNamespaces: getTemplateExpectedNamespaces(template),
      },
      examples: [
        {
          name:
            item.source === "template"
              ? "insert-registered-template"
              : "insert-component-instance",
          description:
            item.source === "template"
              ? "Insert this item with its registered Webstudio template and required child structure."
              : "Insert this visible component as a single Webstudio instance.",
          tool: "insert-component",
          input: {
            component: item.name,
          },
        },
      ],
    },
  };
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
  sources?: ReadonlyMap<Instance["component"], ComponentCatalogSourceInfo>;
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

export const listComponentRegistryItems = (
  options: Parameters<typeof listComponentCatalogItems>[0]
) =>
  listComponentCatalogItems(options).map((item) =>
    toComponentRegistryItem(
      item,
      options.templates.get(item.name),
      options.metas.get(item.name),
      options.sources?.get(item.name),
      options.metas
    )
  );

export type ComponentRegistry = {
  $schema: string;
  name: string;
  homepage: string;
  items: readonly ComponentRegistryItem[];
};

export const createComponentRegistry = ({
  items,
  name = "webstudio",
  homepage = "https://webstudio.is",
}: {
  items: readonly ComponentRegistryItem[];
  name?: string;
  homepage?: string;
}): ComponentRegistry => ({
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name,
  homepage,
  items,
});

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
