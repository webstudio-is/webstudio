import {
  getContentModeEditableInstanceRootIds,
  getContentModeFrontmatterBoundTargets,
  getContentModePropEligibility,
  type ContentModeCapabilities,
} from "./content-mode-capabilities";
import type { Patch } from "immer";
import { applyBuilderNamespacePatches } from "../state/patch";
import { mergeBuilderPatchChanges } from "./mutation";
import equal from "fast-deep-equal";
import { isRecord } from "../shared/type-utils";
import {
  instance,
  instanceChild,
  prop,
  styleDecl,
  styleSource,
  styleSourceSelection,
  pagePath,
  blockComponent,
  blockTemplateComponent,
  findContentBlockBodyContainers,
  getHtmlTagsFromProps,
  isPathnamePattern,
  getStyleDeclKey,
  type Instance,
  type Prop,
  type Props,
  type StyleDecl,
  type StyleSource,
} from "@webstudio-is/sdk";

export type ContentModePatchTransaction = {
  id?: string;
  payload: Array<{
    namespace: string;
    patches: Patch[];
  }>;
};

type ContentModeTransactionContext = {
  capabilities: ContentModeCapabilities;
  initialContentRootIds: Set<Instance["id"]>;
  initialEditableInstanceIds: Set<Instance["id"]>;
  initialEditableInstanceRootIds: Map<Instance["id"], Instance["id"]>;
  initialBlockTemplateChildIdsByInstanceId: Map<
    Instance["id"],
    Set<Instance["id"]>
  >;
  addedInstanceIds: Set<Instance["id"]>;
  removedEditableInstanceIds: Set<Instance["id"]>;
  addedPageIds: Set<string>;
  addedLocalStyleSourceIds: Set<StyleSource["id"]>;
  removedLocalStyleSourceIds: Set<StyleSource["id"]>;
  selectedLocalStyleSourceIds: Set<StyleSource["id"]>;
  styledLocalStyleSourceIds: Set<StyleSource["id"]>;
  editableInstanceIds: Set<Instance["id"]>;
  copiedTemplateProps: Map<Patch, Prop>;
};

export type ContentModeValidationResult =
  | { success: true }
  | { success: false; error: string };

export type AppliedContentModeTransactionResult =
  | { success: true; capabilities: ContentModeCapabilities }
  | { success: false; error: string };

const contentModePageFields = new Set(["name", "path", "title"]);

export const isContentModePagePath = (value: unknown) =>
  typeof value === "string" &&
  (value === "" || pagePath.safeParse(value).success) &&
  isPathnamePattern(value) === false &&
  value.includes(":") === false &&
  value.includes("*") === false;

const isString = (value: unknown) => typeof value === "string";
const isOptionalString = (value: unknown) =>
  value === undefined || typeof value === "string";

const isContentModeCustomMeta = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      isRecord(item) &&
      typeof item.property === "string" &&
      typeof item.content === "string"
  );

const contentModePageMetaValidators: Record<
  string,
  (value: unknown) => boolean
> = {
  description: isString,
  title: isString,
  excludePageFromSearch: isString,
  language: isString,
  socialImageAssetId: isOptionalString,
  socialImageUrl: isOptionalString,
  custom: isContentModeCustomMeta,
};

export const contentModePageMetaFields = new Set(
  Object.keys(contentModePageMetaValidators)
);

const isContentModePageMetaValue = (field: string, value: unknown) => {
  return contentModePageMetaValidators[field]?.(value) ?? false;
};

const isContentModeCustomMetaPatch = (patch: Patch) => {
  const [, , , , index, field] = patch.path;
  if (typeof index !== "number") {
    return false;
  }

  if (patch.path.length === 5) {
    if (patch.op === "remove") {
      return true;
    }
    return (
      (patch.op === "add" || patch.op === "replace") &&
      isRecord(patch.value) &&
      typeof patch.value.property === "string" &&
      typeof patch.value.content === "string"
    );
  }

  if (patch.path.length !== 6) {
    return false;
  }
  if (field !== "property" && field !== "content") {
    return false;
  }
  return patch.op === "replace" && typeof patch.value === "string";
};

const getBlockTemplateChildIdsByInstanceId = (
  instances: Map<Instance["id"], Instance>
) => {
  const childIdsByInstanceId = new Map<Instance["id"], Set<Instance["id"]>>();
  for (const instance of instances.values()) {
    const blockTemplateChildIds = new Set<Instance["id"]>();
    for (const child of instance.children ?? []) {
      if (child.type !== "id") {
        continue;
      }
      if (instances.get(child.value)?.component === blockTemplateComponent) {
        blockTemplateChildIds.add(child.value);
      }
    }
    if (blockTemplateChildIds.size > 0) {
      childIdsByInstanceId.set(instance.id, blockTemplateChildIds);
    }
  }
  return childIdsByInstanceId;
};

// Decide explicitly when a new Prop type is added whether its template default
// can be retained without carrying a reference or behavior into content mode.
export const isContentModeTemplateDefaultPropType = (
  propType: Prop["type"]
) => {
  switch (propType) {
    case "string":
    case "number":
    case "boolean":
    case "json":
    case "string[]":
      return true;
    case "asset":
    case "page":
    case "parameter":
    case "resource":
    case "expression":
    case "action":
    case "animationAction":
      return false;
    default:
      propType satisfies never;
      return false;
  }
};

