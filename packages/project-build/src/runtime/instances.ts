import {
  elementComponent,
  findTreeInstanceIds,
  getHtmlTagsFromProps,
  getStyleDeclKey,
  instance as instanceInput,
  tags,
  type DataSource,
  type Instance,
  type Instances,
  type Prop,
  type Props,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
  type WebstudioData,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import {
  paginateOutput,
  projectOutput,
  type PaginatedOutputInput,
} from "./output";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import {
  getZodValidationIssueOptions,
  throwBuilderRuntimeError,
  throwBuilderValidationError,
} from "./errors";
import { replaceTextValue } from "./text-replacement";
import { getExpressionErrors } from "./expression-validation";
import { createRuntimeMutation } from "./mutation";
import { findSerializedPageByInput, getSerializedPages } from "./pages";
import { validatePageSelector } from "./page-selector";
import {
  createPropClonePatches,
  createPropDeletePayload,
  createPropRenamePayload,
} from "./props";
import {
  createTreeVariableRebindPayload,
  produceWebstudioDataMutation,
  rebindTreeVariablesMutable,
} from "./data";
import { applyBuilderPatchPayloadMutable } from "../state/patch";
import {
  isRichTextContent,
  isTreeSatisfyingContentModel,
} from "./content-model";
import {
  countInstanceChildReferences,
  detachSharedSlotChildrenMutable,
  getDirectSharedSlotChildBoundary,
  getSlotFragmentDropTargetMutable,
  normalizeLegacySlotInstancePathMutable,
  normalizeLegacySlotParentInSelectorMutable,
  prepareSlotReparentMutable,
  replaceChildReferenceMutable,
  type InstancePath,
} from "./slot";
import { getReparentDropTargetMutable, type DroppableTarget } from "./tree";
import {
  createStyleClonePayload,
  serializeStyleDeclarations,
} from "./style-utils";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { reactPropsToStandardAttributes } from "@webstudio-is/react-sdk/standard-attributes";
import equal from "fast-deep-equal";
import { z } from "zod";

export const insertIndexInput = z.number().int().nonnegative();
const instanceEndPositionInput = z.literal("end");
export const instanceInsertModeInput = z.enum(["append", "prepend", "replace"]);

export const moveInstancesInput = z.object({
  moves: z
    .array(
      z
        .object({
          instanceId: z.string(),
          parentInstanceId: z.string(),
          insertIndex: insertIndexInput
            .optional()
            .describe(
              "Zero-based position in the target parent's children before the moved instance is removed. Omit it or use position: end to append."
            ),
          position: instanceEndPositionInput
            .optional()
            .describe(
              'Use "end" to append deterministically without calculating an insertIndex.'
            ),
        })
        .refine(
          ({ insertIndex, position }) =>
            insertIndex === undefined || position === undefined,
          getZodValidationIssueOptions({
            code: "conflicting_move_position",
            path: ["position"],
            message: "Use either insertIndex or position, not both.",
            constraint: "mutually_exclusive_with:insertIndex",
            example: "end",
          })
        )
    )
    .min(1)
    .describe("Moves are applied sequentially in array order."),
});

export const reparentInstanceInput = z.object({
  sourceInstanceSelector: z.array(z.string()).min(2),
  dropTarget: z.object({
    parentSelector: z.array(z.string()).min(1),
    position: z.union([insertIndexInput, instanceEndPositionInput]),
  }),
});

export const cloneInstanceInput = z.object({
  sourceInstanceId: z.string(),
  targetParentInstanceId: z.string().optional(),
  insertIndex: insertIndexInput.optional(),
});

export const deleteInstancesInput = z.object({
  instanceIds: z.array(z.string()).min(1),
});

export const deleteInstanceBySelectorInput = z.object({
  instanceSelector: z.array(z.string()).min(2),
});

export const fillGridInput = z.object({
  parentInstanceId: z.string(),
  totalCells: z.number().int().nonnegative(),
  breakpointId: z.string(),
});

export const wrapInstanceInput = z.object({
  instanceSelector: z
    .array(z.string())
    .min(2)
    .describe(
      "Selected instance selector, starting with the instance to wrap."
    ),
  component: instanceInput.shape.component,
  tag: z.string().min(1).optional(),
});

export const convertInstanceInput = z.object({
  instanceSelector: z
    .array(z.string())
    .min(2)
    .describe(
      "Selected instance selector, starting with the instance to convert."
    ),
  component: instanceInput.shape.component,
  tag: z.string().min(1).optional(),
  currentTag: z.string().min(1).optional(),
});

export const unwrapInstanceInput = z.object({
  instanceSelector: z
    .array(z.string())
    .min(3)
    .describe(
      "Selected instance selector, starting with the instance to unwrap."
    ),
});

export const setInstanceTagInput = z.object({
  instanceId: z.string(),
  tag: z.string(),
  legacyPropName: z.string().optional(),
});

export const setInstanceLabelInput = z.object({
  instanceId: z.string(),
  label: z.string(),
});

export const updateTextInstanceInput = z.object({
  instanceId: z
    .string()
    .describe("Instance id containing the child to update."),
  childIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("Zero-based child index from list-texts or inspect-instance."),
  text: z
    .string()
    .describe(
      "Replacement visible text when mode is text, or one Webstudio JavaScript expression when mode is expression. Read webstudio://project/expressions for syntax and scope rules."
    ),
  mode: z
    .enum(["text", "expression"])
    .optional()
    .describe(
      'Optional expected child type. Use "text" for plain visible text and "expression" for JavaScript expression children. There is no "replace" mode.'
    ),
});

export const setTextContentInput = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("set"),
    instanceId: z.string().describe("Instance id to receive text content."),
    text: z
      .string()
      .describe(
        "Visible text, or one Webstudio JavaScript expression when mode is expression. Read webstudio://project/expressions for syntax and scope rules."
      ),
    mode: z
      .enum(["text", "expression"])
      .default("text")
      .describe(
        'Use "text" for plain visible text and "expression" for JavaScript expression children.'
      ),
  }),
  z.object({
    operation: z.literal("reset"),
    instanceId: z.string().describe("Instance id to reset to no text content."),
  }),
]);

export const updateTextTreeInput = z.object({
  rootInstanceId: z.string(),
  instances: z
    .array(instanceInput)
    .min(1)
    .describe(
      "Updated rich text tree. Existing instance ids inside the edited tree are preserved. New instance ids are treated as temporary client references and remapped to runtime-generated ids."
    ),
});

export type TextContentChild = Extract<
  Instance["children"][number],
  { type: "text" | "expression" }
>;

export const canUnwrapInstancePath = ({
  instancePath,
  rootInstanceId,
  instances,
  props,
  metas,
}: {
  instancePath: InstancePath;
  rootInstanceId?: Instance["id"];
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
}) => {
  if (instancePath.length < 3) {
    return false;
  }
  const [selectedItem, parentItem] = instancePath;
  if (selectedItem === undefined || parentItem === undefined) {
    return false;
  }
  if (
    rootInstanceId !== undefined &&
    parentItem.instance.id === rootInstanceId
  ) {
    return false;
  }
  if (parentItem.instance.component === "Slot") {
    return true;
  }
  return !isRichTextContent({
    instanceSelector: selectedItem.instanceSelector,
    instances,
    props,
    metas,
  });
};

const createSimulationInstanceId = (instances: Instances) => {
  let index = 0;
  let id = "__webstudio_simulated_instance__";
  while (instances.has(id)) {
    index += 1;
    id = `__webstudio_simulated_instance_${index}__`;
  }
  return id;
};

export const getValidTagsForInstance = ({
  instanceId,
  instanceSelector,
  instances,
  props,
  metas,
  htmlTagsByInstanceId,
  availableTags = tags,
}: {
  instanceId: Instance["id"];
  instanceSelector: Instance["id"][];
  instances: Instances;
  props: Props;
  metas: Map<Instance["component"], WsComponentMeta>;
  htmlTagsByInstanceId?: Map<Instance["id"], string>;
  availableTags?: readonly string[];
}) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return [];
  }
  const nextInstances = new Map(instances);
  const validTags: string[] = [];
  for (const tag of availableTags) {
    nextInstances.set(instance.id, { ...instance, tag });
    if (
      isTreeSatisfyingContentModel({
        instances: nextInstances,
        props,
        metas,
        htmlTagsByInstanceId,
        instanceSelector,
      })
    ) {
      validTags.push(tag);
    }
  }
  return validTags;
};

export const getValidElementChildTags = ({
  parentInstanceId,
  parentInstanceSelector,
  instances,
  props,
  metas,
  htmlTagsByInstanceId,
  availableTags = tags,
}: {
  parentInstanceId: Instance["id"];
  parentInstanceSelector: Instance["id"][];
  instances: Instances;
  props: Props;
  metas: Map<Instance["component"], WsComponentMeta>;
  htmlTagsByInstanceId?: Map<Instance["id"], string>;
  availableTags?: readonly string[];
}) => {
  const parentInstance = instances.get(parentInstanceId);
  if (parentInstance === undefined) {
    return [];
  }
  const childInstance: Instance = {
    type: "instance",
    id: createSimulationInstanceId(instances),
    component: elementComponent,
    children: [],
  };
  const nextInstances = new Map(instances);
  nextInstances.set(childInstance.id, childInstance);
  nextInstances.set(parentInstance.id, {
    ...parentInstance,
    children: [{ type: "id", value: childInstance.id }],
  });
  const validTags: string[] = [];
  for (const tag of availableTags) {
    childInstance.tag = tag;
    if (
      isTreeSatisfyingContentModel({
        instances: nextInstances,
        props,
        metas,
        htmlTagsByInstanceId,
        instanceSelector: parentInstanceSelector,
      })
    ) {
      validTags.push(tag);
    }
  }
  return validTags;
};

export const canWrapInstance = (
  selectedInstanceId: Instance["id"],
  selectedInstanceSelector: Instance["id"][],
  parentInstanceId: Instance["id"],
  component: Instance["component"],
  tag: string | undefined,
  instances: Instances,
  props: Props,
  metas: Map<Instance["component"], WsComponentMeta>,
  htmlTagsByInstanceId: Map<Instance["id"], string> = getHtmlTagsFromProps(
    props
  )
): boolean => {
  const selectedInstance = instances.get(selectedInstanceId);
  const parentInstance = instances.get(parentInstanceId);
  if (selectedInstance === undefined || parentInstance === undefined) {
    return false;
  }

  const wrapperInstance: Instance = {
    type: "instance",
    id: createSimulationInstanceId(instances),
    component,
    children: [{ type: "id", value: selectedInstanceId }],
  };

  if (tag !== undefined || component === elementComponent) {
    wrapperInstance.tag = tag ?? "div";
  } else {
    const meta = metas.get(component);
    const defaultTag = Object.keys(
      (meta as { presetStyle?: Record<string, unknown> })?.presetStyle ?? {}
    ).at(0);
    if (defaultTag !== undefined) {
      wrapperInstance.tag = defaultTag;
    }
  }

  const nextInstances = new Map(instances);
  nextInstances.set(wrapperInstance.id, wrapperInstance);
  nextInstances.set(parentInstance.id, {
    ...parentInstance,
    children: parentInstance.children.map((child) =>
      child.type === "id" && child.value === selectedInstanceId
        ? { type: "id", value: wrapperInstance.id }
        : child
    ),
  });

  if (
    isTreeSatisfyingContentModel({
      instances: nextInstances,
      props,
      metas,
      htmlTagsByInstanceId,
      instanceSelector: [
        wrapperInstance.id,
        ...selectedInstanceSelector.slice(1),
      ],
    }) === false
  ) {
    return false;
  }

  return isTreeSatisfyingContentModel({
    instances: nextInstances,
    props,
    metas,
    htmlTagsByInstanceId,
    instanceSelector: [
      selectedInstanceId,
      wrapperInstance.id,
      ...selectedInstanceSelector.slice(1),
    ],
  });
};

const getRequiredInstances = (
  state: Pick<BuilderState, "instances">
): Instances => {
  if (state.instances === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instances namespace is missing"
    );
  }
  return state.instances;
};

export const findChildReferenceIndex = (
  children: Instance["children"],
  instanceId: Instance["id"]
) =>
  children.findIndex(
    (child) => child.type === "id" && child.value === instanceId
  );

export const createInstanceChild = (instanceId: Instance["id"]) =>
  ({ type: "id", value: instanceId }) as const;

