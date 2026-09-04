import { createAssetContentRevision, isMdxFileAsset } from "./assets";
import {
  parseJsonExpression,
  parseDirectPathExpression,
  type DirectPathExpression,
} from "@webstudio-is/expression";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
} from "./core-metas";
import {
  contentBlockDocumentProp,
  contentBlockSourceProp,
  contentBlockSourcePropSchema,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSource,
} from "./schema/content-block";
import type { Asset } from "./schema/assets";
import type { ExpressionChild, Instance, Instances } from "./schema/instances";
import type { ExpressionBinding } from "./schema/expression";
import type { Prop, Props } from "./schema/props";
import { decodeDataSourceVariable } from "./expression";

export type ContentBlockMdxTemplateDescriptor =
  | Readonly<{
      kind: "element";
      resolutionKey: `element:${string}`;
      label: string;
      tag: string;
      insertable: boolean;
    }>
  | Readonly<{
      kind: "component";
      resolutionKey: `component:${string}`;
      label: string;
      component: string;
      insertable: boolean;
    }>;

const defineMdxElementTemplate = <const Tag extends string>(
  tag: Tag,
  label: string,
  insertable: boolean
) =>
  ({
    kind: "element",
    resolutionKey: `element:${tag}`,
    label,
    tag,
    insertable,
  }) as const;

const defineMdxComponentTemplate = <const Component extends string>(
  component: Component,
  label: string,
  insertable: boolean
) =>
  ({
    kind: "component",
    resolutionKey: `component:${component}`,
    label,
    component,
    insertable,
  }) as const;

/**
 * Defines every MDX semantic that can resolve through a default Content Block
 * template, in its default display order. Structural and inline-only semantics
 * remain available for styling without being offered as standalone slash-menu
 * insertions.
 */
export const contentBlockMdxTemplateDescriptors = [
  defineMdxElementTemplate("p", "Paragraph", true),
  defineMdxElementTemplate("h1", "Heading 1", true),
  defineMdxElementTemplate("h2", "Heading 2", true),
  defineMdxElementTemplate("h3", "Heading 3", true),
  defineMdxElementTemplate("h4", "Heading 4", true),
  defineMdxElementTemplate("h5", "Heading 5", true),
  defineMdxElementTemplate("h6", "Heading 6", true),
  defineMdxElementTemplate("ul", "Unordered List", true),
  defineMdxElementTemplate("ol", "Ordered List", true),
  defineMdxElementTemplate("li", "List Item", false),
  defineMdxElementTemplate("a", "Link", true),
  defineMdxComponentTemplate("Image", "Image", true),
  defineMdxElementTemplate("hr", "Separator", true),
  defineMdxElementTemplate("br", "Line Break", false),
  defineMdxElementTemplate("blockquote", "Blockquote", true),
  defineMdxElementTemplate("em", "Emphasis", false),
  defineMdxElementTemplate("strong", "Strong", false),
  defineMdxElementTemplate("del", "Strikethrough", false),
  defineMdxElementTemplate("code", "Inline Code", false),
  defineMdxElementTemplate("input", "Task Checkbox", false),
  defineMdxElementTemplate("table", "Table", true),
  defineMdxElementTemplate("thead", "Table Head", false),
  defineMdxElementTemplate("tbody", "Table Body", false),
  defineMdxElementTemplate("tr", "Table Row", false),
  defineMdxElementTemplate("th", "Table Header", false),
  defineMdxElementTemplate("td", "Table Cell", false),
  defineMdxComponentTemplate("CodeText", "Code Block", true),
] as const satisfies readonly ContentBlockMdxTemplateDescriptor[];

export type ContentBlockMdxTemplateResolutionKey =
  (typeof contentBlockMdxTemplateDescriptors)[number]["resolutionKey"];

export const getContentBlockMdxTemplateDescriptor = (instance: {
  component: string;
  tag?: string;
}): ContentBlockMdxTemplateDescriptor | undefined =>
  contentBlockMdxTemplateDescriptors.find((descriptor) => {
    if (descriptor.kind === "component") {
      return descriptor.component === instance.component;
    }
    return descriptor.tag === instance.tag;
  });