const getMatchingTemplateInstanceIds = ({
  sourceId,
  targetId,
  originalInstances,
  instances,
  addedInstanceIds,
}: {
  sourceId: Instance["id"];
  targetId: Instance["id"];
  originalInstances: Map<Instance["id"], Instance>;
  instances: Map<Instance["id"], Instance>;
  addedInstanceIds: Set<Instance["id"]>;
}) => {
  const sourceIdsByTargetId = new Map<Instance["id"], Instance["id"]>();
  const matchTree = (sourceId: Instance["id"], targetId: Instance["id"]) => {
    if (addedInstanceIds.has(targetId) === false) {
      return false;
    }
    const source = originalInstances.get(sourceId);
    const target = instances.get(targetId);
    if (source === undefined || target === undefined) {
      return false;
    }
    const { id: _sourceId, children: sourceChildren, ...sourceFields } = source;
    const { id: _targetId, children: targetChildren, ...targetFields } = target;
    if (
      equal(sourceFields, targetFields) === false ||
      sourceChildren.length !== targetChildren.length
    ) {
      return false;
    }
    sourceIdsByTargetId.set(targetId, sourceId);
    for (let index = 0; index < sourceChildren.length; index += 1) {
      const sourceChild = sourceChildren[index];
      const targetChild = targetChildren[index];
      if (sourceChild.type === "id" && targetChild.type === "id") {
        if (matchTree(sourceChild.value, targetChild.value) === false) {
          return false;
        }
      } else if (equal(sourceChild, targetChild) === false) {
        return false;
      }
    }
    return true;
  };

  return matchTree(sourceId, targetId) ? sourceIdsByTargetId : undefined;
};

const getCopiedTemplateProps = ({
  originalInstances,
  originalProps,
  instances,
  addedInstanceIds,
  editableInstanceRootIds,
  transaction,
}: {
  originalInstances: Map<Instance["id"], Instance>;
  originalProps: Props;
  instances: Map<Instance["id"], Instance>;
  addedInstanceIds: Set<Instance["id"]>;
  editableInstanceRootIds: Map<Instance["id"], Instance["id"]>;
  transaction: ContentModePatchTransaction;
}) => {
  // Approve individual patches so later validation does not match props again.
  const copiedProps = new Map<Patch, Prop>();
  if (addedInstanceIds.size === 0) {
    return copiedProps;
  }

  // A newly inserted tree may carry design-only props only when it is an exact
  // copy of an authored template in the same Content Block.
  const templateRootsByContentRootId = new Map<string, string[]>();
  for (const block of originalInstances.values()) {
    if (block.component !== blockComponent) {
      continue;
    }
    const bodyContainers = findContentBlockBodyContainers({
      blockInstance: block,
      instances: originalInstances,
    });
    const contentRootId =
      bodyContainers.length === 1 ? bodyContainers[0].id : block.id;
    for (const child of block.children ?? []) {
      if (child.type !== "id") {
        continue;
      }
      const container = originalInstances.get(child.value);
      if (container?.component !== blockTemplateComponent) {
        continue;
      }
      const roots = templateRootsByContentRootId.get(contentRootId) ?? [];
      roots.push(
        ...container.children.flatMap((entry) =>
          entry.type === "id" ? [entry.value] : []
        )
      );
      templateRootsByContentRootId.set(contentRootId, roots);
    }
  }

  const nestedAddedIds = new Set(
    Array.from(addedInstanceIds).flatMap(
      (id) =>
        instances
          .get(id)
          ?.children.flatMap((child) =>
            child.type === "id" && addedInstanceIds.has(child.value)
              ? [child.value]
              : []
          ) ?? []
    )
  );
  const addedProps = transaction.payload.flatMap((change) =>
    change.namespace === "props"
      ? change.patches.flatMap((patch) => {
          if (patch.op !== "add" || patch.path.length !== 1) {
            return [];
          }
          const parsed = prop.safeParse(patch.value);
          return parsed.success ? [{ patch, prop: parsed.data }] : [];
        })
      : []
  );
  const sourcePropsByInstanceId = new Map<string, Prop[]>();
  for (const sourceProp of originalProps.values()) {
    const sourceProps =
      sourcePropsByInstanceId.get(sourceProp.instanceId) ?? [];
    sourceProps.push(sourceProp);
    sourcePropsByInstanceId.set(sourceProp.instanceId, sourceProps);
  }

  for (const targetRootId of addedInstanceIds) {
    if (nestedAddedIds.has(targetRootId)) {
      continue;
    }
    const contentRootId = editableInstanceRootIds.get(targetRootId);
    for (const sourceRootId of templateRootsByContentRootId.get(
      contentRootId ?? ""
    ) ?? []) {
      const sourceIdsByTargetId = getMatchingTemplateInstanceIds({
        sourceId: sourceRootId,
        targetId: targetRootId,
        originalInstances,
        instances,
        addedInstanceIds,
      });
      if (sourceIdsByTargetId === undefined) {
        continue;
      }
      const allAddedPropsMatch = addedProps.every(({ prop: addedProp }) => {
        const sourceId = sourceIdsByTargetId.get(addedProp.instanceId);
        if (sourceId === undefined) {
          return true;
        }
        return (sourcePropsByInstanceId.get(sourceId) ?? []).some(
          (sourceProp) =>
            sourceProp.name === addedProp.name &&
            sourceProp.type === addedProp.type &&
            sourceProp.required === addedProp.required &&
            equal(sourceProp.value, addedProp.value)
        );
      });
      if (allAddedPropsMatch === false) {
        continue;
      }
      for (const { patch, prop } of addedProps) {
        if (
          sourceIdsByTargetId.has(prop.instanceId) &&
          prop.id === patch.path[0] &&
          originalProps.has(prop.id) === false &&
          isContentModeTemplateDefaultPropType(prop.type)
        ) {
          copiedProps.set(patch, prop);
        }
      }
      break;
    }
  }
  return copiedProps;
};