const removeChildReferenceMutable = (
  children: Instance["children"],
  instanceId: Instance["id"]
) => {
  const childIndex = findChildReferenceIndex(children, instanceId);
  if (childIndex !== -1) {
    children.splice(childIndex, 1);
  }
};

const getSlotChildrenSignature = (instance: Instance) =>
  JSON.stringify(instance.children);

const cloneInstances = (instances: Instances) =>
  new Map(
    Array.from(
      instances,
      ([id, instance]) => [id, structuredClone(instance)] as const
    )
  );

type FullInstanceMutationState = Pick<
  BuilderState,
  | "pages"
  | "instances"
  | "props"
  | "dataSources"
  | "resources"
  | "styleSources"
  | "styleSourceSelections"
  | "styles"
  | "breakpoints"
  | "assets"
>;

const getRequiredFullInstanceMutationData = (
  state: Partial<FullInstanceMutationState>
): WebstudioData => {
  const {
    pages,
    instances,
    props,
    dataSources,
    resources,
    styleSources,
    styleSourceSelections,
    styles,
    breakpoints,
    assets,
  } = state;
  if (
    pages === undefined ||
    instances === undefined ||
    props === undefined ||
    dataSources === undefined ||
    resources === undefined ||
    styleSources === undefined ||
    styleSourceSelections === undefined ||
    styles === undefined ||
    breakpoints === undefined ||
    assets === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Complete Webstudio data is required"
    );
  }
  return {
    pages,
    instances,
    props,
    dataSources,
    resources,
    styleSources,
    styleSourceSelections,
    styles,
    breakpoints,
    assets,
  };
};

const getWebstudioDataNamespace = (
  data: WebstudioData,
  namespace: BuilderPatchChange["namespace"]
) => {
  if (namespace === "marketplaceProduct" || namespace === "projectSettings") {
    return;
  }
  return data[namespace];
};

const createInstancesMapPayload = ({
  before,
  after,
}: {
  before: Instances;
  after: Instances;
}): BuilderPatchChange[] => {
  const patches: BuilderPatchChange["patches"] = [];
  for (const [id, instance] of before) {
    if (after.has(id) === false) {
      patches.push({ op: "remove", path: [id] });
    } else {
      const nextInstance = after.get(id);
      if (
        nextInstance !== undefined &&
        equal(instance, nextInstance) === false
      ) {
        patches.push({ op: "replace", path: [id], value: nextInstance });
      }
    }
  }
  for (const [id, instance] of after) {
    if (before.has(id) === false) {
      patches.push({ op: "add", path: [id], value: instance });
    }
  }
  return patches.length === 0 ? [] : [{ namespace: "instances", patches }];
};

const getInstancePathFromSelector = (
  instanceSelector: Instance["id"][],
  instances: Instances
): undefined | InstancePath => {
  const instancePath: InstancePath = [];
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    instancePath.push({
      instance,
      instanceSelector: instanceSelector.slice(index),
    });
  }
  if (instancePath.length === 0) {
    return;
  }
  return instancePath;
};

const createLocalStyleSource = (id: StyleSource["id"]): StyleSource => ({
  type: "local",
  id,
});

const createStyleDecl = ({
  styleSourceId,
  breakpointId,
  property,
  value,
}: Pick<StyleDecl, "styleSourceId" | "breakpointId" | "property" | "value">) =>
  ({
    styleSourceId,
    breakpointId,
    property,
    value,
  }) satisfies StyleDecl;

export const getSameParentAdjustedInsertIndex = ({
  currentIndex,
  requestedIndex,
}: {
  currentIndex: number;
  requestedIndex: number;
}) => (requestedIndex > currentIndex ? requestedIndex - 1 : requestedIndex);

export const findParentInstanceReference = (
  instances: Instances,
  instanceId: Instance["id"]
) => {
  for (const instance of instances.values()) {
    const childIndex = findChildReferenceIndex(instance.children, instanceId);
    if (childIndex !== -1) {
      return { instance, childIndex };
    }
  }
};

export const getInstanceDepths = (
  instances: Pick<Instances, "get" | "values">,
  rootInstanceIds?: Instance["id"][]
) => {
  const depths = new Map<Instance["id"], number>();
  const visit = (instanceId: Instance["id"], depth: number) => {
    if (depths.has(instanceId)) {
      return;
    }
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    depths.set(instanceId, depth);
    for (const child of instance.children) {
      if (child.type === "id") {
        visit(child.value, depth + 1);
      }
    }
  };

  const roots =
    rootInstanceIds ??
    Array.from(instances.values(), (instance) => instance.id);
  for (const root of roots) {
    visit(root, 0);
  }
  return depths;
};

export const getBuildInstanceDepths = (
  state: Pick<BuilderState, "instances" | "pages">,
  rootInstanceIds?: Instance["id"][]
) => {
  const instances = getRequiredInstances(state);
  const roots =
    rootInstanceIds ??
    (state.pages === undefined
      ? undefined
      : Array.from(state.pages.pages.values()).map(
          (page) => page.rootInstanceId
        ));
  return getInstanceDepths(instances, roots);
};

export const collectInstanceIds = (
  instances: Map<Instance["id"], Instance>,
  rootInstanceId: Instance["id"]
) => Array.from(getInstanceDepths(instances, [rootInstanceId]).keys());

export const collectExclusiveInstanceIds = (
  instances: Map<Instance["id"], Instance>,
  rootInstanceIds: Iterable<Instance["id"]>
) => {
  const roots = new Set(rootInstanceIds);
  const candidateIds = new Set<Instance["id"]>();
  for (const rootInstanceId of roots) {
    for (const instanceId of collectInstanceIds(instances, rootInstanceId)) {
      candidateIds.add(instanceId);
    }
  }

  const preservedIds = new Set<Instance["id"]>();
  const preserve = (instanceId: Instance["id"]) => {
    if (roots.has(instanceId) || preservedIds.has(instanceId)) {
      return;
    }
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    preservedIds.add(instanceId);
    for (const child of instance.children) {
      if (child.type === "id") {
        preserve(child.value);
      }
    }
  };

  for (const instance of instances.values()) {
    if (candidateIds.has(instance.id)) {
      continue;
    }
    for (const child of instance.children) {
      if (child.type === "id" && candidateIds.has(child.value)) {
        preserve(child.value);
      }
    }
  }

  for (const preservedId of preservedIds) {
    candidateIds.delete(preservedId);
  }
  return candidateIds;
};

export const cloneInstanceWithNewIds = ({
  instance,
  newInstanceIds,
}: {
  instance: Instance;
  newInstanceIds: Map<Instance["id"], Instance["id"]>;
}): Instance => ({
  ...instance,
  id: newInstanceIds.get(instance.id) ?? instance.id,
  children: instance.children.map((child) =>
    child.type === "id"
      ? { ...child, value: newInstanceIds.get(child.value) ?? child.value }
      : child
  ),
});

export const replaceTextInput = z
  .object({
    find: z.string().min(1).describe("Literal text to find."),
    replace: z.string().describe("Replacement literal text."),
    match: z
      .enum(["exact", "substring"])
      .default("exact")
      .describe(
        'Use "exact" to replace complete text children, or "substring" to replace every literal occurrence inside matching text children.'
      ),
    pageId: z.string().optional(),
    pagePath: z.string().optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("Maximum number of text children to replace."),
  })
  .superRefine(validatePageSelector);

export const cloneInstanceSubtree = ({
  instances,
  rootInstanceId,
  createId,
}: {
  instances: Map<Instance["id"], Instance>;
  rootInstanceId: Instance["id"];
  createId: () => Instance["id"];
}) => {
  const instanceIds = collectInstanceIds(instances, rootInstanceId);
  const nextIdById = new Map(instanceIds.map((id) => [id, createId()]));
  const clonedInstances = instanceIds.flatMap((instanceId) => {
    const instance = instances.get(instanceId);
    const nextId = nextIdById.get(instanceId);
    if (instance === undefined || nextId === undefined) {
      return [];
    }
    return [
      [
        nextId,
        cloneInstanceWithNewIds({ instance, newInstanceIds: nextIdById }),
      ] satisfies [string, Instance],
    ];
  });
  return { clonedInstances, instanceIds, nextIdById };
};

export const findLocalStyleSourcesWithinInstances = (
  styleSources: Iterable<StyleSource>,
  styleSourceSelections: Iterable<StyleSourceSelection>,
  instanceIds: Set<Instance["id"]>
) => {
  const localStyleSourceIds = new Set<StyleSource["id"]>();
  for (const styleSource of styleSources) {
    if (styleSource.type === "local") {
      localStyleSourceIds.add(styleSource.id);
    }
  }

  const subtreeLocalStyleSourceIds = new Set<StyleSource["id"]>();
  for (const { instanceId, values } of styleSourceSelections) {
    if (instanceIds.has(instanceId) === false) {
      continue;
    }
    for (const styleSourceId of values) {
      if (localStyleSourceIds.has(styleSourceId)) {
        subtreeLocalStyleSourceIds.add(styleSourceId);
      }
    }
  }

  return subtreeLocalStyleSourceIds;
};

export const getInstanceDeleteTargets = ({
  instanceIds,
  props,
  dataSources,
  styleSources,
  styleSourceSelections,
}: {
  instanceIds: Set<Instance["id"]>;
  props: Iterable<Prop>;
  dataSources: Iterable<DataSource>;
  styleSources: Iterable<StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
}) => {
  const propIds = new Set<Prop["id"]>();
  const dataSourceIds = new Set<DataSource["id"]>();
  const resourceIds = new Set<string>();
  const styleSourceSelectionInstanceIds = new Set<Instance["id"]>();
  const styleSourceSelectionList = Array.from(styleSourceSelections);
  const localStyleSourceIds = findLocalStyleSourcesWithinInstances(
    styleSources,
    styleSourceSelectionList,
    instanceIds
  );

  for (const prop of props) {
    if (instanceIds.has(prop.instanceId) === false) {
      continue;
    }
    propIds.add(prop.id);
    if (prop.type === "resource") {
      resourceIds.add(prop.value);
    }
  }

  for (const dataSource of dataSources) {
    if (instanceIds.has(dataSource.scopeInstanceId ?? "") === false) {
      continue;
    }
    dataSourceIds.add(dataSource.id);
    if (dataSource.type === "resource") {
      resourceIds.add(dataSource.resourceId);
    }
  }

  for (const styleSourceSelection of styleSourceSelectionList) {
    if (instanceIds.has(styleSourceSelection.instanceId)) {
      styleSourceSelectionInstanceIds.add(styleSourceSelection.instanceId);
    }
  }

  return {
    instanceIds,
    propIds,
    dataSourceIds,
    resourceIds,
    styleSourceSelectionInstanceIds,
    localStyleSourceIds,
  };
};

const createRemovePatches = (ids: Iterable<string>) =>
  Array.from(ids, (id) => ({ op: "remove" as const, path: [id] }));

const sortChildRemovalPatches = <
  Patch extends {
    path: [string, "children", number];
  },
>(
  patches: Patch[]
) =>
  patches.sort((left, right) => {
    const parentOrder = left.path[0].localeCompare(right.path[0]);
    return parentOrder === 0 ? right.path[2] - left.path[2] : parentOrder;
  });

export const createInstanceCleanupPayload = ({
  instanceIds,
  props,
  dataSources,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  instanceIds: Set<Instance["id"]>;
  props: Iterable<Prop>;
  dataSources: Iterable<DataSource>;
  styleSources: Iterable<StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
}): BuilderPatchChange[] => {
  const deleteTargets = getInstanceDeleteTargets({
    instanceIds,
    props,
    dataSources,
    styleSources,
    styleSourceSelections,
  });

  return compactBuilderPatchPayload([
    {
      namespace: "instances",
      patches: createRemovePatches(deleteTargets.instanceIds),
    },
    {
      namespace: "props",
      patches: createRemovePatches(deleteTargets.propIds),
    },
    {
      namespace: "dataSources",
      patches: createRemovePatches(deleteTargets.dataSourceIds),
    },
    {
      namespace: "resources",
      patches: createRemovePatches(deleteTargets.resourceIds),
    },
    {
      namespace: "styleSourceSelections",
      patches: createRemovePatches(
        deleteTargets.styleSourceSelectionInstanceIds
      ),
    },
    {
      namespace: "styleSources",
      patches: createRemovePatches(deleteTargets.localStyleSourceIds),
    },
    {
      namespace: "styles",
      patches: Array.from(styles)
        .filter((styleDecl) =>
          deleteTargets.localStyleSourceIds.has(styleDecl.styleSourceId)
        )
        .map((styleDecl) => ({
          op: "remove" as const,
          path: [getStyleDeclKey(styleDecl)],
        })),
    },
  ]);
};