/** Unknown, author-defined templates stay insertable. */
export const isContentBlockMdxTemplateInsertable = (instance: {
  component: string;
  tag?: string;
}) => getContentBlockMdxTemplateDescriptor(instance)?.insertable ?? true;

export const createContentBlockExternalContentIdentity = ({
  blockInstanceId,
  asset,
  renderScope,
}: {
  blockInstanceId: Instance["id"];
  asset: Readonly<{
    id: string;
    name: string;
    size: number;
    createdAt: string;
    updatedAt?: string;
    contentHash?: string | null;
  }>;
  renderScope: string;
}): ContentBlockExternalContentIdentity => ({
  blockInstanceId,
  assetId: asset.id,
  revision: createAssetContentRevision({
    storageName: asset.name,
    updatedAt: asset.updatedAt ?? asset.createdAt,
    size: asset.size,
    contentHash: asset.contentHash,
  }),
  contentRef: asset.name,
  format: "mdx",
  renderScope,
});

export const parseContentBlockSourceProp = (
  prop: Prop
): ContentBlockSource | undefined => {
  const result = contentBlockSourcePropSchema.safeParse(prop);
  if (result.success === false) {
    return;
  }
  if (result.data.type === "asset") {
    return { type: "asset", assetId: result.data.value };
  }
  if (result.data.type === "expression") {
    return { type: "expression", value: result.data.value };
  }
};

export const getContentBlockSource = ({
  blockInstanceId,
  props,
}: {
  blockInstanceId: Instance["id"];
  props: Iterable<Prop>;
}) => {
  let sourceProp: Prop | undefined;
  for (const prop of props) {
    if (
      prop.instanceId !== blockInstanceId ||
      prop.name !== contentBlockSourceProp
    ) {
      continue;
    }
    if (sourceProp !== undefined) {
      return;
    }
    sourceProp = prop;
  }
  return sourceProp === undefined
    ? undefined
    : parseContentBlockSourceProp(sourceProp);
};

const groupContentBlockSourceProps = (props: Iterable<Prop>) => {
  const sourcePropsByInstanceId = new Map<Instance["id"], Prop[]>();
  for (const prop of props) {
    if (prop.name !== contentBlockSourceProp) {
      continue;
    }
    const sourceProps = sourcePropsByInstanceId.get(prop.instanceId) ?? [];
    sourceProps.push(prop);
    sourcePropsByInstanceId.set(prop.instanceId, sourceProps);
  }
  return sourcePropsByInstanceId;
};

export const getContentBlockSources = ({
  instances,
  props,
}: {
  instances: Iterable<Instance>;
  props: Iterable<Prop>;
}) => {
  const sourcePropsByInstanceId = groupContentBlockSourceProps(props);
  const sources = new Map<Instance["id"], ContentBlockSource>();
  for (const instance of instances) {
    if (instance.component !== blockComponent) {
      continue;
    }
    const source = getContentBlockSource({
      blockInstanceId: instance.id,
      props: sourcePropsByInstanceId.get(instance.id) ?? [],
    });
    if (source !== undefined) {
      sources.set(instance.id, source);
    }
  }
  return sources;
};

export const isEqualContentBlockSource = (
  left: ContentBlockSource | undefined,
  right: ContentBlockSource | undefined
) => {
  if (left?.type !== right?.type) {
    return false;
  }
  if (left?.type === "asset" && right?.type === "asset") {
    return left.assetId === right.assetId;
  }
  return left?.type === "expression" && right?.type === "expression"
    ? left.value === right.value
    : left === undefined && right === undefined;
};

export const getStaticContentBlockSourceAssetId = (
  source: ContentBlockSource
) => {
  if (source.type === "asset") {
    return source.assetId;
  }
  const value = parseJsonExpression(source.value);
  return typeof value === "string" ? value : undefined;
};

