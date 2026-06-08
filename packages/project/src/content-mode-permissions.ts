import type { Patch } from "immer";
import {
  Instance as InstanceSchema,
  InstanceChild as InstanceChildSchema,
  Prop as PropSchema,
  StyleDecl as StyleDeclSchema,
  StyleSource as StyleSourceSchema,
  StyleSourceSelection as StyleSourceSelectionSchema,
  PagePath,
  blockComponent,
  blockTemplateComponent,
  getHtmlTagsFromProps,
  getHtmlTagFromInstance,
  isPathnamePattern,
  getStyleDeclKey,
  type Breakpoints,
  type Instance,
  type Prop,
  type Props,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelections,
  type StyleSources,
  type Styles,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import type { BuildPatchTransaction } from "./db/build-patch-core";

export type ContentModeCapabilities = {
  editablePropIds: Set<Prop["id"]>;
  editableInstanceIds: Set<Instance["id"]>;
  instances: Map<Instance["id"], Instance>;
  metas: Map<Instance["component"], WsComponentMeta>;
  props: Props;
  htmlTagsByInstanceId: Map<Instance["id"], string>;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
  breakpoints?: Breakpoints;
  contentRootIds: Set<Instance["id"]>;
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
  (value === "" || PagePath.safeParse(value).success) &&
  isPathnamePattern(value) === false &&
  value.includes(":") === false &&
  value.includes("*") === false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

export const getContentModePropNamesByTag = (
  metas: Map<Instance["component"], WsComponentMeta>
) => {
  const propNamesByTag = new Map<string, Set<Prop["name"]>>();

  for (const meta of metas.values()) {
    const tags = Object.keys(meta.presetStyle ?? {});
    if (tags.length === 0) {
      continue;
    }
    for (const [propName, propMeta] of Object.entries(meta.props ?? {})) {
      if (propMeta.contentMode !== true) {
        continue;
      }
      for (const tag of tags) {
        let propNames = propNamesByTag.get(tag);
        if (propNames === undefined) {
          propNames = new Set();
          propNamesByTag.set(tag, propNames);
        }
        propNames.add(propName);
      }
    }
  }

  return propNamesByTag;
};

const getDefaultContentRootIds = (instances: Map<Instance["id"], Instance>) => {
  const contentRootIds = new Set<Instance["id"]>();
  for (const instance of instances.values()) {
    if (instance.component === blockComponent) {
      contentRootIds.add(instance.id);
    }
  }
  return contentRootIds;
};

export const getContentModeEditableInstanceIds = ({
  contentRootIds,
  instances,
}: {
  contentRootIds?: Set<Instance["id"]>;
  instances: Map<Instance["id"], Instance>;
}) => {
  contentRootIds ??= getDefaultContentRootIds(instances);
  return new Set(
    getContentModeEditableInstanceRootIds({
      contentRootIds,
      instances,
    }).keys()
  );
};

const getContentModeEditableInstanceRootIds = ({
  contentRootIds,
  instances,
}: {
  contentRootIds: Set<Instance["id"]>;
  instances: Map<Instance["id"], Instance>;
}) => {
  const editableInstanceIds = new Set<Instance["id"]>();
  const rootIdsByInstanceId = new Map<Instance["id"], Instance["id"]>();
  const visit = (instanceId: Instance["id"], rootId: Instance["id"]) => {
    if (editableInstanceIds.has(instanceId)) {
      return;
    }
    const instance = instances.get(instanceId);
    if (
      instance === undefined ||
      instance.component === blockTemplateComponent
    ) {
      return;
    }
    editableInstanceIds.add(instanceId);
    rootIdsByInstanceId.set(instanceId, rootId);
    for (const child of instance.children) {
      if (child.type === "id") {
        visit(child.value, rootId);
      }
    }
  };
  for (const rootId of contentRootIds) {
    visit(rootId, rootId);
  }
  return rootIdsByInstanceId;
};

const getBlockTemplateChildIdsByInstanceId = (
  instances: Map<Instance["id"], Instance>
) => {
  const childIdsByInstanceId = new Map<Instance["id"], Set<Instance["id"]>>();
  for (const instance of instances.values()) {
    const blockTemplateChildIds = new Set<Instance["id"]>();
    for (const child of instance.children) {
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

const getContentModePropMeta = ({
  capabilities,
  instance,
  propName,
}: {
  capabilities: ContentModeCapabilities;
  instance: Instance;
  propName: Prop["name"];
}) => {
  const meta = capabilities.metas.get(instance.component);
  const propMeta = meta?.props?.[propName];
  if (propMeta?.contentMode === true) {
    return propMeta;
  }

  const tag = getHtmlTagFromInstance({
    instance,
    metas: capabilities.metas,
    props: capabilities.props,
    htmlTagsByInstanceId: capabilities.htmlTagsByInstanceId,
  });
  if (tag === undefined) {
    return;
  }
  for (const componentMeta of capabilities.metas.values()) {
    if (Object.keys(componentMeta.presetStyle ?? {}).includes(tag) === false) {
      continue;
    }
    const propMeta = componentMeta.props?.[propName];
    if (propMeta?.contentMode === true) {
      return propMeta;
    }
  }
};

const isContentModePropForInstance = ({
  capabilities,
  instance,
  prop,
}: {
  capabilities: ContentModeCapabilities;
  instance: Instance;
  prop: Prop;
}) =>
  prop.type === "asset" ||
  getContentModePropMeta({
    capabilities,
    instance,
    propName: prop.name,
  })?.type === prop.type;

const contentModeNonCopyablePropTypes = new Set<Prop["type"]>([
  "resource",
  "parameter",
  "expression",
  "action",
  "animationAction",
]);

export const isContentModeCopyableProp = ({
  capabilities,
  prop,
}: {
  capabilities: ContentModeCapabilities;
  prop: Prop;
}) =>
  capabilities.editablePropIds.has(prop.id) &&
  contentModeNonCopyablePropTypes.has(prop.type) === false;

export const getContentModeCapabilities = ({
  instances,
  metas,
  props,
  styleSources,
  styleSourceSelections = new Map(),
  styles = new Map(),
  breakpoints,
  contentRootIds: providedContentRootIds,
}: {
  instances: Map<Instance["id"], Instance>;
  metas: Map<Instance["component"], WsComponentMeta>;
  props: Props;
  styleSources: StyleSources;
  styleSourceSelections?: StyleSourceSelections;
  styles?: Styles;
  breakpoints?: Breakpoints;
  contentRootIds?: Set<Instance["id"]>;
}): ContentModeCapabilities => {
  const editablePropIds = new Set<Prop["id"]>();
  const contentRootIds = new Set<Instance["id"]>();
  for (const instanceId of providedContentRootIds ??
    getDefaultContentRootIds(instances)) {
    if (instances.has(instanceId)) {
      contentRootIds.add(instanceId);
    }
  }
  const editableInstanceIds = getContentModeEditableInstanceIds({
    contentRootIds,
    instances,
  });
  const capabilities = {
    editablePropIds,
    editableInstanceIds,
    instances,
    metas,
    props,
    htmlTagsByInstanceId: getHtmlTagsFromProps(props),
    styleSources,
    styleSourceSelections,
    styles,
    breakpoints,
    contentRootIds,
  };
  for (const prop of props.values()) {
    const instance = instances.get(prop.instanceId);
    if (instance === undefined) {
      continue;
    }
    if (editableInstanceIds.has(instance.id) === false) {
      continue;
    }
    if (isContentModePropForInstance({ capabilities, instance, prop })) {
      editablePropIds.add(prop.id);
    }
  }

  return capabilities;
};

const isContentModePropPatchValue = ({
  capabilities,
  editableInstanceIds,
  expectedPropId,
  value,
}: {
  capabilities: ContentModeCapabilities;
  editableInstanceIds: Set<Instance["id"]>;
  expectedPropId: Prop["id"];
  value: unknown;
}) => {
  const prop = PropSchema.safeParse(value);
  if (prop.success === false) {
    return false;
  }

  if (prop.data.id !== expectedPropId) {
    return false;
  }

  const instance = capabilities.instances.get(prop.data.instanceId);
  if (instance === undefined) {
    return false;
  }
  if (editableInstanceIds.has(instance.id) === false) {
    return false;
  }

  return isContentModePropForInstance({
    capabilities,
    instance,
    prop: prop.data,
  });
};

const validatePropPatch = (
  context: ContentModeTransactionContext,
  patch: Patch
): ContentModeValidationResult => {
  const { capabilities } = context;
  const [propId] = patch.path;
  if (typeof propId !== "string") {
    return {
      success: false,
      error: "Prop patch is not editable in content mode.",
    };
  }

  if (patch.op === "remove" && patch.path.length === 1) {
    const prop = capabilities.props.get(propId);
    if (prop && context.removedEditableInstanceIds.has(prop.instanceId)) {
      capabilities.editablePropIds.delete(propId);
      capabilities.props.delete(propId);
      return { success: true };
    }
  }

  if (capabilities.editablePropIds.has(propId)) {
    if (patch.op === "remove" && patch.path.length === 1) {
      capabilities.editablePropIds.delete(propId);
      capabilities.props.delete(propId);
      return { success: true };
    }
    const prop = capabilities.props.get(propId);
    if (
      prop &&
      patch.path.length === 2 &&
      patch.path[1] === "value" &&
      (patch.op === "add" || patch.op === "replace") &&
      PropSchema.safeParse({ ...prop, value: patch.value }).success
    ) {
      capabilities.props.set(propId, { ...prop, value: patch.value } as Prop);
      return { success: true };
    }
  }

  if (
    patch.path.length === 1 &&
    (patch.op === "add" || patch.op === "replace") &&
    isContentModePropPatchValue({
      capabilities,
      editableInstanceIds: context.editableInstanceIds,
      expectedPropId: propId,
      value: patch.value,
    })
  ) {
    capabilities.editablePropIds.add(propId);
    capabilities.props.set(propId, patch.value as Prop);
    return { success: true };
  }

  return {
    success: false,
    error: `Prop "${propId}" is not editable in content mode.`,
  };
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
  InstanceChildSchema.safeParse(value).success;

const isInstanceChildren = (value: unknown) =>
  Array.isArray(value) && value.every(isInstanceChild);

const isEditableChildrenPatch = (patch: Patch) => {
  if (patch.path.length === 2 && patch.op === "replace") {
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
  instance.children.every((child) =>
    isAllowedContentModeChildReference(context, instance.id, child)
  );

const hasSameInstanceMetadata = (left: Instance, right: Instance) =>
  left.type === right.type &&
  left.id === right.id &&
  left.component === right.component &&
  left.tag === right.tag &&
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
    for (const child of instance.children) {
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
    const instance = InstanceSchema.safeParse(patch.value);
    if (
      instance.success &&
      instance.data.id === instanceId &&
      hasOnlyAllowedContentModeChildReferences(context, instance.data)
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
    const instance = InstanceSchema.safeParse(patch.value);
    if (
      instance.success &&
      instance.data.id === instanceId &&
      context.editableInstanceIds.has(instanceId) &&
      hasOnlyAllowedContentModeChildReferences(context, instance.data)
    ) {
      return { success: true };
    }
    if (instance.success && instance.data.id === instanceId) {
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
    const instance = InstanceSchema.safeParse(patch.value);
    const currentInstance = capabilities.instances.get(instanceId);
    if (
      instance.success &&
      instance.data.id === instanceId &&
      currentInstance !== undefined &&
      hasSameInstanceMetadata(currentInstance, instance.data)
    ) {
      return { success: true };
    }
  }

  if (
    patch.path.length === 1 &&
    patch.op === "add" &&
    capabilities.instances.has(instanceId) === false
  ) {
    const instance = InstanceSchema.safeParse(patch.value);
    if (instance.success && instance.data.id === instanceId) {
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
    capabilities.styleSourceSelections.delete(instanceId);
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

  const selection = StyleSourceSelectionSchema.safeParse(patch.value);
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

  capabilities.styleSourceSelections.set(instanceId, selection.data);
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
    for (const child of instance.children) {
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
    for (const child of instance.children) {
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

export const __testing__ = {
  isContentModePageMetaValue,
  hasOnlyContentModePageMeta,
  hasOnlyAddedInstancesInSubtree,
  isContentModePropPatchValue,
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
      context.capabilities.styleSources.delete(styleSourceId);
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

  if (context.capabilities.styleSources.has(styleSourceId)) {
    return {
      success: false,
      error: "Style source patch is not editable in content mode.",
    };
  }

  const styleSource = StyleSourceSchema.safeParse(patch.value);
  if (
    styleSource.success === false ||
    styleSource.data.type !== "local" ||
    styleSource.data.id !== styleSourceId
  ) {
    return {
      success: false,
      error: "Only new local style sources are editable in content mode.",
    };
  }

  context.addedLocalStyleSourceIds.add(styleSourceId);
  context.capabilities.styleSources.set(styleSourceId, styleSource.data);
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
      context.capabilities.styles.delete(styleDeclKey);
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

  const styleDecl = StyleDeclSchema.safeParse(patch.value);
  if (
    styleDecl.success === false ||
    getStyleDeclKey(styleDecl.data as StyleDecl) !== styleDeclKey ||
    context.selectedLocalStyleSourceIds.has(styleDecl.data.styleSourceId) ===
      false
  ) {
    return {
      success: false,
      error:
        "Only styles for new local style sources are editable in content mode.",
    };
  }
  if (
    context.capabilities.breakpoints !== undefined &&
    context.capabilities.breakpoints.has(styleDecl.data.breakpointId) === false
  ) {
    return {
      success: false,
      error:
        "Only styles for existing breakpoints are editable in content mode.",
    };
  }

  context.styledLocalStyleSourceIds.add(styleDecl.data.styleSourceId);
  context.capabilities.styles.set(styleDeclKey, styleDecl.data);
  return { success: true };
};

const validatePatchChange = (
  context: ContentModeTransactionContext,
  change: BuildPatchTransaction["payload"][number]
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
    for (const patch of change.patches) {
      const result = validatePropPatch(context, patch);
      if (result.success === false) {
        return result;
      }
    }
    return { success: true };
  }

  if (change.namespace === "styleSourceSelections") {
    for (const patch of change.patches) {
      const result = validateStyleSourceSelectionPatch(context, patch);
      if (result.success === false) {
        return result;
      }
    }
    return { success: true };
  }

  if (change.namespace === "styleSources") {
    for (const patch of change.patches) {
      const result = validateStyleSourcePatch(context, patch);
      if (result.success === false) {
        return result;
      }
    }
    return { success: true };
  }

  if (change.namespace === "styles") {
    for (const patch of change.patches) {
      const result = validateStylePatch(context, patch);
      if (result.success === false) {
        return result;
      }
    }
    return { success: true };
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

const applyValidatedInstancePatch = (
  capabilities: ContentModeCapabilities,
  patch: Patch
) => {
  const [instanceId, field, index] = patch.path;
  if (patch.op === "remove") {
    if (patch.path.length === 1) {
      capabilities.instances.delete(instanceId as Instance["id"]);
      capabilities.contentRootIds.delete(instanceId as Instance["id"]);
      return;
    }
    if (
      field === "children" &&
      typeof index === "number" &&
      patch.path.length === 3
    ) {
      const instance = capabilities.instances.get(instanceId as Instance["id"]);
      if (instance) {
        instance.children.splice(index, 1);
      }
    }
    return;
  }
  if (patch.op === "add") {
    if (patch.path.length === 1) {
      capabilities.instances.set(
        instanceId as Instance["id"],
        patch.value as Instance
      );
      return;
    }
    if (
      field === "children" &&
      typeof index === "number" &&
      patch.path.length === 3
    ) {
      const instance = capabilities.instances.get(instanceId as Instance["id"]);
      if (instance) {
        instance.children.splice(index, 0, patch.value);
      }
    }
    return;
  }
  if (
    patch.op === "replace" &&
    patch.path.length === 1 &&
    typeof instanceId === "string"
  ) {
    capabilities.instances.set(instanceId, patch.value as Instance);
    return;
  }
  if (
    patch.op === "replace" &&
    field === "children" &&
    typeof index === "number" &&
    patch.path.length === 3
  ) {
    const instance = capabilities.instances.get(instanceId as Instance["id"]);
    if (instance) {
      instance.children[index] = patch.value;
    }
    return;
  }
  if (
    patch.op === "replace" &&
    field === "children" &&
    patch.path.length === 2
  ) {
    const instance = capabilities.instances.get(instanceId as Instance["id"]);
    if (instance) {
      instance.children = patch.value;
    }
  }
};

export const applyContentModeTransaction = ({
  capabilities,
  transaction,
}: {
  capabilities: ContentModeCapabilities;
  transaction: BuildPatchTransaction;
}): AppliedContentModeTransactionResult => {
  const transactionCapabilities: ContentModeCapabilities = {
    ...capabilities,
    editablePropIds: new Set(capabilities.editablePropIds),
    editableInstanceIds: new Set(capabilities.editableInstanceIds),
    instances: new Map(
      Array.from(capabilities.instances, ([id, instance]) => [
        id,
        structuredClone(instance),
      ])
    ),
    props: new Map(capabilities.props),
    htmlTagsByInstanceId: new Map(capabilities.htmlTagsByInstanceId),
    styleSources: new Map(capabilities.styleSources),
    styleSourceSelections: new Map(capabilities.styleSourceSelections),
    styles: new Map(capabilities.styles),
    breakpoints:
      capabilities.breakpoints === undefined
        ? undefined
        : new Map(capabilities.breakpoints),
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
      applyValidatedInstancePatch(transactionCapabilities, patch);
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

  context.editableInstanceIds = getContentModeEditableInstanceIds({
    contentRootIds: transactionCapabilities.contentRootIds,
    instances: transactionCapabilities.instances,
  });
  transactionCapabilities.editableInstanceIds = context.editableInstanceIds;

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

  return { success: true, capabilities: transactionCapabilities };
};

export const validateContentModeTransaction = ({
  capabilities,
  transaction,
}: {
  capabilities: ContentModeCapabilities;
  transaction: BuildPatchTransaction;
}): ContentModeValidationResult => {
  const result = applyContentModeTransaction({ capabilities, transaction });
  return result.success ? { success: true } : result;
};