export const createInstanceMovePatches = ({
  instances,
  moves,
}: {
  instances: Instances;
  moves: Array<{
    instanceId: Instance["id"];
    parentInstanceId: Instance["id"];
    insertIndex?: number;
    position?: "end";
  }>;
}) => {
  const mutableInstances = cloneInstances(instances);
  const patches: BuilderPatchChange["patches"] = [];
  const errors: Array<
    | { type: "instance-not-found"; instanceId: Instance["id"] }
    | { type: "parent-not-found"; instanceId: Instance["id"] }
    | { type: "target-parent-not-found"; parentInstanceId: Instance["id"] }
    | { type: "descendant-target"; instanceId: Instance["id"] }
    | { type: "insert-index-outside-parent"; parentInstanceId: Instance["id"] }
  > = [];

  for (const move of moves) {
    const instance = mutableInstances.get(move.instanceId);
    if (instance === undefined) {
      errors.push({ type: "instance-not-found", instanceId: move.instanceId });
      continue;
    }
    const parent = findParentInstanceReference(mutableInstances, instance.id);
    if (parent === undefined) {
      errors.push({ type: "parent-not-found", instanceId: instance.id });
      continue;
    }
    const nextParent = mutableInstances.get(move.parentInstanceId);
    if (nextParent === undefined) {
      errors.push({
        type: "target-parent-not-found",
        parentInstanceId: move.parentInstanceId,
      });
      continue;
    }
    const descendantIds = collectInstanceIds(mutableInstances, instance.id);
    if (descendantIds.includes(nextParent.id)) {
      errors.push({ type: "descendant-target", instanceId: instance.id });
      continue;
    }
    const requestedInsertIndex = move.insertIndex ?? nextParent.children.length;
    if (requestedInsertIndex > nextParent.children.length) {
      errors.push({
        type: "insert-index-outside-parent",
        parentInstanceId: nextParent.id,
      });
      continue;
    }
    const insertIndex =
      parent.instance.id === nextParent.id &&
      requestedInsertIndex > parent.childIndex
        ? getSameParentAdjustedInsertIndex({
            currentIndex: parent.childIndex,
            requestedIndex: requestedInsertIndex,
          })
        : requestedInsertIndex;
    patches.push({
      op: "remove" as const,
      path: [parent.instance.id, "children", parent.childIndex] as [
        string,
        "children",
        number,
      ],
    });
    patches.push({
      op: "add" as const,
      path: [nextParent.id, "children", insertIndex],
      value: createInstanceChild(instance.id),
    });
    parent.instance.children.splice(parent.childIndex, 1);
    nextParent.children.splice(
      insertIndex,
      0,
      createInstanceChild(instance.id)
    );
  }

  return {
    errors,
    patches,
  };
};

export const createInstanceMovePayload = (
  input: Parameters<typeof createInstanceMovePatches>[0]
) => {
  const { errors, patches } = createInstanceMovePatches(input);
  return {
    errors,
    payload: compactBuilderPatchPayload([{ namespace: "instances", patches }]),
  };
};

export const createInstanceAppendPayload = ({
  parent,
  instances,
  createdInstances,
  insertIndex,
  mode,
  props,
  dataSources,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  parent: Instance;
  instances: Instances;
  createdInstances: Instance[];
  insertIndex: number;
  mode: "append" | "prepend" | "replace";
  props: Iterable<Prop>;
  dataSources: Iterable<DataSource>;
  styleSources: Iterable<StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
}) => {
  const parentChildren = parent.children ?? [];
  const replacedInstanceIds =
    mode === "replace"
      ? new Set(
          parentChildren.flatMap((child) =>
            child.type === "id"
              ? collectInstanceIds(instances, child.value)
              : []
          )
        )
      : new Set<Instance["id"]>();
  const childInsertPatches =
    createdInstances.length === 0
      ? []
      : parentChildren.length === 0 && insertIndex === 0
        ? [
            {
              op: "add" as const,
              path: [parent.id, "children"],
              value: createdInstances.map((instance) =>
                createInstanceChild(instance.id)
              ),
            },
          ]
        : createdInstances.map((instance, index) => ({
            op: "add" as const,
            path: [parent.id, "children", insertIndex + index],
            value: createInstanceChild(instance.id),
          }));
  const payload: BuilderPatchChange[] = [
    {
      namespace: "instances",
      patches: [
        ...(mode === "replace"
          ? sortChildRemovalPatches(
              parentChildren.map((_child, index) => ({
                op: "remove" as const,
                path: [parent.id, "children", index] as [
                  string,
                  "children",
                  number,
                ],
              }))
            )
          : []),
        ...createdInstances.map((instance) => ({
          op: "add" as const,
          path: [instance.id],
          value: instance,
        })),
        ...childInsertPatches,
      ],
    },
  ];
  if (replacedInstanceIds.size > 0) {
    const [instanceCleanup, ...cleanupPayload] = createInstanceCleanupPayload({
      instanceIds: replacedInstanceIds,
      props,
      dataSources,
      styleSources,
      styleSourceSelections,
      styles,
    });
    payload[0]?.patches.push(...(instanceCleanup?.patches ?? []));
    payload.push(...compactBuilderPatchPayload(cleanupPayload));
  }

  return {
    payload,
    replacedInstanceIds: Array.from(replacedInstanceIds),
  };
};

export const createInstanceDeletePayload = ({
  instances,
  instanceIds,
  pageRootIds = new Set(),
  props,
  dataSources,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  instances: Instances;
  instanceIds: Instance["id"][];
  pageRootIds?: Set<Instance["id"]>;
  props: Iterable<Prop>;
  dataSources: Iterable<DataSource>;
  styleSources: Iterable<StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
}) => {
  const parentRemovalPatches = [];
  const deleteRootIds = new Set<Instance["id"]>();
  const deletedInstanceIds = new Set<Instance["id"]>();
  const errors: Array<
    | { type: "page-root"; instanceId: Instance["id"] }
    | { type: "instance-not-found"; instanceId: Instance["id"] }
    | { type: "parent-not-found"; instanceId: Instance["id"] }
  > = [];

  for (const instanceId of instanceIds) {
    if (pageRootIds.has(instanceId)) {
      errors.push({ type: "page-root", instanceId });
      continue;
    }
    if (instances.has(instanceId) === false) {
      errors.push({ type: "instance-not-found", instanceId });
      continue;
    }
    const parent = findParentInstanceReference(instances, instanceId);
    if (parent === undefined) {
      errors.push({ type: "parent-not-found", instanceId });
      continue;
    }
    parentRemovalPatches.push({
      op: "remove" as const,
      path: [parent.instance.id, "children", parent.childIndex] as [
        string,
        "children",
        number,
      ],
    });
    deleteRootIds.add(instanceId);
  }

  for (const descendantId of collectExclusiveInstanceIds(
    instances,
    deleteRootIds
  )) {
    deletedInstanceIds.add(descendantId);
  }

  const payload = createInstanceCleanupPayload({
    instanceIds: deletedInstanceIds,
    props,
    dataSources,
    styleSources,
    styleSourceSelections,
    styles,
  });
  if (parentRemovalPatches.length > 0) {
    const sortedParentRemovalPatches =
      sortChildRemovalPatches(parentRemovalPatches);
    if (payload[0]?.namespace === "instances") {
      payload[0].patches.unshift(...sortedParentRemovalPatches);
    } else {
      payload.unshift({
        namespace: "instances",
        patches: sortedParentRemovalPatches,
      });
    }
  }

  return { errors, payload, instanceIds: Array.from(deletedInstanceIds) };
};

type TextTreeUpdateError =
  | { type: "root-not-found"; rootInstanceId: Instance["id"] }
  | { type: "root-update-missing"; rootInstanceId: Instance["id"] }
  | { type: "duplicate-update"; instanceId: Instance["id"] }
  | { type: "id-collision"; instanceId: Instance["id"] }
  | {
      type: "dangling-child";
      instanceId: Instance["id"];
      childId: Instance["id"];
    };

export const createTextTreeUpdatePayload = ({
  instances,
  rootInstanceId,
  updates,
}: {
  instances: Instances;
  rootInstanceId: Instance["id"];
  updates: Instance[];
}): {
  errors: TextTreeUpdateError[];
  payload: BuilderPatchChange[];
} => {
  if (instances.has(rootInstanceId) === false) {
    return {
      errors: [{ type: "root-not-found", rootInstanceId }],
      payload: [],
    };
  }
  const oldTreeIds = findTreeInstanceIds(instances, rootInstanceId);
  const updateIds = new Set<Instance["id"]>();
  const errors: TextTreeUpdateError[] = [];
  for (const instance of updates) {
    if (updateIds.has(instance.id)) {
      errors.push({ type: "duplicate-update", instanceId: instance.id });
      continue;
    }
    updateIds.add(instance.id);
    if (oldTreeIds.has(instance.id) === false && instances.has(instance.id)) {
      errors.push({ type: "id-collision", instanceId: instance.id });
    }
  }
  if (updateIds.has(rootInstanceId) === false) {
    errors.push({ type: "root-update-missing", rootInstanceId });
  }
  for (const instance of updates) {
    for (const child of instance.children) {
      if (child.type === "id" && updateIds.has(child.value) === false) {
        errors.push({
          type: "dangling-child",
          instanceId: instance.id,
          childId: child.value,
        });
      }
    }
  }
  if (errors.length > 0) {
    return { errors, payload: [] };
  }

  const patches: BuilderPatchChange["patches"] = [];
  for (const instance of updates) {
    patches.push({
      op: instances.has(instance.id) ? "replace" : "add",
      path: [instance.id],
      value: instance,
    });
  }
  for (const instanceId of oldTreeIds) {
    if (updateIds.has(instanceId) === false) {
      patches.push({ op: "remove", path: [instanceId] });
    }
  }
  return {
    errors: [],
    payload: compactBuilderPatchPayload([{ namespace: "instances", patches }]),
  };
};

const createUniqueTextTreeInstanceId = ({
  existingIds,
  remappedIds,
  createId,
}: {
  existingIds: Set<Instance["id"]>;
  remappedIds: Set<Instance["id"]>;
  createId: () => Instance["id"];
}) => {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const id = createId();
    if (existingIds.has(id) === false && remappedIds.has(id) === false) {
      return id;
    }
  }
  return throwBuilderRuntimeError(
    "CONFLICT",
    "Could not generate a unique text tree instance id"
  );
};

const remapTextTreeTemporaryIds = ({
  instances,
  rootInstanceId,
  updates,
  createId,
}: {
  instances: Instances;
  rootInstanceId: Instance["id"];
  updates: Instance[];
  createId: () => Instance["id"];
}) => {
  const oldTreeIds = findTreeInstanceIds(instances, rootInstanceId);
  const idMap = new Map<Instance["id"], Instance["id"]>();
  const remappedIds = new Set<Instance["id"]>();
  for (const instance of updates) {
    if (oldTreeIds.has(instance.id)) {
      remappedIds.add(instance.id);
      continue;
    }
    const id = createUniqueTextTreeInstanceId({
      existingIds: new Set(instances.keys()),
      remappedIds,
      createId,
    });
    idMap.set(instance.id, id);
    remappedIds.add(id);
  }
  const remapId = (id: Instance["id"]) => idMap.get(id) ?? id;
  return {
    idMap,
    updates: updates.map((instance) => ({
      ...instance,
      id: remapId(instance.id),
      children: instance.children.map((child) =>
        child.type === "id" ? { ...child, value: remapId(child.value) } : child
      ),
    })),
  };
};