export type WritableContentBlockDocumentBinding = Readonly<{
  type: "writable-content-block-document-binding";
  expression: DirectPathExpression;
  frontmatterPath: readonly [string, ...string[]];
}>;

const unsafeContentBlockDocumentPathSegments = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export const isSafeContentBlockDocumentPath = (path: readonly string[]) =>
  path.every(
    (segment) => unsafeContentBlockDocumentPathSegments.has(segment) === false
  );

/**
 * Recognizes a direct path into a Content Block document's frontmatter.
 * Arbitrary expressions remain read-only even when they reference frontmatter.
 */
export const getWritableContentBlockDocumentBinding = ({
  binding,
  documentDataSourceId,
}: {
  binding: ExpressionBinding;
  documentDataSourceId: string;
}): WritableContentBlockDocumentBinding | undefined => {
  if (binding.mode !== "readwrite") {
    return;
  }
  const directPathExpression = parseDirectPathExpression(binding.value);
  if (directPathExpression === undefined) {
    return;
  }
  const path = directPathExpression.path;
  if (
    decodeDataSourceVariable(path[0]) !== documentDataSourceId ||
    path[1] !== "frontmatter" ||
    path.length < 3 ||
    isSafeContentBlockDocumentPath(path.slice(2)) === false
  ) {
    return;
  }
  return {
    type: "writable-content-block-document-binding",
    expression: directPathExpression,
    frontmatterPath: path.slice(2) as [string, ...string[]],
  };
};

export type WritableContentBlockDocumentBindings = Readonly<{
  children: ReadonlyArray<{
    instanceId: Instance["id"];
    childIndex: number;
    binding: ExpressionChild;
    target: WritableContentBlockDocumentBinding;
  }>;
  props: ReadonlyArray<{
    propId: Prop["id"];
    binding: Extract<Prop, { type: "expression" }>;
    target: WritableContentBlockDocumentBinding;
  }>;
}>;

export const findWritableContentBlockDocumentBindings = ({
  instances,
  props,
  compatibility,
}: {
  instances: Pick<Instances, "get" | "values">;
  props: Pick<Props, "values">;
  /** Migrates compatible bindings created before explicit modes and sources existed. */
  compatibility?: "legacy";
}): WritableContentBlockDocumentBindings => {
  const isLegacyMigration = compatibility === "legacy";
  const propsByInstanceId = new Map<Instance["id"], Prop[]>();
  for (const prop of props.values()) {
    const instanceProps = propsByInstanceId.get(prop.instanceId) ?? [];
    instanceProps.push(prop);
    propsByInstanceId.set(prop.instanceId, instanceProps);
  }
  const result: {
    children: Array<WritableContentBlockDocumentBindings["children"][number]>;
    props: Array<WritableContentBlockDocumentBindings["props"][number]>;
  } = { children: [], props: [] };
  for (const block of instances.values()) {
    if (
      block.component !== blockComponent ||
      (isLegacyMigration === false &&
        getContentBlockSource({
          blockInstanceId: block.id,
          props: propsByInstanceId.get(block.id) ?? [],
        }) === undefined)
    ) {
      continue;
    }
    const documentProp = propsByInstanceId
      .get(block.id)
      ?.find(
        (prop) =>
          prop.name === contentBlockDocumentProp && prop.type === "parameter"
      );
    if (documentProp?.type !== "parameter") {
      continue;
    }
    const documentDataSourceId = documentProp.value;
    const visiting = new Set<Instance["id"]>();
    const visit = (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      if (
        instance === undefined ||
        visiting.has(instanceId) ||
        instance.component === blockTemplateComponent ||
        (instance.component === blockComponent && instance.id !== block.id)
      ) {
        return;
      }
      visiting.add(instanceId);
      for (const [childIndex, child] of instance.children.entries()) {
        if (child.type === "expression") {
          const binding =
            isLegacyMigration && child.mode === undefined
              ? { ...child, mode: "readwrite" as const }
              : child;
          const target = getWritableContentBlockDocumentBinding({
            binding,
            documentDataSourceId,
          });
          if (target !== undefined) {
            result.children.push({
              instanceId: instance.id,
              childIndex,
              binding: child,
              target,
            });
          }
        }
        if (child.type === "id") {
          visit(child.value);
        }
      }
      for (const prop of propsByInstanceId.get(instance.id) ?? []) {
        if (prop.type !== "expression") {
          continue;
        }
        const binding =
          isLegacyMigration && prop.mode === undefined
            ? { ...prop, mode: "readwrite" as const }
            : prop;
        const target = getWritableContentBlockDocumentBinding({
          binding,
          documentDataSourceId,
        });
        if (target !== undefined) {
          result.props.push({ propId: prop.id, binding: prop, target });
        }
      }
      visiting.delete(instanceId);
    };
    visit(block.id);
  }
  return result;
};