const isContentModePropTransition = ({
  capabilities,
  editableInstanceIds,
  expectedPropId,
  value,
  nextProps = capabilities.props,
}: {
  capabilities: ContentModeCapabilities;
  editableInstanceIds: ReadonlySet<Instance["id"]>;
  expectedPropId: Prop["id"];
  value: unknown;
  nextProps?: Props;
}) => {
  const parsedProp = prop.safeParse(value);
  if (parsedProp.success === false) {
    return false;
  }

  if (parsedProp.data.id !== expectedPropId) {
    return false;
  }
  const instance = capabilities.instances.get(parsedProp.data.instanceId);
  if (instance === undefined) {
    return false;
  }
  if (editableInstanceIds.has(instance.id) === false) {
    return false;
  }

  const existingProp = capabilities.props.get(expectedPropId);
  if (
    existingProp === undefined &&
    Array.from(capabilities.props.values()).some(
      (prop) =>
        prop.instanceId === instance.id &&
        prop.name === parsedProp.data.name &&
        nextProps.has(prop.id)
    )
  ) {
    return false;
  }
  if (existingProp !== undefined) {
    if (
      existingProp.instanceId !== instance.id ||
      existingProp.name !== parsedProp.data.name ||
      (capabilities.editablePropIds.has(expectedPropId) === false &&
        getContentModePropEligibility({
          capabilities,
          instance,
          prop: existingProp,
        }).editable === false &&
        !(
          (existingProp.type === "number" || existingProp.type === "asset") &&
          parsedProp.data.type === "asset"
        ))
    ) {
      return false;
    }
  }

  return getContentModePropEligibility({
    capabilities,
    instance,
    prop: parsedProp.data,
    props: nextProps,
  }).editable;
};

const validatePropPatches = (
  context: ContentModeTransactionContext,
  patches: Patch[]
): ContentModeValidationResult => {
  const { capabilities } = context;
  const copiedPropIds = new Set<string>();
  let nextProps: Props;
  try {
    nextProps = applyBuilderNamespacePatches(capabilities.props, patches);
  } catch {
    return {
      success: false,
      error: 'Namespace "props" is not editable in content mode.',
    };
  }
  for (const patch of patches) {
    const [propId, field] = patch.path;
    if (typeof propId !== "string") {
      return {
        success: false,
        error: "Prop patch is not editable in content mode.",
      };
    }
    const before = capabilities.props.get(propId);
    const after = nextProps.get(propId);
    const removedWithInstance =
      before !== undefined &&
      context.removedEditableInstanceIds.has(before.instanceId);
    const removesProp = patch.path.length === 1 && patch.op === "remove";
    const replacesProp =
      patch.path.length === 1 && (patch.op === "add" || patch.op === "replace");
    const changesValue =
      patch.path.length === 2 &&
      field === "value" &&
      (patch.op === "add" || patch.op === "replace") &&
      capabilities.editablePropIds.has(propId);
    const copiedProp = context.copiedTemplateProps.get(patch);
    if (
      after === undefined &&
      removesProp &&
      (removedWithInstance || capabilities.editablePropIds.has(propId))
    ) {
      capabilities.editablePropIds.delete(propId);
      continue;
    }
    if (
      after !== undefined &&
      (replacesProp || changesValue) &&
      isContentModePropTransition({
        capabilities,
        editableInstanceIds: context.editableInstanceIds,
        expectedPropId: propId,
        value: after,
        nextProps,
      })
    ) {
      capabilities.editablePropIds.add(propId);
      continue;
    }
    if (
      before === undefined &&
      copiedProp !== undefined &&
      equal(copiedProp, after) &&
      copiedPropIds.has(propId) === false
    ) {
      copiedPropIds.add(propId);
      continue;
    }
    return {
      success: false,
      error: `Prop "${propId}" is not editable in content mode.`,
    };
  }
  capabilities.props = nextProps;
  return { success: true };
};

const isContentModePagePatch = (patch: Patch) => {
  const [collection, pageId, field, metaField] = patch.path;
  if (
    collection !== "pages" ||
    typeof pageId !== "string" ||
    typeof field !== "string"
  ) {
    return false;
  }

  // Page patches are scoped as ["pages", pageId, field].
  // Editors can change only a small set of top-level editorial fields.
  // Whole-page add/replace/remove patches like ["pages", pageId] stay build-only
  // because they can change rootInstanceId, system data sources, folders, etc.
  if (patch.path.length === 3 && contentModePageFields.has(field)) {
    if (field === "path") {
      return isContentModePagePath(patch.value);
    }
    return typeof patch.value === "string";
  }

  // Meta field patches are scoped as ["pages", pageId, "meta", metaField].
  // Keep this list explicit: page meta also contains auth, redirects, status,
  // document type, and raw content settings that are not content editing.
  if (field !== "meta" || typeof metaField !== "string") {
    return false;
  }

  if (metaField === "custom" && patch.path.length > 4) {
    return isContentModeCustomMetaPatch(patch);
  }

  if (
    patch.path.length !== 4 ||
    contentModePageMetaFields.has(metaField) === false
  ) {
    return false;
  }

  if (patch.op === "remove") {
    return true;
  }

  return isContentModePageMetaValue(metaField, patch.value);
};

const hasOnlyContentModePageMeta = (meta: Record<string, unknown>) => {
  for (const [field, value] of Object.entries(meta)) {
    if (contentModePageMetaFields.has(field) === false) {
      return false;
    }
    if (isContentModePageMetaValue(field, value) === false) {
      return false;
    }
  }
  return true;
};

const isInstanceChild = (value: unknown) =>
  instanceChild.safeParse(value).success;

const isInstanceChildren = (value: unknown) =>
  Array.isArray(value) && value.every(isInstanceChild);

const isEditableChildrenPatch = (patch: Patch) => {
  if (
    patch.path.length === 2 &&
    (patch.op === "add" || patch.op === "replace")
  ) {
    return isInstanceChildren(patch.value);
  }
  if (patch.path.length !== 3 || typeof patch.path[2] !== "number") {
    return false;
  }
  if (patch.op === "remove") {
    return true;
  }
  if (patch.op === "add" || patch.op === "replace") {
    return isInstanceChild(patch.value);
  }
  return false;
};