export const createInstanceClonePayload = ({
  instances,
  sourceInstanceId,
  targetParent,
  insertIndex,
  props,
  styleSourceSelections,
  styleSources,
  styles,
  createId,
}: {
  instances: Map<Instance["id"], Instance>;
  sourceInstanceId: Instance["id"];
  targetParent: Instance;
  insertIndex: number;
  props: Iterable<Prop>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styleSources: Iterable<StyleSource>;
  styles: Map<string, StyleDecl>;
  createId: () => string;
}):
  | {
      clonedRootId: Instance["id"];
      clonedInstanceIds: Instance["id"][];
      payload: BuilderPatchChange[];
    }
  | undefined => {
  const { clonedInstances, nextIdById } = cloneInstanceSubtree({
    instances,
    rootInstanceId: sourceInstanceId,
    createId,
  });
  const clonedRootId = nextIdById.get(sourceInstanceId);
  if (clonedRootId === undefined) {
    return;
  }
  const propPatches = createPropClonePatches({
    nextIdById,
    props,
    createId,
  });
  return {
    clonedRootId,
    clonedInstanceIds: clonedInstances.map(([instanceId]) => instanceId),
    payload: compactBuilderPatchPayload([
      {
        namespace: "instances",
        patches: [
          ...clonedInstances.map(([instanceId, instance]) => ({
            op: "add" as const,
            path: [instanceId],
            value: instance,
          })),
          {
            op: "add" as const,
            path: [targetParent.id, "children", insertIndex],
            value: createInstanceChild(clonedRootId),
          },
        ],
      },
      ...(propPatches.length === 0
        ? []
        : [{ namespace: "props" as const, patches: propPatches }]),
      ...createStyleClonePayload({
        styleSourceSelections,
        styleSources,
        styles,
        nextIdById,
        createId,
      }),
    ]),
  };
};

type TreeMutationState = Pick<
  BuilderState,
  | "instances"
  | "pages"
  | "props"
  | "dataSources"
  | "styleSources"
  | "styleSourceSelections"
  | "styles"
>;

const getRequiredTreeMutationState = (state: TreeMutationState) => {
  const instances = getRequiredInstances(state);
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  if (state.dataSources === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Data sources namespace is missing"
    );
  }
  if (state.styleSources === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Style sources namespace is missing"
    );
  }
  if (state.styleSourceSelections === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Style source selections namespace is missing"
    );
  }
  if (state.styles === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Styles namespace is missing"
    );
  }
  return {
    pages: state.pages,
    instances,
    props: state.props,
    dataSources: state.dataSources,
    styleSources: state.styleSources,
    styleSourceSelections: state.styleSourceSelections,
    styles: state.styles,
  };
};

const treeInvalidates = [
  "instances",
  "props",
  "dataSources",
  "resources",
  "styleSourceSelections",
  "styleSources",
  "styles",
] as const;

const getDeleteTarget = (
  instances: Instances,
  instancePath: InstancePath
): Instance => {
  let targetInstance = instancePath[0].instance;
  const parentInstance = instancePath[1]?.instance;
  const grandparentInstance = instancePath[2]?.instance;

  if (
    parentInstance?.component === "Fragment" &&
    parentInstance.children.length === 1 &&
    grandparentInstance !== undefined &&
    countInstanceChildReferences(instances, parentInstance.id) < 2
  ) {
    targetInstance = parentInstance;
  }

  return targetInstance;
};

const getNextSelectorAfterDelete = (
  instancePath: InstancePath
): undefined | Instance["id"][] => {
  const [selectedItem, parentItem] = instancePath;
  if (parentItem === undefined) {
    return;
  }
  const parentInstanceSelector = parentItem.instanceSelector;
  const siblingIds = parentItem.instance.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);
  const position = siblingIds.indexOf(selectedItem.instance.id);
  const siblingId = siblingIds[position + 1] ?? siblingIds[position - 1];
  if (siblingId !== undefined) {
    return [siblingId, ...parentInstanceSelector];
  }
  const grandparentItem = instancePath[2];
  return getDirectSharedSlotChildBoundary(instancePath)
    ? grandparentItem?.instanceSelector
    : parentInstanceSelector;
};

