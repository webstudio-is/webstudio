import { createAssetContentRevision, isMdxFileAsset } from "./assets";
import {
  parseJsonExpression,
  parseStaticMemberPath,
} from "@webstudio-is/expression";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
} from "./core-metas";
import {
  contentBlockSourceProp,
  contentBlockSourcePropSchema,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSource,
} from "./schema/content-block";
import type { Asset } from "./schema/assets";
import type { Instance, Instances } from "./schema/instances";
import type { Prop } from "./schema/props";
import { decodeDataSourceVariable } from "./expression";

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

/** Returns the frontmatter path referenced by a direct document binding. */
export const getContentBlockDocumentBindingPath = ({
  expression,
  documentDataSourceId,
}: {
  expression: string;
  documentDataSourceId: string;
}) => {
  const path = parseStaticMemberPath(expression);
  if (
    path === undefined ||
    decodeDataSourceVariable(path[0]) !== documentDataSourceId ||
    path[1] !== "frontmatter" ||
    path.length < 3
  ) {
    return;
  }
  return path.slice(2);
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