const isAllowedContentModeChildReference = (
  context: ContentModeTransactionContext,
  instanceId: Instance["id"],
  child: Instance["children"][number]
) =>
  child.type !== "id" ||
  context.initialEditableInstanceIds.has(child.value) ||
  context.addedInstanceIds.has(child.value) ||
  context.initialBlockTemplateChildIdsByInstanceId
    .get(instanceId)
    ?.has(child.value) === true;

const isAllowedContentModeChildrenPatch = (
  context: ContentModeTransactionContext,
  patch: Patch
) => {
  const [instanceId] = patch.path;
  if (typeof instanceId !== "string") {
    return false;
  }
  if (patch.op === "remove") {
    return true;
  }
  if (patch.path.length === 2) {
    if (isInstanceChildren(patch.value) === false) {
      return false;
    }
    const children = patch.value as Instance["children"];
    return children.every((child) =>
      isAllowedContentModeChildReference(context, instanceId, child)
    );
  }
  return (
    isInstanceChild(patch.value) &&
    isAllowedContentModeChildReference(context, instanceId, patch.value)
  );
};

const hasOnlyAllowedContentModeChildReferences = (
  context: ContentModeTransactionContext,
  instance: Instance
) =>
  (instance.children ?? []).every((child) =>
    isAllowedContentModeChildReference(context, instance.id, child)
  );

const hasSameInstanceMetadata = (left: Instance, right: Instance) =>
  left.type === right.type &&
  left.id === right.id &&
  left.component === right.component &&
  left.tag === right.tag &&
  left.name === right.name &&
  left.label === right.label;

const hasOnlyKeys = (value: Record<string, unknown>, keys: Set<string>) => {
  for (const key of Object.keys(value)) {
    if (keys.has(key) === false) {
      return false;
    }
  }
  return true;
};

const contentModePageCreateFields = new Set([
  "id",
  "name",
  "path",
  "title",
  "rootInstanceId",
  "meta",
]);

const hasOnlyAddedInstancesInSubtree = (
  context: ContentModeTransactionContext,
  rootInstanceId: Instance["id"]
) => {
  const visited = new Set<Instance["id"]>();
  const visit = (instanceId: Instance["id"]): boolean => {
    if (visited.has(instanceId)) {
      return true;
    }
    if (context.addedInstanceIds.has(instanceId) === false) {
      return false;
    }
    visited.add(instanceId);
    const instance = context.capabilities.instances.get(instanceId);
    if (instance === undefined) {
      return false;
    }
    for (const child of instance.children ?? []) {
      if (child.type === "id" && visit(child.value) === false) {
        return false;
      }
    }
    return true;
  };
  return visit(rootInstanceId);
};

const validatePagePatch = (
  context: ContentModeTransactionContext,
  patch: Patch
): ContentModeValidationResult => {
  if (isContentModePagePatch(patch)) {
    return { success: true };
  }

  const [collection, pageId] = patch.path;
  if (
    collection === "pages" &&
    typeof pageId === "string" &&
    patch.path.length === 2 &&
    patch.op === "add"
  ) {
    const page = patch.value;
    if (
      isRecord(page) &&
      page.id === pageId &&
      typeof page.name === "string" &&
      isContentModePagePath(page.path) &&
      typeof page.title === "string" &&
      typeof page.rootInstanceId === "string" &&
      isRecord(page.meta) &&
      hasOnlyKeys(page, contentModePageCreateFields) &&
      context.addedInstanceIds.has(page.rootInstanceId) &&
      hasOnlyAddedInstancesInSubtree(context, page.rootInstanceId) &&
      hasOnlyContentModePageMeta(page.meta)
    ) {
      context.addedPageIds.add(pageId);
      context.capabilities.contentRootIds.add(page.rootInstanceId);
      return { success: true };
    }
  }

  if (
    collection === "folders" &&
    typeof pageId === "string" &&
    patch.path[2] === "children" &&
    patch.path.length === 4 &&
    patch.op === "add" &&
    typeof patch.value === "string" &&
    context.addedPageIds.has(patch.value)
  ) {
    return { success: true };
  }

  return {
    success: false,
    error: "Page patch is not editable in content mode.",
  };
};

const isPageFolderChildPatch = (patch: Patch) => {
  const [collection, folderId, field] = patch.path;
  return (
    collection === "folders" &&
    typeof folderId === "string" &&
    field === "children"
  );
};

const validatePagePatches = (
  context: ContentModeTransactionContext,
  patches: Patch[]
): ContentModeValidationResult => {
  for (const patch of patches) {
    if (isPageFolderChildPatch(patch)) {
      continue;
    }
    const result = validatePagePatch(context, patch);
    if (result.success === false) {
      return result;
    }
  }

  for (const patch of patches) {
    if (isPageFolderChildPatch(patch) === false) {
      continue;
    }
    const result = validatePagePatch(context, patch);
    if (result.success === false) {
      return result;
    }
  }

  return { success: true };
};