export const findContentBlockTemplateContainers = ({
  blockInstance,
  instances,
}: {
  blockInstance: Instance;
  instances: Pick<Instances, "get">;
}) => {
  if (blockInstance.component !== blockComponent) {
    return [];
  }
  return (blockInstance.children ?? []).flatMap((child) => {
    const instance =
      child.type === "id" ? instances.get(child.value) : undefined;
    return instance?.component === blockTemplateComponent ? [instance] : [];
  });
};

export const findContentBlockBodyContainers = ({
  blockInstance,
  instances,
}: {
  blockInstance: Instance;
  instances: Pick<Instances, "get">;
}) => {
  return findContentBlockBodyContainerPaths({
    blockInstance,
    instances,
  }).map((path) => path.at(-1)!);
};

/** Finds descendant paths from a Content Block child to each Body outlet. */
export const findContentBlockBodyContainerPaths = ({
  blockInstance,
  instances,
}: {
  blockInstance: Instance;
  instances: Pick<Instances, "get">;
}) => {
  if (blockInstance.component !== blockComponent) {
    return [];
  }
  const paths: Instance[][] = [];
  const visiting = new Set<Instance["id"]>();
  const visit = (instance: Instance, path: Instance[]) => {
    if (visiting.has(instance.id)) {
      return;
    }
    if (instance.component === blockBodyComponent) {
      paths.push([...path, instance]);
      return;
    }
    if (
      instance.component === blockTemplateComponent ||
      instance.component === blockComponent
    ) {
      return;
    }
    visiting.add(instance.id);
    for (const child of instance.children ?? []) {
      const childInstance =
        child.type === "id" ? instances.get(child.value) : undefined;
      if (childInstance !== undefined) {
        visit(childInstance, [...path, instance]);
      }
    }
    visiting.delete(instance.id);
  };
  for (const child of blockInstance.children ?? []) {
    const childInstance =
      child.type === "id" ? instances.get(child.value) : undefined;
    if (childInstance !== undefined) {
      visit(childInstance, []);
    }
  }
  return paths;
};

/**
 * Returns the container whose children represent document.body. Existing
 * Content Blocks without an explicit Body outlet keep using the block itself.
 */
export const getContentBlockBodyContainer = ({
  blockInstance,
  instances,
}: {
  blockInstance: Instance;
  instances: Pick<Instances, "get">;
}) => {
  const bodies = findContentBlockBodyContainers({ blockInstance, instances });
  if (bodies.length > 1) {
    return;
  }
  return bodies[0] ?? blockInstance;
};

export type ContentBlockSourceIntegrityIssue =
  | {
      type: "duplicateContentBlockSource";
      blockInstanceId: Instance["id"];
      propIds: Prop["id"][];
    }
  | {
      type: "invalidContentBlockSource";
      blockInstanceId: Instance["id"];
      propId: Prop["id"];
      propType: Prop["type"];
    }
  | {
      type: "missingContentBlockSourceAsset";
      blockInstanceId: Instance["id"];
      propId: Prop["id"];
      assetId: Asset["id"];
    }
  | {
      type: "incompatibleContentBlockSourceAsset";
      blockInstanceId: Instance["id"];
      propId: Prop["id"];
      assetId: Asset["id"];
      assetName: Asset["name"];
    };