export const moveInstances = (
  state: Pick<
    BuilderState,
    "instances" | "pages" | "props" | "dataSources" | "resources"
  >,
  input: z.infer<typeof moveInstancesInput>
) => {
  const instances = getRequiredInstances(state);
  const { errors, payload: movePayload } = createInstanceMovePayload({
    instances,
    moves: input.moves,
  });
  const error = errors.at(0);
  if (error?.type === "instance-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  if (error?.type === "parent-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
  }
  if (error?.type === "target-parent-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  if (error?.type === "descendant-target") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instance cannot be moved into itself or a descendant"
    );
  }
  if (error?.type === "insert-index-outside-parent") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Insert index is outside parent children"
    );
  }
  const movedInstances = new Map(
    Array.from(instances, ([id, instance]) => [id, structuredClone(instance)])
  );
  applyBuilderPatchPayloadMutable((namespace) => {
    if (namespace === "instances") {
      return movedInstances;
    }
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Unexpected move patch namespace "${namespace}"`
    );
  }, movePayload);
  const rebindPayload =
    state.props === undefined ||
    state.dataSources === undefined ||
    state.resources === undefined
      ? []
      : produceWebstudioDataMutation(
          {
            pages: state.pages,
            instances,
            props: state.props,
            dataSources: state.dataSources,
            resources: state.resources,
          },
          (draft) => {
            applyBuilderPatchPayloadMutable((namespace) => {
              if (namespace === "instances") {
                return draft.instances;
              }
              return throwBuilderRuntimeError(
                "BAD_REQUEST",
                `Unexpected move patch namespace "${namespace}"`
              );
            }, movePayload);
            for (const move of input.moves) {
              rebindTreeVariablesMutable({
                startingInstanceId: move.instanceId,
                ...draft,
              });
            }
          }
        ).payload;
  const payload = rebindPayload.length === 0 ? movePayload : rebindPayload;
  return createRuntimeMutation({
    payload,
    result: { instanceIds: input.moves.map((move) => move.instanceId) },
    invalidatesNamespaces: [
      "instances",
      "pages",
      "props",
      "dataSources",
      "resources",
    ],
  });
};

const removeMovedInstanceFromParentMutable = (
  data: Pick<WebstudioData, "instances">,
  instancePath: InstancePath
) => {
  const targetInstance = instancePath[0]?.instance;
  const parentItem = instancePath[1];
  const grandparentItem = instancePath[2];
  if (targetInstance === undefined || parentItem === undefined) {
    return;
  }
  const parentInstance = data.instances.get(parentItem.instance.id);
  if (parentInstance === undefined) {
    return;
  }
  removeChildReferenceMutable(parentInstance.children, targetInstance.id);
  if (
    parentInstance.component === "Fragment" &&
    parentInstance.children.length === 0 &&
    grandparentItem !== undefined &&
    countInstanceChildReferences(data.instances, parentInstance.id) < 2
  ) {
    const grandparentInstance = data.instances.get(grandparentItem.instance.id);
    removeChildReferenceMutable(
      grandparentInstance?.children ?? [],
      parentInstance.id
    );
    data.instances.delete(parentInstance.id);
  }
};

const reorderInstanceWithinParentMutable = (
  data: Pick<WebstudioData, "instances">,
  rootInstanceId: Instance["id"],
  dropTarget: DroppableTarget
) => {
  const [parentId] = dropTarget.parentSelector;
  const parent = data.instances.get(parentId);
  if (parent === undefined) {
    return;
  }
  const prevPosition = findChildReferenceIndex(parent.children, rootInstanceId);
  const child = parent.children[prevPosition];
  if (child === undefined) {
    return;
  }
  parent.children.splice(prevPosition, 1);
  if (dropTarget.position === "end") {
    parent.children.push(child);
    return;
  }
  parent.children.splice(
    getSameParentAdjustedInsertIndex({
      currentIndex: prevPosition,
      requestedIndex: dropTarget.position,
    }),
    0,
    child
  );
};

const moveInstanceToParentMutable = (
  data: Omit<WebstudioData, "pages">,
  rootInstanceId: Instance["id"],
  sourceInstancePath: InstancePath,
  dropTarget: DroppableTarget,
  createId: () => string
) => {
  dropTarget =
    getReparentDropTargetMutable(
      data.instances,
      data.props,
      componentMetas,
      dropTarget,
      createId
    ) ?? dropTarget;
  removeMovedInstanceFromParentMutable(data, sourceInstancePath);
  const [newParentId] = dropTarget.parentSelector;
  const newParent = data.instances.get(newParentId);
  const newChild = createInstanceChild(rootInstanceId);
  if (dropTarget.position === "end") {
    newParent?.children.push(newChild);
  } else {
    newParent?.children.splice(dropTarget.position, 0, newChild);
  }
  applyBuilderPatchPayloadMutable(
    (namespace) => getWebstudioDataNamespace(data as WebstudioData, namespace),
    createTreeVariableRebindPayload({
      startingInstanceId: rootInstanceId,
      pages: undefined,
      instances: data.instances,
      props: data.props,
      dataSources: data.dataSources,
      resources: data.resources,
    })
  );
  return [rootInstanceId, ...dropTarget.parentSelector];
};

export const reparentInstanceMutable = ({
  data,
  sourceInstanceSelector,
  dropTarget,
  createId,
}: {
  data: Omit<WebstudioData, "pages">;
  sourceInstanceSelector: Instance["id"][];
  dropTarget: DroppableTarget;
  createId: () => string;
}) => {
  sourceInstanceSelector = normalizeLegacySlotParentInSelectorMutable(
    data.instances,
    sourceInstanceSelector,
    createId
  );
  const initialSourceInstancePath = getInstancePathFromSelector(
    sourceInstanceSelector,
    data.instances
  );
  const reparentSource = prepareSlotReparentMutable({
    instancePath: initialSourceInstancePath ?? [],
    dropTarget,
  });
  const sourceInstancePath = reparentSource.instancePath;
  dropTarget = reparentSource.dropTarget;
  sourceInstanceSelector = sourceInstancePath[0]?.instanceSelector;
  if (sourceInstanceSelector === undefined) {
    return;
  }
  const [rootInstanceId] = sourceInstanceSelector;
  const instanceDescendants = findTreeInstanceIds(
    data.instances,
    rootInstanceId
  );
  for (const instanceId of instanceDescendants) {
    if (dropTarget.parentSelector.includes(instanceId)) {
      return;
    }
  }
  dropTarget =
    getSlotFragmentDropTargetMutable(data.instances, dropTarget, createId) ??
    dropTarget;
  if (sourceInstanceSelector[1] === dropTarget.parentSelector[0]) {
    reorderInstanceWithinParentMutable(data, rootInstanceId, dropTarget);
    return sourceInstanceSelector;
  }
  return moveInstanceToParentMutable(
    data,
    rootInstanceId,
    sourceInstancePath,
    dropTarget,
    createId
  );
};

export const reparentInstance = (
  state: Partial<FullInstanceMutationState>,
  input: z.infer<typeof reparentInstanceInput>,
  context: BuilderRuntimeContext
) => {
  const beforeData = getRequiredFullInstanceMutationData(state);
  let instanceSelector: ReturnType<typeof reparentInstanceMutable>;
  const { payload } = produceWebstudioDataMutation(beforeData, (draft) => {
    instanceSelector = reparentInstanceMutable({
      data: draft,
      sourceInstanceSelector: input.sourceInstanceSelector,
      dropTarget: input.dropTarget,
      createId: context.createId,
    });
  });
  return createRuntimeMutation({
    payload,
    result: { instanceSelector },
    invalidatesNamespaces: [
      "instances",
      "props",
      "dataSources",
      "resources",
      "styleSourceSelections",
      "styleSources",
      "styles",
      "breakpoints",
      "assets",
    ],
  });
};

export const wrapInstance = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof wrapInstanceInput>,
  context: { createId: () => string }
) => {
  const instances = getRequiredInstances(state);
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  const [instanceId, parentInstanceId] = input.instanceSelector;
  if (instanceId === undefined || parentInstanceId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instance selector must include instance and parent"
    );
  }
  const hasSlotInPath = input.instanceSelector.some(
    (selectorInstanceId) =>
      instances.get(selectorInstanceId)?.component === "Slot"
  );
  if (hasSlotInPath) {
    const instancePath = getInstancePathFromSelector(
      input.instanceSelector,
      instances
    );
    if (instancePath === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
    }
    const nextInstances = cloneInstances(instances);
    const nextInstancePath = normalizeLegacySlotInstancePathMutable(
      nextInstances,
      instancePath,
      context.createId
    );
    const [selectedItem, parentItem] = nextInstancePath;
    if (parentItem === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
    }
    if (
      isRichTextContent({
        instanceSelector: selectedItem.instanceSelector,
        instances: nextInstances,
        props: state.props,
        metas: componentMetas,
      })
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Cannot wrap textual content"
      );
    }
    const wrapperInstanceId = context.createId();
    const wrapperInstance: Instance = {
      type: "instance",
      id: wrapperInstanceId,
      component: input.component,
      children: [createInstanceChild(selectedItem.instance.id)],
    };
    if (input.tag !== undefined || input.component === elementComponent) {
      wrapperInstance.tag = input.tag ?? "div";
    }
    const parentInstance = nextInstances.get(parentItem.instance.id);
    if (parentInstance === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
    }
    nextInstances.set(wrapperInstanceId, wrapperInstance);
    replaceChildReferenceMutable(
      parentInstance,
      selectedItem.instance.id,
      wrapperInstanceId
    );
    const wrapperSelector = [wrapperInstanceId, ...parentItem.instanceSelector];
    const isSatisfying = isTreeSatisfyingContentModel({
      instances: nextInstances,
      props: state.props,
      metas: componentMetas,
      instanceSelector: wrapperSelector,
    });
    if (isSatisfying === false) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Wrapped tree violates content model"
      );
    }
    return createRuntimeMutation({
      payload: createInstancesMapPayload({
        before: instances,
        after: nextInstances,
      }),
      result: { instanceSelector: wrapperSelector },
      invalidatesNamespaces: ["instances"],
    });
  }
  const selectedInstance = instances.get(instanceId);
  if (selectedInstance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const parentInstance = instances.get(parentInstanceId);
  if (parentInstance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
  }
  const childIndex = findChildReferenceIndex(
    parentInstance.children,
    instanceId
  );
  if (childIndex === -1) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Parent does not contain selected instance"
    );
  }
  if (
    isRichTextContent({
      instanceSelector: input.instanceSelector,
      instances,
      props: state.props,
      metas: componentMetas,
    })
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Cannot wrap textual content"
    );
  }

  const wrapperInstanceId = context.createId();
  const wrapperInstance: Instance = {
    type: "instance",
    id: wrapperInstanceId,
    component: input.component,
    children: [createInstanceChild(instanceId)],
  };
  if (input.tag !== undefined || input.component === elementComponent) {
    wrapperInstance.tag = input.tag ?? "div";
  }
  const nextInstances = new Map(instances);
  const nextParentInstance: Instance = {
    ...parentInstance,
    children: [...parentInstance.children],
  };
  nextParentInstance.children[childIndex] =
    createInstanceChild(wrapperInstanceId);
  nextInstances.set(parentInstanceId, nextParentInstance);
  nextInstances.set(wrapperInstanceId, wrapperInstance);
  const wrapperSelector = [
    wrapperInstanceId,
    ...input.instanceSelector.slice(1),
  ];
  const isSatisfying = isTreeSatisfyingContentModel({
    instances: nextInstances,
    props: state.props,
    metas: componentMetas,
    instanceSelector: wrapperSelector,
  });
  if (isSatisfying === false) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Wrapped tree violates content model"
    );
  }

  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      {
        namespace: "instances",
        patches: [
          { op: "add", path: [wrapperInstanceId], value: wrapperInstance },
          {
            op: "replace",
            path: [parentInstanceId, "children", childIndex],
            value: createInstanceChild(wrapperInstanceId),
          },
        ],
      },
    ]),
    result: { instanceSelector: wrapperSelector },
    invalidatesNamespaces: ["instances"],
  });
};

const getPresetDefaultTag = (component: Instance["component"]) => {
  const meta = componentMetas.get(component);
  return Object.keys(
    (meta as { presetStyle?: Record<string, unknown> } | undefined)
      ?.presetStyle ?? {}
  ).at(0);
};

export const canConvertInstance = ({
  instanceId,
  instanceSelector,
  component,
  tag,
  currentTag,
  instances,
  props,
  metas,
}: {
  instanceId: Instance["id"];
  instanceSelector: Instance["id"][];
  component: Instance["component"];
  tag?: Instance["tag"];
  currentTag?: Instance["tag"];
  instances: Instances;
  props: Props;
  metas: Map<Instance["component"], WsComponentMeta>;
}) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return false;
  }

  const nextInstance: Instance = {
    ...instance,
    component,
  };
  if (tag !== undefined || component === elementComponent) {
    nextInstance.tag = tag ?? currentTag ?? "div";
  } else {
    const meta = metas.get(component);
    const defaultTag = Object.keys(
      (meta as { presetStyle?: Record<string, unknown> } | undefined)
        ?.presetStyle ?? {}
    ).at(0);
    if (defaultTag !== undefined) {
      nextInstance.tag = defaultTag;
    }
  }

  const nextInstances = new Map(instances);
  nextInstances.set(instanceId, nextInstance);
  return isTreeSatisfyingContentModel({
    instances: nextInstances,
    props,
    metas,
    instanceSelector,
  });
};

const getUnwrappedInstanceSelector = ({
  selectedItem,
  parentItem,
}: {
  selectedItem: { instance: { id: Instance["id"] } };
  parentItem: { instanceSelector: Instance["id"][] };
}) => [selectedItem.instance.id, ...parentItem.instanceSelector.slice(1)];

const validateUnwrappedInstance = ({
  instances,
  props,
  selectedItem,
  parentItem,
}: {
  instances: Instances;
  props: NonNullable<BuilderState["props"]>;
  selectedItem: { instance: { id: Instance["id"] } };
  parentItem: { instanceSelector: Instance["id"][] };
}) =>
  isTreeSatisfyingContentModel({
    instances,
    props,
    metas: componentMetas,
    instanceSelector: getUnwrappedInstanceSelector({
      selectedItem,
      parentItem,
    }),
  });

const unwrapInstanceMutable = ({
  instances,
  props,
  selectedItem,
  parentItem,
}: {
  instances: Instances;
  props: NonNullable<BuilderState["props"]>;
  selectedItem: {
    instanceSelector: Instance["id"][];
    instance: { id: Instance["id"] };
  };
  parentItem: {
    instanceSelector: Instance["id"][];
    instance: { id: Instance["id"] };
  };
}) => {
  if (
    isRichTextContent({
      instanceSelector: selectedItem.instanceSelector,
      instances,
      props,
      metas: componentMetas,
    })
  ) {
    return { success: false, error: "Cannot unwrap textual instance" };
  }

  const parentInstance = instances.get(parentItem.instance.id);
  const selectedInstance = instances.get(selectedItem.instance.id);
  if (parentInstance === undefined || selectedInstance === undefined) {
    return { success: false, error: "Instance not found" };
  }

  const grandparentId = parentItem.instanceSelector[1];
  if (grandparentId === undefined) {
    return { success: false, error: "Cannot unwrap instance at root level" };
  }
  const grandparentInstance = instances.get(grandparentId);
  if (grandparentInstance === undefined) {
    return { success: false, error: "Grandparent instance not found" };
  }

  const selectedParentId = selectedItem.instanceSelector[1];
  const selectedParentInstance = instances.get(selectedParentId);
  if (
    parentInstance.component === "Slot" &&
    selectedParentInstance?.component === "Fragment" &&
    selectedItem.instanceSelector[2] === parentItem.instance.id &&
    selectedParentInstance.children.length === 1 &&
    selectedParentInstance.children[0]?.type === "id" &&
    selectedParentInstance.children[0].value === selectedItem.instance.id
  ) {
    removeChildReferenceMutable(
      selectedParentInstance.children,
      selectedItem.instance.id
    );
    replaceChildReferenceMutable(
      grandparentInstance,
      parentItem.instance.id,
      selectedItem.instance.id
    );
    if (countInstanceChildReferences(instances, parentItem.instance.id) === 0) {
      instances.delete(parentItem.instance.id);
    }
    if (
      countInstanceChildReferences(instances, selectedParentInstance.id) === 0
    ) {
      instances.delete(selectedParentInstance.id);
    }
    return validateUnwrappedInstance({
      instances,
      props,
      selectedItem,
      parentItem,
    })
      ? { success: true }
      : { success: false, error: "Cannot unwrap instance" };
  }

  if (instances.get(parentItem.instanceSelector[1])?.component === "Slot") {
    replaceChildReferenceMutable(
      grandparentInstance,
      parentItem.instance.id,
      selectedItem.instance.id
    );
    return validateUnwrappedInstance({
      instances,
      props,
      selectedItem,
      parentItem,
    })
      ? { success: true }
      : { success: false, error: "Cannot unwrap instance" };
  }

  removeChildReferenceMutable(
    parentInstance.children,
    selectedItem.instance.id
  );
  if (parentInstance.children.length === 0) {
    instances.delete(parentItem.instance.id);
  }

  const parentIndex = findChildReferenceIndex(
    grandparentInstance.children,
    parentItem.instance.id
  );
  if (parentIndex !== -1) {
    if (parentInstance.children.length === 0) {
      replaceChildReferenceMutable(
        grandparentInstance,
        parentItem.instance.id,
        selectedItem.instance.id
      );
    } else {
      grandparentInstance.children.splice(
        parentIndex + 1,
        0,
        createInstanceChild(selectedItem.instance.id)
      );
    }
  }

  return validateUnwrappedInstance({
    instances,
    props,
    selectedItem,
    parentItem,
  })
    ? { success: true }
    : { success: false, error: "Cannot unwrap instance" };
};

export const convertInstance = (
  state: Pick<BuilderState, "instances" | "props"> &
    Partial<FullInstanceMutationState>,
  input: z.infer<typeof convertInstanceInput>,
  context: BuilderRuntimeContext
) => {
  const instances = getRequiredInstances(state);
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  const hasSlotInPath = input.instanceSelector.some(
    (selectorInstanceId) =>
      instances.get(selectorInstanceId)?.component === "Slot"
  );
  if (hasSlotInPath) {
    const beforeData = getRequiredFullInstanceMutationData(state);
    let instanceId: Instance["id"] | undefined;
    const { payload } = produceWebstudioDataMutation(beforeData, (draft) => {
      const instancePath = getInstancePathFromSelector(
        input.instanceSelector,
        draft.instances
      );
      if (instancePath === undefined) {
        return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
      }
      const [initialSelectedItem] = instancePath;
      if (initialSelectedItem.instance.component === "Slot") {
        getSlotFragmentDropTargetMutable(
          draft.instances,
          {
            parentSelector: initialSelectedItem.instanceSelector,
            position: "end",
          },
          context.createId
        );
      }
      const nextInstancePath = normalizeLegacySlotInstancePathMutable(
        draft.instances,
        instancePath,
        context.createId
      );
      const [selectedItem] = nextInstancePath;
      const selectedInstance = selectedItem.instance;
      if (selectedInstance.component === "Slot" && input.component !== "Slot") {
        detachSharedSlotChildrenMutable({
          data: draft,
          slotId: selectedInstance.id,
          projectId: context.projectId ?? "",
          createId: context.createId,
        });
      }
      const nextInstance = draft.instances.get(selectedInstance.id);
      if (nextInstance === undefined) {
        return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
      }
      instanceId = selectedInstance.id;
      nextInstance.component = input.component;
      if (input.tag !== undefined || input.component === elementComponent) {
        nextInstance.tag = input.tag ?? input.currentTag ?? "div";
        applyBuilderPatchPayloadMutable(
          (namespace) => getWebstudioDataNamespace(draft, namespace),
          createPropDeletePayload({
            deletions: [{ instanceId: selectedInstance.id, name: "tag" }],
            instances: draft.instances,
            props: draft.props.values(),
          }).payload
        );
        const renames = Array.from(draft.props.values()).flatMap((prop) => {
          if (prop.instanceId !== selectedInstance.id) {
            return [];
          }
          const name = reactPropsToStandardAttributes[prop.name];
          return name === undefined
            ? []
            : [{ propId: prop.id, name, propIdPrefix: prop.instanceId }];
        });
        if (renames.length > 0) {
          applyBuilderPatchPayloadMutable(
            (namespace) => getWebstudioDataNamespace(draft, namespace),
            createPropRenamePayload({
              props: draft.props.values(),
              renames,
            }).payload
          );
        }
      } else {
        const defaultTag = getPresetDefaultTag(input.component);
        if (defaultTag !== undefined) {
          nextInstance.tag = defaultTag;
        }
      }
      const isSatisfying = isTreeSatisfyingContentModel({
        instances: draft.instances,
        props: draft.props,
        metas: componentMetas,
        instanceSelector: selectedItem.instanceSelector,
      });
      if (isSatisfying === false) {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          "Converted tree violates content model"
        );
      }
    });
    return createRuntimeMutation({
      payload,
      result: { instanceId },
      invalidatesNamespaces: [
        "instances",
        "props",
        "dataSources",
        "resources",
        "styleSourceSelections",
        "styleSources",
        "styles",
        "breakpoints",
        "assets",
      ],
    });
  }
  const [instanceId] = input.instanceSelector;
  if (instanceId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instance selector is empty"
    );
  }
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }

  const payload: BuilderPatchChange[] = [];
  const instancePatches: BuilderPatchChange["patches"] = [];
  const nextInstance: Instance = {
    ...instance,
    component: input.component,
  };

  instancePatches.push({
    op: "replace",
    path: [instanceId, "component"],
    value: input.component,
  });

  if (input.tag !== undefined || input.component === elementComponent) {
    const tag = input.tag ?? input.currentTag ?? "div";
    nextInstance.tag = tag;
    if (instance.tag !== tag) {
      instancePatches.push({
        op: instance.tag === undefined ? "add" : "replace",
        path: [instanceId, "tag"],
        value: tag,
      });
    }
    payload.push(
      ...createPropDeletePayload({
        deletions: [{ instanceId, name: "tag" }],
        instances,
        props: state.props.values(),
      }).payload
    );
    const renames = Array.from(state.props.values()).flatMap((prop) => {
      if (prop.instanceId !== instanceId) {
        return [];
      }
      const name = reactPropsToStandardAttributes[prop.name];
      return name === undefined
        ? []
        : [{ propId: prop.id, name, propIdPrefix: prop.instanceId }];
    });
    if (renames.length > 0) {
      payload.push(
        ...createPropRenamePayload({
          props: state.props.values(),
          renames,
        }).payload
      );
    }
  } else {
    const defaultTag = getPresetDefaultTag(input.component);
    if (defaultTag !== undefined) {
      nextInstance.tag = defaultTag;
      if (instance.tag !== defaultTag) {
        instancePatches.push({
          op: instance.tag === undefined ? "add" : "replace",
          path: [instanceId, "tag"],
          value: defaultTag,
        });
      }
    } else {
      delete nextInstance.tag;
      if (instance.tag !== undefined) {
        instancePatches.push({
          op: "remove",
          path: [instanceId, "tag"],
        });
      }
    }
  }

  const isSatisfying = canConvertInstance({
    instanceId,
    instanceSelector: input.instanceSelector,
    component: input.component,
    tag: input.tag,
    currentTag: input.currentTag,
    instances,
    props: state.props,
    metas: componentMetas,
  });
  if (isSatisfying === false) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Converted tree violates content model"
    );
  }

  payload.push({ namespace: "instances", patches: instancePatches });
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload(payload),
    result: { instanceId },
    invalidatesNamespaces: ["instances", "props"],
  });
};

export const unwrapInstance = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof unwrapInstanceInput>,
  context: BuilderRuntimeContext
) => {
  const instances = getRequiredInstances(state);
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  const [instanceId, parentInstanceId, grandparentInstanceId] =
    input.instanceSelector;
  if (
    instanceId === undefined ||
    parentInstanceId === undefined ||
    grandparentInstanceId === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instance selector must include instance, parent, and grandparent"
    );
  }
  const selectedInstance = instances.get(instanceId);
  const parentInstance = instances.get(parentInstanceId);
  const grandparentInstance = instances.get(grandparentInstanceId);
  if (
    selectedInstance === undefined ||
    parentInstance === undefined ||
    grandparentInstance === undefined
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  if (
    input.instanceSelector.some(
      (selectorInstanceId) =>
        instances.get(selectorInstanceId)?.component === "Slot"
    )
  ) {
    const nextInstances = cloneInstances(instances);
    const instancePath = getInstancePathFromSelector(
      input.instanceSelector,
      nextInstances
    );
    if (instancePath === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
    }
    const normalizedInstancePath = normalizeLegacySlotInstancePathMutable(
      nextInstances,
      instancePath,
      context.createId
    );
    const directSlotBoundary = getDirectSharedSlotChildBoundary(
      normalizedInstancePath
    );
    const [selectedItem, defaultParentItem] = normalizedInstancePath;
    const parentItem = directSlotBoundary?.slotItem ?? defaultParentItem;
    if (parentItem === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
    }
    if (
      directSlotBoundary !== undefined &&
      directSlotBoundary.fragmentItem.instance.children.length > 1
    ) {
      const slotParentId = directSlotBoundary.slotItem.instanceSelector[1];
      const slotParent = nextInstances.get(slotParentId);
      if (slotParent === undefined) {
        return throwBuilderRuntimeError(
          "NOT_FOUND",
          "Slot parent instance not found"
        );
      }
      removeChildReferenceMutable(
        directSlotBoundary.fragmentItem.instance.children,
        selectedItem.instance.id
      );
      const slotPosition = findChildReferenceIndex(
        slotParent.children,
        directSlotBoundary.slotItem.instance.id
      );
      if (slotPosition === -1) {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          "Slot parent does not contain Slot"
        );
      }
      slotParent.children.splice(
        slotPosition + 1,
        0,
        createInstanceChild(selectedItem.instance.id)
      );
      const instanceSelector = [
        selectedItem.instance.id,
        ...directSlotBoundary.slotItem.instanceSelector.slice(1),
      ];
      const matches = isTreeSatisfyingContentModel({
        instances: nextInstances,
        props: state.props,
        metas: componentMetas,
        instanceSelector,
      });
      if (matches === false) {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          "Cannot unwrap instance"
        );
      }
      return createRuntimeMutation({
        payload: createInstancesMapPayload({
          before: instances,
          after: nextInstances,
        }),
        result: { instanceSelector },
        invalidatesNamespaces: ["instances"],
      });
    }
    const result = unwrapInstanceMutable({
      instances: nextInstances,
      props: state.props,
      selectedItem,
      parentItem,
    });
    if (result.success === false) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        result.error ?? "Cannot unwrap instance"
      );
    }
    return createRuntimeMutation({
      payload: createInstancesMapPayload({
        before: instances,
        after: nextInstances,
      }),
      result: {
        instanceSelector: getUnwrappedInstanceSelector({
          selectedItem,
          parentItem,
        }),
      },
      invalidatesNamespaces: ["instances"],
    });
  }
  if (
    isRichTextContent({
      instanceSelector: input.instanceSelector,
      instances,
      props: state.props,
      metas: componentMetas,
    })
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Cannot unwrap textual instance"
    );
  }
  const selectedIndexInParent = findChildReferenceIndex(
    parentInstance.children,
    instanceId
  );
  if (selectedIndexInParent === -1) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Parent does not contain selected instance"
    );
  }
  const parentIndexInGrandparent = findChildReferenceIndex(
    grandparentInstance.children,
    parentInstanceId
  );
  if (parentIndexInGrandparent === -1) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Grandparent does not contain parent instance"
    );
  }

  const nextInstances = new Map(instances);
  const nextParentInstance: Instance = {
    ...parentInstance,
    children: [...parentInstance.children],
  };
  nextParentInstance.children.splice(selectedIndexInParent, 1);
  const nextGrandparentInstance: Instance = {
    ...grandparentInstance,
    children: [...grandparentInstance.children],
  };
  if (nextParentInstance.children.length === 0) {
    nextInstances.delete(parentInstanceId);
    nextGrandparentInstance.children[parentIndexInGrandparent] =
      createInstanceChild(instanceId);
  } else {
    nextInstances.set(parentInstanceId, nextParentInstance);
    nextGrandparentInstance.children.splice(
      parentIndexInGrandparent + 1,
      0,
      createInstanceChild(instanceId)
    );
  }
  nextInstances.set(grandparentInstanceId, nextGrandparentInstance);
  const nextInstanceSelector = [instanceId, ...input.instanceSelector.slice(2)];
  const isSatisfying = isTreeSatisfyingContentModel({
    instances: nextInstances,
    props: state.props,
    metas: componentMetas,
    instanceSelector: nextInstanceSelector,
  });
  if (isSatisfying === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Cannot unwrap instance");
  }

  const patches: BuilderPatchChange["patches"] = [];
  if (nextParentInstance.children.length === 0) {
    patches.push({ op: "remove", path: [parentInstanceId] });
  } else {
    patches.push({
      op: "remove",
      path: [parentInstanceId, "children", selectedIndexInParent],
    });
  }
  if (nextParentInstance.children.length === 0) {
    patches.push({
      op: "replace",
      path: [grandparentInstanceId, "children", parentIndexInGrandparent],
      value: createInstanceChild(instanceId),
    });
  } else {
    patches.push({
      op: "add",
      path: [grandparentInstanceId, "children", parentIndexInGrandparent + 1],
      value: createInstanceChild(instanceId),
    });
  }

  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([{ namespace: "instances", patches }]),
    result: { instanceSelector: nextInstanceSelector },
    invalidatesNamespaces: ["instances"],
  });
};

export const fillGrid = (
  state: TreeMutationState,
  input: z.infer<typeof fillGridInput>,
  context: { createId: () => string }
) => {
  const mutationState = getRequiredTreeMutationState(state);
  const parentInstance = mutationState.instances.get(input.parentInstanceId);
  if (parentInstance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
  }
  const existingChildCount = parentInstance.children.filter(
    (child) => child.type === "id"
  ).length;
  const cellsToAdd = input.totalCells - existingChildCount;
  if (cellsToAdd <= 0) {
    return createRuntimeMutation({
      payload: [],
      result: { instanceIds: [], styleSourceIds: [] },
      invalidatesNamespaces: ["instances"],
    });
  }

  const instancePatches: BuilderPatchChange["patches"] = [];
  const styleSourcePatches: BuilderPatchChange["patches"] = [];
  const styleSourceSelectionPatches: BuilderPatchChange["patches"] = [];
  const stylePatches: BuilderPatchChange["patches"] = [];
  const instanceIds: Instance["id"][] = [];
  const styleSourceIds: StyleSource["id"][] = [];

  for (let index = 0; index < cellsToAdd; index += 1) {
    const instanceId = context.createId();
    const styleSourceId = context.createId();
    const instance: Instance = {
      type: "instance",
      id: instanceId,
      component: "Box",
      children: [],
    };
    const styleSource = createLocalStyleSource(styleSourceId);
    const displayStyle = createStyleDecl({
      styleSourceId,
      breakpointId: input.breakpointId,
      property: "display",
      value: { type: "keyword", value: "flex" },
    });
    const flexDirectionStyle = createStyleDecl({
      styleSourceId,
      breakpointId: input.breakpointId,
      property: "flexDirection",
      value: { type: "keyword", value: "column" },
    });

    instanceIds.push(instanceId);
    styleSourceIds.push(styleSourceId);
    instancePatches.push({
      op: "add",
      path: [instanceId],
      value: instance,
    });
    instancePatches.push({
      op: "add",
      path: [
        input.parentInstanceId,
        "children",
        parentInstance.children.length + index,
      ],
      value: createInstanceChild(instanceId),
    });
    styleSourcePatches.push({
      op: "add",
      path: [styleSourceId],
      value: styleSource,
    });
    styleSourceSelectionPatches.push({
      op: "add",
      path: [instanceId],
      value: {
        instanceId,
        values: [styleSourceId],
      } satisfies StyleSourceSelection,
    });
    stylePatches.push({
      op: "add",
      path: [getStyleDeclKey(displayStyle)],
      value: displayStyle,
    });
    stylePatches.push({
      op: "add",
      path: [getStyleDeclKey(flexDirectionStyle)],
      value: flexDirectionStyle,
    });
  }

  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      { namespace: "instances", patches: instancePatches },
      { namespace: "styleSources", patches: styleSourcePatches },
      {
        namespace: "styleSourceSelections",
        patches: styleSourceSelectionPatches,
      },
      { namespace: "styles", patches: stylePatches },
    ]),
    result: { instanceIds, styleSourceIds },
    invalidatesNamespaces: [
      "instances",
      "styleSourceSelections",
      "styleSources",
      "styles",
    ],
  });
};

export const setInstanceTag = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof setInstanceTagInput>
) => {
  const instances = getRequiredInstances(state);
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  const instance = instances.get(input.instanceId);
  if (instance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }

  const payload: BuilderPatchChange[] = [];
  if (input.legacyPropName !== undefined) {
    payload.push(
      ...createPropDeletePayload({
        deletions: [
          {
            instanceId: input.instanceId,
            name: input.legacyPropName,
          },
        ],
        instances,
        props: state.props.values(),
      }).payload
    );
  }
  if (instance.tag !== input.tag) {
    payload.push({
      namespace: "instances",
      patches: [
        {
          op: instance.tag === undefined ? "add" : "replace",
          path: [input.instanceId, "tag"],
          value: input.tag,
        },
      ],
    });
  }

  return createRuntimeMutation({
    payload: compactBuilderPatchPayload(payload),
    result: { instanceId: input.instanceId, tag: input.tag },
    invalidatesNamespaces: ["instances", "props"],
  });
};

export const setInstanceLabel = (
  state: Pick<BuilderState, "instances">,
  input: z.infer<typeof setInstanceLabelInput>
) => {
  const instances = getRequiredInstances(state);
  const instance = instances.get(input.instanceId);
  if (instance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }

  const label = input.label.trim();
  const targetInstances =
    instance.component === "Slot"
      ? Array.from(instances.values()).filter(
          (currentInstance) =>
            currentInstance.component === "Slot" &&
            getSlotChildrenSignature(currentInstance) ===
              getSlotChildrenSignature(instance)
        )
      : [instance];

  const patches: BuilderPatchChange["patches"] = [];
  for (const targetInstance of targetInstances) {
    if (targetInstance.label === label) {
      continue;
    }
    patches.push({
      op: targetInstance.label === undefined ? "add" : "replace",
      path: [targetInstance.id, "label"],
      value: label,
    });
  }

  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([{ namespace: "instances", patches }]),
    result: {
      instanceIds: targetInstances.map((targetInstance) => targetInstance.id),
      label,
    },
    invalidatesNamespaces: ["instances"],
  });
};

export const deleteInstances = (
  state: TreeMutationState,
  input: z.infer<typeof deleteInstancesInput>
) => {
  const mutationState = getRequiredTreeMutationState(state);
  const pageRootIds = new Set(
    Array.from(mutationState.pages?.pages.values() ?? []).map(
      (page) => page.rootInstanceId
    )
  );
  const { errors, payload, instanceIds } = createInstanceDeletePayload({
    instances: mutationState.instances,
    instanceIds: input.instanceIds,
    pageRootIds,
    props: mutationState.props.values(),
    dataSources: mutationState.dataSources.values(),
    styleSources: mutationState.styleSources.values(),
    styleSourceSelections: mutationState.styleSourceSelections.values(),
    styles: mutationState.styles.values(),
  });
  const error = errors.at(0);
  if (error?.type === "page-root") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Page root instance cannot be deleted"
    );
  }
  if (error?.type === "instance-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  if (error?.type === "parent-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
  }
  return createRuntimeMutation({
    payload,
    result: { instanceIds },
    invalidatesNamespaces: treeInvalidates,
  });
};

export const deleteInstanceBySelector = (
  state: Partial<FullInstanceMutationState>,
  input: z.infer<typeof deleteInstanceBySelectorInput>,
  context: BuilderRuntimeContext
) => {
  const beforeData = getRequiredFullInstanceMutationData(state);
  let nextInstanceSelector: ReturnType<typeof getNextSelectorAfterDelete>;
  let instanceIds: Instance["id"][] = [];
  const { payload } = produceWebstudioDataMutation(beforeData, (draft) => {
    const instancePath = getInstancePathFromSelector(
      input.instanceSelector,
      draft.instances
    );
    if (instancePath === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
    }
    const normalizedInstancePath = normalizeLegacySlotInstancePathMutable(
      draft.instances,
      instancePath,
      context.createId
    );
    nextInstanceSelector = getNextSelectorAfterDelete(normalizedInstancePath);
    const targetInstance = getDeleteTarget(
      draft.instances,
      normalizedInstancePath
    );
    const pageRootIds = new Set(
      Array.from(draft.pages.pages.values()).map((page) => page.rootInstanceId)
    );
    const deletePayload = createInstanceDeletePayload({
      instances: draft.instances,
      instanceIds: [targetInstance.id],
      pageRootIds,
      props: draft.props.values(),
      dataSources: draft.dataSources.values(),
      styleSources: draft.styleSources.values(),
      styleSourceSelections: draft.styleSourceSelections.values(),
      styles: draft.styles.values(),
    });
    const error = deletePayload.errors.at(0);
    if (error?.type === "page-root") {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Page root instance cannot be deleted"
      );
    }
    if (error?.type === "instance-not-found") {
      return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
    }
    if (error?.type === "parent-not-found") {
      return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
    }
    instanceIds = deletePayload.instanceIds;
    applyBuilderPatchPayloadMutable(
      (namespace) => getWebstudioDataNamespace(draft, namespace),
      deletePayload.payload
    );
  });
  return createRuntimeMutation({
    payload,
    result: { instanceIds, instanceSelector: nextInstanceSelector },
    invalidatesNamespaces: [
      "instances",
      "props",
      "dataSources",
      "resources",
      "styleSourceSelections",
      "styleSources",
      "styles",
      "breakpoints",
      "assets",
    ],
  });
};

export const updateTextTree = (
  state: Pick<
    BuilderState,
    | "instances"
    | "props"
    | "dataSources"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >,
  input: z.infer<typeof updateTextTreeInput>,
  context: BuilderRuntimeContext
) => {
  const instances = getRequiredInstances(state);
  const remapped = remapTextTreeTemporaryIds({
    instances,
    rootInstanceId: input.rootInstanceId,
    updates: input.instances,
    createId: context.createId,
  });
  const { errors, payload } = createTextTreeUpdatePayload({
    instances,
    rootInstanceId: input.rootInstanceId,
    updates: remapped.updates,
  });
  const error = errors.at(0);
  if (error?.type === "root-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Root instance not found");
  }
  if (error?.type === "root-update-missing") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Updated text tree must include the root instance"
    );
  }
  if (error?.type === "duplicate-update") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Updated text tree contains duplicate instance "${error.instanceId}"`
    );
  }
  if (error?.type === "id-collision") {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Updated text tree instance "${error.instanceId}" already exists outside the edited tree`
    );
  }
  if (error?.type === "dangling-child") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Updated text tree instance "${error.instanceId}" references missing child "${error.childId}"`
    );
  }
  const removedInstanceIds = new Set(
    Array.from(findTreeInstanceIds(instances, input.rootInstanceId)).filter(
      (instanceId) =>
        remapped.updates.some((instance) => instance.id === instanceId) ===
        false
    )
  );
  const instancePatches = payload.flatMap((change) =>
    change.namespace === "instances"
      ? change.patches.filter(
          (patch) => patch.op !== "remove" || patch.path.length !== 1
        )
      : []
  );
  const cleanupPayload = createInstanceCleanupPayload({
    instanceIds: removedInstanceIds,
    props: state.props?.values() ?? [],
    dataSources: state.dataSources?.values() ?? [],
    styleSources: state.styleSources?.values() ?? [],
    styleSourceSelections: state.styleSourceSelections?.values() ?? [],
    styles: state.styles?.values() ?? [],
  });
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      { namespace: "instances", patches: instancePatches },
      ...cleanupPayload,
    ]),
    result: {
      rootInstanceId: input.rootInstanceId,
      instanceIds: remapped.updates.map((instance) => instance.id),
      idMap: Object.fromEntries(remapped.idMap),
    },
    invalidatesNamespaces: treeInvalidates,
  });
};