const validateInstancePatch = (
  context: ContentModeTransactionContext,
  patch: Patch
): ContentModeValidationResult => {
  const [instanceId, field] = patch.path;
  if (typeof instanceId !== "string") {
    return {
      success: false,
      error: "Instance patch is not editable in content mode.",
    };
  }

  if (patch.op === "remove" && patch.path.length === 1) {
    if (context.initialContentRootIds.has(instanceId)) {
      return {
        success: false,
        error: "Instance patch is not editable in content mode.",
      };
    }
    return context.removedEditableInstanceIds.has(instanceId) ||
      context.editableInstanceIds.has(instanceId)
      ? { success: true }
      : {
          success: false,
          error: "Instance patch is outside content roots.",
        };
  }

  if (
    field === "children" &&
    isEditableChildrenPatch(patch) &&
    isAllowedContentModeChildrenPatch(context, patch)
  ) {
    return context.editableInstanceIds.has(instanceId)
      ? { success: true }
      : {
          success: false,
          error: "Instance patch is outside content roots.",
        };
  }

  if (patch.path.length === 1 && patch.op === "replace") {
    const parsedInstance = instance.safeParse(patch.value);
    if (
      parsedInstance.success &&
      parsedInstance.data.id === instanceId &&
      hasOnlyAllowedContentModeChildReferences(context, parsedInstance.data)
    ) {
      return context.editableInstanceIds.has(instanceId)
        ? { success: true }
        : {
            success: false,
            error: "Instance patch is outside content roots.",
          };
    }
  }

  if (
    patch.path.length === 1 &&
    patch.op === "add" &&
    context.addedInstanceIds.has(instanceId)
  ) {
    const parsedInstance = instance.safeParse(patch.value);
    if (
      parsedInstance.success &&
      parsedInstance.data.id === instanceId &&
      context.editableInstanceIds.has(instanceId) &&
      hasOnlyAllowedContentModeChildReferences(context, parsedInstance.data)
    ) {
      return { success: true };
    }
    if (parsedInstance.success && parsedInstance.data.id === instanceId) {
      return {
        success: false,
        error: "Instance patch is outside content roots.",
      };
    }
  }

  return {
    success: false,
    error: "Instance patch is not editable in content mode.",
  };
};

const validateInstancePatchShape = (
  capabilities: ContentModeCapabilities,
  patch: Patch
): ContentModeValidationResult => {
  const [instanceId, field] = patch.path;
  if (typeof instanceId !== "string") {
    return {
      success: false,
      error: "Instance patch is not editable in content mode.",
    };
  }

  if (patch.op === "remove" && patch.path.length === 1) {
    return { success: true };
  }

  if (field === "children" && isEditableChildrenPatch(patch)) {
    return { success: true };
  }

  if (patch.path.length === 1 && patch.op === "replace") {
    const parsedInstance = instance.safeParse(patch.value);
    const currentInstance = capabilities.instances.get(instanceId);
    if (
      parsedInstance.success &&
      parsedInstance.data.id === instanceId &&
      currentInstance !== undefined &&
      hasSameInstanceMetadata(currentInstance, parsedInstance.data)
    ) {
      return { success: true };
    }
  }

  if (
    patch.path.length === 1 &&
    patch.op === "add" &&
    capabilities.instances.has(instanceId) === false
  ) {
    const parsedInstance = instance.safeParse(patch.value);
    if (parsedInstance.success && parsedInstance.data.id === instanceId) {
      return { success: true };
    }
  }

  return {
    success: false,
    error: "Instance patch is not editable in content mode.",
  };
};

const validateStyleSourceSelectionPatch = (
  context: ContentModeTransactionContext,
  patch: Patch
): ContentModeValidationResult => {
  const { capabilities } = context;
  const [instanceId] = patch.path;
  if (typeof instanceId !== "string") {
    return {
      success: false,
      error: "Style source selection patch is not editable in content mode.",
    };
  }

  if (
    patch.op === "remove" &&
    patch.path.length === 1 &&
    context.removedEditableInstanceIds.has(instanceId)
  ) {
    return { success: true };
  }

  if (context.editableInstanceIds.has(instanceId) === false) {
    return {
      success: false,
      error: "Style source selection patch is outside content roots.",
    };
  }
  if (context.addedInstanceIds.has(instanceId) === false) {
    return {
      success: false,
      error:
        "Style source selections are editable only for new content instances.",
    };
  }

  if (
    patch.path.length !== 1 ||
    (patch.op !== "add" && patch.op !== "replace")
  ) {
    return {
      success: false,
      error: "Style source selection patch is not editable in content mode.",
    };
  }

  const selection = styleSourceSelection.safeParse(patch.value);
  if (selection.success === false) {
    return {
      success: false,
      error: "Style source selection patch is not editable in content mode.",
    };
  }
  if (selection.data.instanceId !== instanceId) {
    return {
      success: false,
      error: "Style source selection patch is not editable in content mode.",
    };
  }

  for (const styleSourceId of selection.data.values) {
    const styleSource = capabilities.styleSources.get(styleSourceId);
    const isAllowedExistingStyleSource = styleSource?.type === "token";
    const isAllowedTransactionStyleSource =
      context.addedLocalStyleSourceIds.has(styleSourceId);
    if (
      isAllowedExistingStyleSource === false &&
      isAllowedTransactionStyleSource === false
    ) {
      return {
        success: false,
        error:
          "Only token or transaction-local style sources are editable in content mode.",
      };
    }
    if (isAllowedTransactionStyleSource) {
      context.selectedLocalStyleSourceIds.add(styleSourceId);
    }
  }

  return { success: true };
};

const addRemovedInstanceLocalStyleSources = (
  context: ContentModeTransactionContext,
  instanceId: Instance["id"]
) => {
  const selection = context.capabilities.styleSourceSelections.get(instanceId);
  if (selection === undefined) {
    return;
  }
  for (const styleSourceId of selection.values) {
    const styleSource = context.capabilities.styleSources.get(styleSourceId);
    if (styleSource?.type === "local") {
      context.removedLocalStyleSourceIds.add(styleSourceId);
    }
  }
};

const validateRemovedInstanceReferences = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  for (const instance of context.capabilities.instances.values()) {
    for (const child of instance.children ?? []) {
      if (
        child.type === "id" &&
        context.removedEditableInstanceIds.has(child.value)
      ) {
        return {
          success: false,
          error: "Removed content instances must not be referenced.",
        };
      }
    }
  }
  return { success: true };
};