export const formatContentBlockSourceIntegrityIssue = (
  issue: ContentBlockSourceIntegrityIssue
) => {
  if (issue.type === "duplicateContentBlockSource") {
    return `Content Block "${issue.blockInstanceId}" has multiple source props: ${issue.propIds.map((id) => `"${id}"`).join(", ")}.`;
  }
  if (issue.type === "invalidContentBlockSource") {
    return `Content Block source prop "${issue.propId}" must use an Asset or expression binding.`;
  }
  if (issue.type === "missingContentBlockSourceAsset") {
    return `Content Block source prop "${issue.propId}" references missing Asset "${issue.assetId}".`;
  }
  return `Content Block source prop "${issue.propId}" references Asset "${issue.assetId}" (${issue.assetName}), which is not an MDX file.`;
};

export const getContentBlockSourceIntegrityIssues = ({
  instances,
  props,
  assets,
}: {
  instances: Iterable<Instance>;
  props: Iterable<Prop>;
  assets?: Iterable<Asset>;
}): ContentBlockSourceIntegrityIssue[] => {
  const sourcePropsByInstanceId = groupContentBlockSourceProps(props);
  const assetsById =
    assets === undefined
      ? undefined
      : new Map(Array.from(assets, (asset) => [asset.id, asset]));
  const issues: ContentBlockSourceIntegrityIssue[] = [];
  for (const instance of instances) {
    if (instance.component !== blockComponent) {
      continue;
    }
    const sourceProps = sourcePropsByInstanceId.get(instance.id) ?? [];
    if (sourceProps.length > 1) {
      issues.push({
        type: "duplicateContentBlockSource",
        blockInstanceId: instance.id,
        propIds: sourceProps.map((prop) => prop.id),
      });
      continue;
    }
    const [prop] = sourceProps;
    if (prop === undefined) {
      continue;
    }
    const source = parseContentBlockSourceProp(prop);
    if (source === undefined) {
      issues.push({
        type: "invalidContentBlockSource",
        blockInstanceId: instance.id,
        propId: prop.id,
        propType: prop.type,
      });
      continue;
    }
    if (source.type !== "asset" || assetsById === undefined) {
      continue;
    }
    const asset = assetsById.get(source.assetId);
    if (asset === undefined) {
      issues.push({
        type: "missingContentBlockSourceAsset",
        blockInstanceId: instance.id,
        propId: prop.id,
        assetId: source.assetId,
      });
      continue;
    }
    if (isMdxFileAsset(asset) === false) {
      issues.push({
        type: "incompatibleContentBlockSourceAsset",
        blockInstanceId: instance.id,
        propId: prop.id,
        assetId: asset.id,
        assetName: asset.name,
      });
    }
  }
  return issues;
};

export const allocateUniqueContentBlockTemplateName = ({
  name,
  existingNames,
}: {
  name: string;
  existingNames: ReadonlySet<string>;
}) => {
  const normalizedName = name.trim();
  if (existingNames.has(normalizedName) === false) {
    return normalizedName;
  }

  const suffixMatch = /^(.*) (\d+)$/.exec(normalizedName);
  let baseName = normalizedName;
  let index = 2;
  if (suffixMatch !== null) {
    const suffix = Number(suffixMatch[2]);
    if (suffix >= 2 && Number.isSafeInteger(suffix + 1)) {
      baseName = suffixMatch[1];
      index = suffix + 1;
    }
  }
  let candidate = `${baseName} ${index}`;
  while (existingNames.has(candidate)) {
    if (Number.isSafeInteger(index + 1) === false) {
      baseName = candidate;
      index = 2;
    } else {
      index += 1;
    }
    candidate = `${baseName} ${index}`;
  }
  return candidate;
};