export const cloneInstance = (
  state: TreeMutationState,
  input: z.infer<typeof cloneInstanceInput>,
  context: BuilderRuntimeContext
) => {
  const mutationState = getRequiredTreeMutationState(state);
  const source = mutationState.instances.get(input.sourceInstanceId);
  if (source === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const targetParent =
    input.targetParentInstanceId === undefined
      ? findParentInstanceReference(mutationState.instances, source.id)
          ?.instance
      : mutationState.instances.get(input.targetParentInstanceId);
  if (targetParent === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const insertIndex = input.insertIndex ?? targetParent.children.length;
  if (insertIndex > targetParent.children.length) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Insert index is outside parent children"
    );
  }
  const clone = createInstanceClonePayload({
    instances: mutationState.instances,
    sourceInstanceId: source.id,
    targetParent,
    insertIndex,
    props: mutationState.props.values(),
    styleSourceSelections: mutationState.styleSourceSelections.values(),
    styleSources: mutationState.styleSources.values(),
    styles: mutationState.styles,
    createId: context.createId,
  });
  if (clone === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Source instance could not be cloned"
    );
  }
  return createRuntimeMutation({
    payload: clone.payload,
    result: {
      instanceId: clone.clonedRootId,
      instanceIds: clone.clonedInstanceIds,
    },
    invalidatesNamespaces: [
      "instances",
      "props",
      "styleSourceSelections",
      "styleSources",
      "styles",
    ],
  });
};