const validateEditableInstanceReachability = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  const rootIdsByInstanceId = getContentModeEditableInstanceRootIds({
    contentRootIds: context.capabilities.contentRootIds,
    instances: context.capabilities.instances,
  });
  for (const instanceId of context.initialEditableInstanceIds) {
    if (context.initialContentRootIds.has(instanceId)) {
      continue;
    }
    if (context.removedEditableInstanceIds.has(instanceId)) {
      continue;
    }
    if (context.capabilities.instances.has(instanceId) === false) {
      continue;
    }
    const rootId = rootIdsByInstanceId.get(instanceId);
    if (rootId === undefined) {
      return {
        success: false,
        error: "Content instances must remain reachable from content roots.",
      };
    }
    if (rootId !== context.initialEditableInstanceRootIds.get(instanceId)) {
      return {
        success: false,
        error: "Content instances must stay within their content root.",
      };
    }
  }
  return { success: true };
};

const validateEditableInstanceReferences = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  const referenceCounts = new Map<Instance["id"], number>();
  const visited = new Set<Instance["id"]>();
  const visit = (instanceId: Instance["id"]) => {
    if (visited.has(instanceId)) {
      return;
    }
    const instance = context.capabilities.instances.get(instanceId);
    if (
      instance === undefined ||
      instance.component === blockTemplateComponent
    ) {
      return;
    }
    visited.add(instanceId);
    for (const child of instance.children ?? []) {
      if (child.type !== "id") {
        continue;
      }
      referenceCounts.set(
        child.value,
        (referenceCounts.get(child.value) ?? 0) + 1
      );
      visit(child.value);
    }
  };

  for (const rootId of context.capabilities.contentRootIds) {
    visit(rootId);
  }

  for (const [instanceId, referenceCount] of referenceCounts) {
    if (
      referenceCount > 1 &&
      (context.initialEditableInstanceIds.has(instanceId) ||
        context.addedInstanceIds.has(instanceId))
    ) {
      return {
        success: false,
        error: "Content instances must not be referenced multiple times.",
      };
    }
  }

  return { success: true };
};

export const contentModePermissionsTesting = {
  isContentModePageMetaValue,
  hasOnlyContentModePageMeta,
  hasOnlyAddedInstancesInSubtree,
  isContentModePropTransition,
  validateEditableInstanceReferences,
};

const validateStyleSourcePatch = (
  context: ContentModeTransactionContext,
  patch: Patch
): ContentModeValidationResult => {
  const [styleSourceId] = patch.path;
  if (
    typeof styleSourceId === "string" &&
    patch.path.length === 1 &&
    patch.op === "remove"
  ) {
    const styleSource = context.capabilities.styleSources.get(styleSourceId);
    if (
      styleSource?.type === "local" &&
      context.removedLocalStyleSourceIds.has(styleSourceId)
    ) {
      return { success: true };
    }
  }

  if (
    typeof styleSourceId !== "string" ||
    patch.path.length !== 1 ||
    patch.op !== "add"
  ) {
    return {
      success: false,
      error: "Style source patch is not editable in content mode.",
    };
  }

  if (
    context.capabilities.styleSources.has(styleSourceId) ||
    context.addedLocalStyleSourceIds.has(styleSourceId)
  ) {
    return {
      success: false,
      error: "Style source patch is not editable in content mode.",
    };
  }

  const parsedStyleSource = styleSource.safeParse(patch.value);
  if (
    parsedStyleSource.success === false ||
    parsedStyleSource.data.type !== "local" ||
    parsedStyleSource.data.id !== styleSourceId
  ) {
    return {
      success: false,
      error: "Only new local style sources are editable in content mode.",
    };
  }

  context.addedLocalStyleSourceIds.add(styleSourceId);
  return { success: true };
};

const validateSelectedLocalStyleSources = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  for (const styleSourceId of context.addedLocalStyleSourceIds) {
    if (context.selectedLocalStyleSourceIds.has(styleSourceId) === false) {
      return {
        success: false,
        error:
          "New local style sources must be selected by new content instances.",
      };
    }
  }
  return { success: true };
};

const validateStyledLocalStyleSources = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  for (const styleSourceId of context.addedLocalStyleSourceIds) {
    if (context.styledLocalStyleSourceIds.has(styleSourceId) === false) {
      return {
        success: false,
        error: "New local style sources must have styles in content mode.",
      };
    }
  }
  return { success: true };
};

const validateRemovedInstanceProps = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  for (const prop of context.capabilities.props.values()) {
    if (context.removedEditableInstanceIds.has(prop.instanceId)) {
      return {
        success: false,
        error: "Removed content instances must not keep props.",
      };
    }
  }
  return { success: true };
};

const validateRemovedInstanceStyleSourceSelections = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  for (const instanceId of context.removedEditableInstanceIds) {
    if (context.capabilities.styleSourceSelections.has(instanceId)) {
      return {
        success: false,
        error: "Removed content instances must not keep style selections.",
      };
    }
  }
  return { success: true };
};

const validateRemovedLocalStyleSources = (
  context: ContentModeTransactionContext
): ContentModeValidationResult => {
  for (const styleSourceId of context.removedLocalStyleSourceIds) {
    if (context.capabilities.styleSources.has(styleSourceId)) {
      return {
        success: false,
        error: "Removed content instances must not keep local style sources.",
      };
    }
  }
  for (const styleDecl of context.capabilities.styles.values()) {
    if (context.removedLocalStyleSourceIds.has(styleDecl.styleSourceId)) {
      return {
        success: false,
        error: "Removed content instances must not keep local styles.",
      };
    }
  }
  return { success: true };
};

