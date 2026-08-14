import { getAssetDisplayNameParts } from "./assets";
import { blockComponent } from "./core-metas";
import {
  contentBlockSourceProp,
  contentBlockSourcePropSchema,
  type ContentBlockSource,
} from "./schema/content-block";
import type { Asset } from "./schema/assets";
import type { Instance } from "./schema/instances";
import type { Prop } from "./schema/props";

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
  const sourcePropsByInstanceId = new Map<Instance["id"], Prop[]>();
  for (const prop of props) {
    if (prop.name !== contentBlockSourceProp) {
      continue;
    }
    const sourceProps = sourcePropsByInstanceId.get(prop.instanceId) ?? [];
    sourceProps.push(prop);
    sourcePropsByInstanceId.set(prop.instanceId, sourceProps);
  }
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
    if (
      asset.type !== "file" ||
      getAssetDisplayNameParts(asset).ext.toLowerCase() !== "mdx"
    ) {
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