export const serializeInstanceSummary = (
  instance: Instance,
  depth: number,
  parent?: { id: Instance["id"]; index: number }
) => ({
  id: instance.id,
  component: instance.component,
  tag: instance.tag,
  label: instance.label,
  childCount: instance.children.length,
  depth,
  parentId: parent?.id,
  indexWithinParent: parent?.index,
});

const getInstanceParents = (instances: Instances) => {
  const parents = new Map<
    Instance["id"],
    { id: Instance["id"]; index: number }
  >();
  for (const instance of instances.values()) {
    for (const [index, child] of instance.children.entries()) {
      if (child.type === "id") {
        parents.set(child.value, { id: instance.id, index });
      }
    }
  }
  return parents;
};

const getInstanceAncestors = (
  instances: Instances,
  instanceId: Instance["id"]
) => {
  const parents = getInstanceParents(instances);
  const ancestorPath = [];
  const visited = new Set<Instance["id"]>();
  let parent = parents.get(instanceId);
  while (parent !== undefined) {
    if (visited.has(parent.id)) {
      break;
    }
    visited.add(parent.id);
    const instance = instances.get(parent.id);
    if (instance === undefined) {
      break;
    }
    ancestorPath.push({ instance, childIndex: parent.index });
    parent = parents.get(parent.id);
  }
  return ancestorPath.reverse().map(({ instance, childIndex }, depth) => ({
    ...serializeInstanceSummary(instance, depth, parents.get(instance.id)),
    childIndex,
  }));
};

export const isTextContentChild = (
  child: Instance["children"][number] | undefined
): child is TextContentChild =>
  child?.type === "text" || child?.type === "expression";

export const getTextContentChild = (instance: Instance, childIndex: number) => {
  const child = instance.children[childIndex];
  return isTextContentChild(child) ? child : undefined;
};

export const findTextContentChild = (
  instances: Iterable<Instance>,
  input: {
    instanceId: Instance["id"];
    childIndex: number;
  }
):
  | { status: "found"; child: TextContentChild }
  | { status: "instance-not-found" }
  | { status: "child-not-found" }
  | { status: "not-text-content" } => {
  let instance: Instance | undefined;
  for (const item of instances) {
    if (item.id === input.instanceId) {
      instance = item;
      break;
    }
  }
  if (instance === undefined) {
    return { status: "instance-not-found" };
  }
  if (instance.children[input.childIndex] === undefined) {
    return { status: "child-not-found" };
  }
  const child = getTextContentChild(instance, input.childIndex);
  if (child === undefined) {
    return { status: "not-text-content" };
  }
  return { status: "found", child };
};

export const createTextContentChild = ({
  type,
  value,
}: {
  type: TextContentChild["type"];
  value: string;
}): TextContentChild => ({ type, value });

export const getTextContentErrors = ({
  type,
  value,
}: {
  type: TextContentChild["type"];
  value: string;
}) => {
  if (type === "text") {
    return [];
  }
  return getExpressionErrors(value);
};

const throwTextExpressionValidationError = (errors: readonly string[]): never =>
  throwBuilderValidationError(
    errors.join("\n"),
    errors.map((detail) => ({
      code: "invalid_expression",
      path: ["text"],
      message: "Invalid Webstudio expression",
      constraint: "valid_webstudio_expression",
      example: "item.title",
      detail,
    }))
  );

export const setTextContentMutable = (
  instance: Instance,
  type: TextContentChild["type"],
  value: string
) => {
  instance.children = [createTextContentChild({ type, value })];
};

export const createTextContentUpdatePayload = ({
  instanceId,
  childIndex,
  child,
}: {
  instanceId: Instance["id"];
  childIndex: number;
  child: TextContentChild;
}) => [
  {
    namespace: "instances" as const,
    patches: [
      {
        op: "replace" as const,
        path: [instanceId, "children", childIndex],
        value: child,
      },
    ],
  },
];