const validateStylePatch = (
  context: ContentModeTransactionContext,
  patch: Patch
): ContentModeValidationResult => {
  const [styleDeclKey] = patch.path;
  if (
    typeof styleDeclKey === "string" &&
    patch.path.length === 1 &&
    patch.op === "remove"
  ) {
    const styleDecl = context.capabilities.styles.get(styleDeclKey);
    if (
      styleDecl &&
      context.removedLocalStyleSourceIds.has(styleDecl.styleSourceId)
    ) {
      return { success: true };
    }
  }

  if (
    typeof styleDeclKey !== "string" ||
    patch.path.length !== 1 ||
    (patch.op !== "add" && patch.op !== "replace")
  ) {
    return {
      success: false,
      error: "Style patch is not editable in content mode.",
    };
  }

  const parsedStyleDecl = styleDecl.safeParse(patch.value);
  if (
    parsedStyleDecl.success === false ||
    getStyleDeclKey(parsedStyleDecl.data as StyleDecl) !== styleDeclKey ||
    context.selectedLocalStyleSourceIds.has(
      parsedStyleDecl.data.styleSourceId
    ) === false
  ) {
    return {
      success: false,
      error:
        "Only styles for new local style sources are editable in content mode.",
    };
  }
  if (
    context.capabilities.breakpoints !== undefined &&
    context.capabilities.breakpoints.has(parsedStyleDecl.data.breakpointId) ===
      false
  ) {
    return {
      success: false,
      error:
        "Only styles for existing breakpoints are editable in content mode.",
    };
  }

  context.styledLocalStyleSourceIds.add(parsedStyleDecl.data.styleSourceId);
  return { success: true };
};

const validateMapChange = <
  Namespace extends "styleSourceSelections" | "styleSources" | "styles",
>(
  context: ContentModeTransactionContext,
  namespace: Namespace,
  patches: Patch[],
  validate: (
    context: ContentModeTransactionContext,
    patch: Patch
  ) => ContentModeValidationResult
): ContentModeValidationResult => {
  let next;
  try {
    next = applyBuilderNamespacePatches(
      context.capabilities[namespace],
      patches
    );
  } catch {
    return {
      success: false,
      error: `Namespace "${namespace}" is not editable in content mode.`,
    };
  }
  for (const patch of patches) {
    const result = validate(context, patch);
    if (result.success === false) {
      return result;
    }
  }
  context.capabilities[namespace] = next;
  return { success: true };
};

const validatePatchChange = (
  context: ContentModeTransactionContext,
  change: ContentModePatchTransaction["payload"][number]
): ContentModeValidationResult => {
  if (change.namespace === "instances") {
    for (const patch of change.patches) {
      const result = validateInstancePatch(context, patch);
      if (result.success === false) {
        return result;
      }
    }
    return { success: true };
  }

  if (change.namespace === "props") {
    return validatePropPatches(context, change.patches);
  }
  if (change.namespace === "styleSourceSelections") {
    return validateMapChange(
      context,
      change.namespace,
      change.patches,
      validateStyleSourceSelectionPatch
    );
  }
  if (change.namespace === "styleSources") {
    return validateMapChange(
      context,
      change.namespace,
      change.patches,
      validateStyleSourcePatch
    );
  }
  if (change.namespace === "styles") {
    return validateMapChange(
      context,
      change.namespace,
      change.patches,
      validateStylePatch
    );
  }
  if (change.namespace === "assets") {
    return { success: true };
  }

  if (change.namespace === "pages") {
    return validatePagePatches(context, change.patches);
  }

  return {
    success: false,
    error: `Namespace "${change.namespace}" is not editable in content mode.`,
  };
};

const preservesNonTextChildren = (
  before: Instance["children"] | undefined,
  after: Instance["children"] | undefined
) => {
  if (before === undefined || after === undefined) {
    return false;
  }
  const keepNonText = (children: typeof before) =>
    children.map((child) => (child.type === "text" ? "text" : child));
  return (
    (before.every((child) => child.type === "text") &&
      after.every((child) => child.type === "text")) ||
    equal(keepNonText(before), keepNonText(after))
  );
};