export const createTextContentResetPayload = ({
  instanceId,
}: {
  instanceId: Instance["id"];
}) => [
  {
    namespace: "instances" as const,
    patches: [
      {
        op: "replace" as const,
        path: [instanceId, "children"],
        value: [],
      },
    ],
  },
];

export const createTextContentSetPayload = ({
  instanceId,
  child,
}: {
  instanceId: Instance["id"];
  child: TextContentChild;
}) => [
  {
    namespace: "instances" as const,
    patches: [
      {
        op: "replace" as const,
        path: [instanceId, "children"],
        value: [child],
      },
    ],
  },
];

export const serializeTextNodes = ({
  instances,
  rootInstanceIds,
  instanceId,
  mode = "all",
  contains,
  maxValueLength,
}: {
  instances: Iterable<Instance>;
  rootInstanceIds?: Set<Instance["id"]>;
  instanceId?: Instance["id"];
  mode?: "text" | "expression" | "all";
  contains?: string;
  maxValueLength?: number;
}) => {
  const texts = [];
  for (const instance of instances) {
    if (instanceId !== undefined && instance.id !== instanceId) {
      continue;
    }
    if (
      rootInstanceIds !== undefined &&
      rootInstanceIds.has(instance.id) === false
    ) {
      continue;
    }
    for (const [childIndex, child] of instance.children.entries()) {
      if (isTextContentChild(child) === false) {
        continue;
      }
      if (mode !== "all" && child.type !== mode) {
        continue;
      }
      if (contains !== undefined && child.value.includes(contains) === false) {
        continue;
      }
      texts.push({
        instanceId: instance.id,
        childIndex,
        component: instance.component,
        label: instance.label,
        mode: child.type,
        value:
          maxValueLength === undefined
            ? child.value
            : child.value.slice(0, maxValueLength),
      });
    }
  }
  return texts;
};

const getPageFilteredRootInstanceIds = (
  state: Pick<BuilderState, "pages" | "instances">,
  input: { pageId?: string; pagePath?: string }
) => {
  const pages = getSerializedPages(state);
  const page = findSerializedPageByInput(pages, input);
  if (
    page === undefined &&
    (input.pageId !== undefined || input.pagePath !== undefined)
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  return page === undefined ? undefined : [page.rootInstanceId];
};

export const listInstances = (
  state: Pick<BuilderState, "pages" | "instances">,
  input: PaginatedOutputInput & {
    pageId?: string;
    pagePath?: string;
    rootInstanceId?: string;
    maxDepth?: number;
    topLevelOnly?: boolean;
    component?: string;
    tag?: string;
    labelContains?: string;
  } = {}
) => {
  const instances = getRequiredInstances(state);
  const rootInstanceIds =
    input.rootInstanceId === undefined
      ? getPageFilteredRootInstanceIds(state, input)
      : [input.rootInstanceId];
  const depths = getInstanceDepths(instances, rootInstanceIds);
  const parents = getInstanceParents(instances);
  const results = [];
  for (const [instanceId, depth] of depths) {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    if (input.maxDepth !== undefined && depth > input.maxDepth) {
      continue;
    }
    if (input.topLevelOnly === true && depth > 0) {
      continue;
    }
    if (
      input.component !== undefined &&
      instance.component !== input.component
    ) {
      continue;
    }
    if (input.tag !== undefined && instance.tag !== input.tag) {
      continue;
    }
    if (
      input.labelContains !== undefined &&
      instance.label?.includes(input.labelContains) !== true
    ) {
      continue;
    }
    const compact = serializeInstanceSummary(
      instance,
      depth,
      parents.get(instance.id)
    );
    results.push(
      projectOutput({
        input,
        compact,
        expanded: () => ({ record: instance }),
      })
    );
  }
  const { items, ...pagination } = paginateOutput({
    items: results,
    cursor: input.cursor,
    limit: input.limit,
    filters: {
      pageId: input.pageId,
      pagePath: input.pagePath,
      rootInstanceId: input.rootInstanceId,
      maxDepth: input.maxDepth,
      topLevelOnly: input.topLevelOnly,
      component: input.component,
      tag: input.tag,
      labelContains: input.labelContains,
    },
    verbose: input.verbose,
  });
  return { instances: items, ...pagination };
};

export const listTextInstances = (
  state: Pick<BuilderState, "pages" | "instances">,
  input: {
    pageId?: string;
    pagePath?: string;
    instanceId?: string;
    mode?: "text" | "expression" | "all";
    contains?: string;
  } & PaginatedOutputInput = {}
) => {
  const compactValueLength = 160;
  const rootInstanceIds = getPageFilteredRootInstanceIds(state, input);
  const pageInstanceIds =
    rootInstanceIds === undefined
      ? undefined
      : new Set(
          getInstanceDepths(getRequiredInstances(state), rootInstanceIds).keys()
        );
  const texts = serializeTextNodes({
    instances: getRequiredInstances(state).values(),
    rootInstanceIds: pageInstanceIds,
    instanceId: input.instanceId,
    mode: input.mode,
    contains: input.contains,
  });
  const { items, ...pagination } = paginateOutput({
    items: texts.map((text) => {
      const { value, ...summary } = text;
      const valuePreview = value.slice(0, compactValueLength);
      return projectOutput({
        input,
        compact: {
          ...summary,
          valuePreview,
          valueLength: value.length,
          truncated: valuePreview.length < value.length,
        },
        expanded: () => ({ value }),
      });
    }),
    cursor: input.cursor,
    limit: input.limit,
    filters: {
      pageId: input.pageId,
      pagePath: input.pagePath,
      instanceId: input.instanceId,
      mode: input.mode,
      contains: input.contains,
    },
    verbose: input.verbose,
  });
  return { texts: items, ...pagination };
};

type InstanceInspection = ReturnType<typeof serializeInstanceSummary> & {
  ancestors?: ReturnType<typeof getInstanceAncestors>;
  props?: Prop[];
  styles?: ReturnType<typeof serializeStyleDeclarations>;
  children?: Array<ReturnType<typeof serializeInstanceSummary>>;
  bindings?: Prop[];
  sources?: string[];
};

export const inspectInstance = (
  state: Pick<
    BuilderState,
    "instances" | "props" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: {
    instanceId: string;
    include?: Array<
      "props" | "styles" | "children" | "bindings" | "sources" | "ancestors"
    >;
    childDepth?: number;
  }
) => {
  const instances = getRequiredInstances(state);
  const instance = instances.get(input.instanceId);
  if (instance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const depths = getInstanceDepths(instances, [input.instanceId]);
  const parents = getInstanceParents(instances);
  const include = new Set(input.include ?? []);
  const details: InstanceInspection = serializeInstanceSummary(
    instance,
    depths.get(instance.id) ?? 0,
    parents.get(instance.id)
  );
  if (include.has("ancestors")) {
    details.ancestors = getInstanceAncestors(instances, instance.id);
  }
  if (include.has("props")) {
    details.props = Array.from(state.props?.values() ?? []).filter(
      (prop) => prop.instanceId === instance.id
    );
  }
  if (include.has("styles")) {
    details.styles = serializeStyleDeclarations({
      styles: state.styles?.values() ?? [],
      styleSources: state.styleSources?.values() ?? [],
      styleSourceSelections: state.styleSourceSelections?.values() ?? [],
      instanceIds: new Set([instance.id]),
    });
  }
  if (include.has("children")) {
    const maxDepth = input.childDepth ?? 1;
    details.children = Array.from(instances.values())
      .filter((child) => {
        const depth = depths.get(child.id);
        return depth !== undefined && depth > 0 && depth <= maxDepth;
      })
      .map((child) =>
        serializeInstanceSummary(
          child,
          depths.get(child.id) ?? 0,
          parents.get(child.id)
        )
      );
  }
  if (include.has("bindings")) {
    details.bindings = Array.from(state.props?.values() ?? []).filter(
      (prop) =>
        prop.instanceId === instance.id &&
        (prop.type === "expression" ||
          prop.type === "parameter" ||
          prop.type === "resource" ||
          prop.type === "action")
    );
  }
  if (include.has("sources")) {
    details.sources =
      state.styleSourceSelections?.get(instance.id)?.values ?? [];
  }
  return details;
};

export const updateTextInstance = (
  state: Pick<BuilderState, "instances">,
  input: z.infer<typeof updateTextInstanceInput>
) => {
  const result = findTextContentChild(
    getRequiredInstances(state).values(),
    input
  );
  if (result.status === "instance-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  if (result.status === "child-not-found") {
    return throwBuilderRuntimeError("NOT_FOUND", "Child not found");
  }
  if (result.status === "not-text-content") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Child is not text or expression"
    );
  }
  const mode = input.mode ?? "text";
  const errors = getTextContentErrors({ type: mode, value: input.text });
  if (errors.length > 0) {
    return throwTextExpressionValidationError(errors);
  }
  const mutationResult = {
    instanceId: input.instanceId,
    childIndex: input.childIndex,
    mode,
  };
  if (result.child.value === input.text) {
    return createRuntimeMutation({
      payload: [],
      result: mutationResult,
      invalidatesNamespaces: ["instances"],
    });
  }
  return createRuntimeMutation({
    payload: createTextContentUpdatePayload({
      instanceId: input.instanceId,
      childIndex: input.childIndex,
      child: createTextContentChild({ type: mode, value: input.text }),
    }),
    result: mutationResult,
    invalidatesNamespaces: ["instances"],
  });
};

export const replaceText = (
  state: Pick<BuilderState, "pages" | "instances">,
  input: z.infer<typeof replaceTextInput>
) => {
  const instances = getRequiredInstances(state);
  const rootInstanceIds = getPageFilteredRootInstanceIds(state, input);
  const instanceIds = new Set(
    getInstanceDepths(instances, rootInstanceIds).keys()
  );
  const matches: Array<{
    instanceId: string;
    childIndex: number;
    before: string;
    after: string;
  }> = [];
  let matchingChildCount = 0;

  for (const instance of instances.values()) {
    if (instanceIds.has(instance.id) === false) {
      continue;
    }
    for (const [childIndex, child] of instance.children.entries()) {
      if (child.type !== "text") {
        continue;
      }
      const after = replaceTextValue(child.value, input);
      if (after === child.value) {
        continue;
      }
      matchingChildCount += 1;
      if (matches.length < input.limit) {
        matches.push({
          instanceId: instance.id,
          childIndex,
          before: child.value,
          after,
        });
      }
    }
  }

  return createRuntimeMutation({
    payload:
      matches.length === 0
        ? []
        : [
            {
              namespace: "instances",
              patches: matches.map((match) => ({
                op: "replace" as const,
                path: [match.instanceId, "children", match.childIndex],
                value: createTextContentChild({
                  type: "text",
                  value: match.after,
                }),
              })),
            },
          ],
    result: {
      changedCount: matches.length,
      matchingChildCount,
      truncated: matchingChildCount > matches.length,
      matches,
    },
    invalidatesNamespaces: matches.length === 0 ? [] : ["instances"],
  });
};

export const setTextContent = (
  state: Pick<BuilderState, "instances">,
  input: z.infer<typeof setTextContentInput>
) => {
  const instances = getRequiredInstances(state);
  const instance = instances.get(input.instanceId);
  if (instance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }

  if (input.operation === "reset") {
    return createRuntimeMutation({
      payload:
        instance.children.length === 0
          ? []
          : createTextContentResetPayload({ instanceId: input.instanceId }),
      result: {
        instanceId: input.instanceId,
        operation: input.operation,
      },
      invalidatesNamespaces: ["instances"],
    });
  }

  const errors = getTextContentErrors({
    type: input.mode,
    value: input.text,
  });
  if (errors.length > 0) {
    return throwTextExpressionValidationError(errors);
  }

  const child = createTextContentChild({
    type: input.mode,
    value: input.text,
  });
  return createRuntimeMutation({
    payload:
      instance.children.length === 1 &&
      instance.children[0]?.type === child.type &&
      instance.children[0].value === child.value
        ? []
        : createTextContentSetPayload({
            instanceId: input.instanceId,
            child,
          }),
    result: {
      instanceId: input.instanceId,
      operation: input.operation,
      mode: input.mode,
    },
    invalidatesNamespaces: ["instances"],
  });
};