export const applyContentModeTransaction = ({
  capabilities,
  transaction,
  scope = "content",
}: {
  capabilities: ContentModeCapabilities;
  transaction: ContentModePatchTransaction;
  scope?: "content" | "text-and-props";
}): AppliedContentModeTransactionResult => {
  if (
    scope === "text-and-props" &&
    transaction.payload.some(
      ({ namespace }) => namespace !== "instances" && namespace !== "props"
    )
  ) {
    return {
      success: false,
      error: "You don't have permission to build this project.",
    };
  }
  if (transaction.payload.every(({ patches }) => patches.length === 0)) {
    return { success: true, capabilities };
  }
  transaction = {
    ...transaction,
    payload: mergeBuilderPatchChanges(transaction.payload),
  };
  const transactionCapabilities: ContentModeCapabilities = {
    ...capabilities,
    editablePropIds: new Set(capabilities.editablePropIds),
    editableInstanceIds: new Set(capabilities.editableInstanceIds),
    htmlTagsByInstanceId: getHtmlTagsFromProps(capabilities.props),
    contentRootIds: new Set(capabilities.contentRootIds),
  };
  const initialEditableInstanceRootIds = getContentModeEditableInstanceRootIds({
    contentRootIds: transactionCapabilities.contentRootIds,
    instances: transactionCapabilities.instances,
  });
  const initialEditableInstanceIds = new Set(
    initialEditableInstanceRootIds.keys()
  );
  const context: ContentModeTransactionContext = {
    capabilities: transactionCapabilities,
    initialContentRootIds: new Set(transactionCapabilities.contentRootIds),
    initialEditableInstanceIds,
    initialEditableInstanceRootIds,
    initialBlockTemplateChildIdsByInstanceId:
      getBlockTemplateChildIdsByInstanceId(transactionCapabilities.instances),
    addedInstanceIds: new Set(),
    removedEditableInstanceIds: new Set(),
    addedPageIds: new Set(),
    addedLocalStyleSourceIds: new Set(),
    removedLocalStyleSourceIds: new Set(),
    selectedLocalStyleSourceIds: new Set(),
    styledLocalStyleSourceIds: new Set(),
    editableInstanceIds: new Set(),
    copiedTemplateProps: new Map(),
  };

  for (const change of transaction.payload) {
    if (change.namespace !== "instances") {
      continue;
    }
    for (const patch of change.patches) {
      const result = validateInstancePatchShape(transactionCapabilities, patch);
      if (result.success === false) {
        return result;
      }
      if (
        patch.op === "add" &&
        patch.path.length === 1 &&
        typeof patch.path[0] === "string"
      ) {
        if (context.addedInstanceIds.has(patch.path[0])) {
          return {
            success: false,
            error: "Instance patch is not editable in content mode.",
          };
        }
        context.addedInstanceIds.add(patch.path[0]);
      }
      if (
        patch.op === "remove" &&
        patch.path.length === 1 &&
        typeof patch.path[0] === "string" &&
        initialEditableInstanceIds.has(patch.path[0])
      ) {
        context.removedEditableInstanceIds.add(patch.path[0]);
        addRemovedInstanceLocalStyleSources(context, patch.path[0]);
      }
    }
    try {
      transactionCapabilities.instances = applyBuilderNamespacePatches(
        transactionCapabilities.instances,
        change.patches
      );
    } catch {
      return {
        success: false,
        error: "Instance patch is not editable in content mode.",
      };
    }
  }

  for (const change of transaction.payload) {
    if (change.namespace !== "pages") {
      continue;
    }
    const result = validatePatchChange(context, change);
    if (result.success === false) {
      return result;
    }
  }

  const editableInstanceRootIds = getContentModeEditableInstanceRootIds({
    contentRootIds: transactionCapabilities.contentRootIds,
    instances: transactionCapabilities.instances,
  });
  context.editableInstanceIds = new Set(editableInstanceRootIds.keys());
  const frontmatterTargets = getContentModeFrontmatterBoundTargets({
    instances: transactionCapabilities.instances,
    props: transactionCapabilities.props,
  });
  transactionCapabilities.editableInstanceIds = context.editableInstanceIds;
  context.copiedTemplateProps = getCopiedTemplateProps({
    originalInstances: capabilities.instances,
    originalProps: capabilities.props,
    instances: transactionCapabilities.instances,
    addedInstanceIds: context.addedInstanceIds,
    editableInstanceRootIds,
    transaction,
  });
  transactionCapabilities.frontmatterBoundPropIds = frontmatterTargets.propIds;
  transactionCapabilities.frontmatterBoundTextInstanceIds =
    frontmatterTargets.textInstanceIds;

  for (const change of transaction.payload) {
    if (change.namespace !== "styleSources") {
      continue;
    }
    const result = validatePatchChange(context, change);
    if (result.success === false) {
      return result;
    }
  }

  for (const change of transaction.payload) {
    if (change.namespace !== "instances") {
      continue;
    }
    const result = validatePatchChange(context, change);
    if (result.success === false) {
      return result;
    }
  }

  const removedInstanceReferencesResult =
    validateRemovedInstanceReferences(context);
  if (removedInstanceReferencesResult.success === false) {
    return removedInstanceReferencesResult;
  }
  const editableInstanceReachabilityResult =
    validateEditableInstanceReachability(context);
  if (editableInstanceReachabilityResult.success === false) {
    return editableInstanceReachabilityResult;
  }
  const editableInstanceReferencesResult =
    validateEditableInstanceReferences(context);
  if (editableInstanceReferencesResult.success === false) {
    return editableInstanceReferencesResult;
  }

  for (const change of transaction.payload) {
    if (change.namespace !== "styleSourceSelections") {
      continue;
    }
    const result = validatePatchChange(context, change);
    if (result.success === false) {
      return result;
    }
  }

  const selectedLocalStyleSourceResult =
    validateSelectedLocalStyleSources(context);
  if (selectedLocalStyleSourceResult.success === false) {
    return selectedLocalStyleSourceResult;
  }

  for (const change of transaction.payload) {
    if (
      change.namespace === "instances" ||
      change.namespace === "pages" ||
      change.namespace === "styleSources" ||
      change.namespace === "styleSourceSelections"
    ) {
      continue;
    }
    const result = validatePatchChange(context, change);
    if (result.success === false) {
      return result;
    }
  }

  const removedInstancePropsResult = validateRemovedInstanceProps(context);
  if (removedInstancePropsResult.success === false) {
    return removedInstancePropsResult;
  }
  const removedInstanceStyleSourceSelectionsResult =
    validateRemovedInstanceStyleSourceSelections(context);
  if (removedInstanceStyleSourceSelectionsResult.success === false) {
    return removedInstanceStyleSourceSelectionsResult;
  }
  const removedLocalStyleSourcesResult =
    validateRemovedLocalStyleSources(context);
  if (removedLocalStyleSourcesResult.success === false) {
    return removedLocalStyleSourcesResult;
  }

  const styledLocalStyleSourceResult = validateStyledLocalStyleSources(context);
  if (styledLocalStyleSourceResult.success === false) {
    return styledLocalStyleSourceResult;
  }

  if (
    scope === "text-and-props" &&
    transaction.payload.some(
      ({ namespace, patches }) =>
        namespace === "instances" &&
        patches.some(
          ({ path }) =>
            typeof path[0] !== "string" ||
            !preservesNonTextChildren(
              capabilities.instances.get(path[0])?.children,
              transactionCapabilities.instances.get(path[0])?.children
            )
        )
    )
  ) {
    return {
      success: false,
      error: "You don't have permission to build this project.",
    };
  }
  return { success: true, capabilities: transactionCapabilities };
};

export const validateContentModeTransaction = ({
  capabilities,
  transaction,
}: {
  capabilities: ContentModeCapabilities;
  transaction: ContentModePatchTransaction;
}): ContentModeValidationResult => {
  const result = applyContentModeTransaction({ capabilities, transaction });
  return result.success ? { success: true } : result;
};
