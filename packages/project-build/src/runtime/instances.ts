import {
  elementComponent,
  getStyleDeclKey,
  type DataSource,
  type Instance,
  type Instances,
  type Prop,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { getExpressionErrors } from "./expression-validation";
import { createRuntimeMutation } from "./mutation";
import { findSerializedPageByInput, getSerializedPages } from "./pages";
import { createPropClonePatches } from "./props";
import {
  createStyleClonePayload,
  serializeStyleDeclarations,
} from "./style-utils";
import { z } from "zod";

const insertIndexInput = z.number().int().nonnegative();

export const appendInstancesInput = z.object({
  parentInstanceId: z.string(),
  mode: z.enum(["append", "prepend", "replace"]).optional(),
  insertIndex: insertIndexInput.optional(),
  children: z
    .array(
      z.object({
        instanceId: z.string().optional(),
        component: z.string().optional(),
        tag: z.string(),
        label: z.string().optional(),
        text: z.string().optional(),
      })
    )
    .min(1),
});

export const moveInstancesInput = z.object({
  moves: z
    .array(
      z.object({
        instanceId: z.string(),
        parentInstanceId: z.string(),
        insertIndex: insertIndexInput.optional(),
      })
    )
    .min(1),
});

export const cloneInstanceInput = z.object({
  sourceInstanceId: z.string(),
  targetParentInstanceId: z.string().optional(),
  insertIndex: insertIndexInput.optional(),
});

export const deleteInstancesInput = z.object({
  instanceIds: z.array(z.string()).min(1),
});

export const updateTextInstanceInput = z.object({
  instanceId: z.string(),
  childIndex: z.number().int().nonnegative(),
  text: z.string(),
  mode: z.enum(["text", "expression"]).optional(),
});

export type TextContentChild = Extract<
  Instance["children"][number],
  { type: "text" | "expression" }
>;

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
  const referenceCounts = new Map<Instance["id"], number>();
  for (const instance of instances.values()) {
    for (const child of instance.children) {
      if (child.type !== "id") {
        continue;
      }
      referenceCounts.set(
        child.value,
        (referenceCounts.get(child.value) ?? 0) + 1
      );
    }
  }
  const instanceIds = new Set<Instance["id"]>();
  const visit = (instanceId: Instance["id"]) => {
    if (instanceIds.has(instanceId)) {
      return;
    }
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    instanceIds.add(instanceId);
    for (const child of instance.children) {
      if (child.type !== "id") {
        continue;
      }
      if (
        roots.has(child.value) === false &&
        (referenceCounts.get(child.value) ?? 0) > 1
      ) {
        continue;
      }
      visit(child.value);
    }
  };
  for (const rootInstanceId of roots) {
    visit(rootInstanceId);
  }
  return instanceIds;
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
  const localStyleSourceIds = findLocalStyleSourcesWithinInstances(
    styleSources,
    styleSourceSelections,
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

  for (const styleSourceSelection of styleSourceSelections) {
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
  }>;
}) => {
  const removalPatches = [];
  const addPatches = [];
  const errors: Array<
    | { type: "instance-not-found"; instanceId: Instance["id"] }
    | { type: "parent-not-found"; instanceId: Instance["id"] }
    | { type: "target-parent-not-found"; parentInstanceId: Instance["id"] }
    | { type: "descendant-target"; instanceId: Instance["id"] }
    | { type: "insert-index-outside-parent"; parentInstanceId: Instance["id"] }
  > = [];

  for (const move of moves) {
    const instance = instances.get(move.instanceId);
    if (instance === undefined) {
      errors.push({ type: "instance-not-found", instanceId: move.instanceId });
      continue;
    }
    const parent = findParentInstanceReference(instances, instance.id);
    if (parent === undefined) {
      errors.push({ type: "parent-not-found", instanceId: instance.id });
      continue;
    }
    const nextParent = instances.get(move.parentInstanceId);
    if (nextParent === undefined) {
      errors.push({
        type: "target-parent-not-found",
        parentInstanceId: move.parentInstanceId,
      });
      continue;
    }
    const descendantIds = collectInstanceIds(instances, instance.id);
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
    removalPatches.push({
      op: "remove" as const,
      path: [parent.instance.id, "children", parent.childIndex] as [
        string,
        "children",
        number,
      ],
    });
    addPatches.push({
      op: "add" as const,
      path: [nextParent.id, "children", insertIndex],
      value: createInstanceChild(instance.id),
    });
  }

  return {
    errors,
    patches: [...sortChildRemovalPatches(removalPatches), ...addPatches],
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
  const replacedInstanceIds =
    mode === "replace"
      ? new Set(
          parent.children.flatMap((child) =>
            child.type === "id"
              ? collectInstanceIds(instances, child.value)
              : []
          )
        )
      : new Set<Instance["id"]>();
  const payload: BuilderPatchChange[] = [
    {
      namespace: "instances",
      patches: [
        ...(mode === "replace"
          ? sortChildRemovalPatches(
              parent.children.map((_child, index) => ({
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
        ...createdInstances.map((instance, index) => ({
          op: "add" as const,
          path: [parent.id, "children", insertIndex + index],
          value: createInstanceChild(instance.id),
        })),
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
    for (const descendantId of collectInstanceIds(instances, instanceId)) {
      deletedInstanceIds.add(descendantId);
    }
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

export const appendInstances = (
  state: TreeMutationState,
  input: z.infer<typeof appendInstancesInput>,
  context: BuilderRuntimeContext
) => {
  const mutationState = getRequiredTreeMutationState(state);
  const parent = mutationState.instances.get(input.parentInstanceId);
  if (parent === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const mode = input.mode ?? "append";
  const insertIndex =
    mode === "replace"
      ? 0
      : mode === "prepend"
        ? 0
        : (input.insertIndex ?? parent.children.length);
  if (insertIndex > parent.children.length) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Insert index is outside parent children"
    );
  }
  const createdInstances = input.children.map((child) => {
    const instanceId = child.instanceId ?? context.createId();
    if (mutationState.instances.has(instanceId)) {
      return throwBuilderRuntimeError("CONFLICT", "Instance id already exists");
    }
    return {
      type: "instance" as const,
      id: instanceId,
      component: child.component ?? elementComponent,
      tag: child.tag,
      label: child.label,
      children:
        child.text === undefined
          ? []
          : [createTextContentChild({ type: "text", value: child.text })],
    };
  });
  const { payload, replacedInstanceIds } = createInstanceAppendPayload({
    parent,
    instances: mutationState.instances,
    createdInstances,
    insertIndex,
    mode,
    props: mutationState.props.values(),
    dataSources: mutationState.dataSources.values(),
    styleSources: mutationState.styleSources.values(),
    styleSourceSelections: mutationState.styleSourceSelections.values(),
    styles: mutationState.styles.values(),
  });
  return createRuntimeMutation({
    payload,
    result: {
      instanceIds: createdInstances.map((instance) => instance.id),
      removedInstanceIds: replacedInstanceIds,
    },
    invalidatesNamespaces: treeInvalidates,
  });
};

export const moveInstances = (
  state: Pick<BuilderState, "instances">,
  input: z.infer<typeof moveInstancesInput>
) => {
  const { errors, payload } = createInstanceMovePayload({
    instances: getRequiredInstances(state),
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
  return createRuntimeMutation({
    payload,
    result: { instanceIds: input.moves.map((move) => move.instanceId) },
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
  depth: number
) => ({
  id: instance.id,
  component: instance.component,
  tag: instance.tag,
  label: instance.label,
  childCount: instance.children.length,
  depth,
});

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
    mode?: TextContentChild["type"];
  }
):
  | { status: "found"; child: TextContentChild }
  | { status: "instance-not-found" }
  | { status: "child-not-found" }
  | { status: "not-text-content" }
  | { status: "mode-mismatch"; actual: TextContentChild["type"] } => {
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
  if (input.mode !== undefined && child.type !== input.mode) {
    return { status: "mode-mismatch", actual: child.type };
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
  input: {
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
  const results = [];
  for (const instance of instances.values()) {
    const depth = depths.get(instance.id);
    if (depth === undefined) {
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
    results.push(serializeInstanceSummary(instance, depth));
  }
  return { instances: results };
};

export const listTextInstances = (
  state: Pick<BuilderState, "pages" | "instances">,
  input: {
    pageId?: string;
    pagePath?: string;
    instanceId?: string;
    mode?: "text" | "expression" | "all";
    contains?: string;
    maxValueLength?: number;
  } = {}
) => {
  const rootInstanceIds = getPageFilteredRootInstanceIds(state, input);
  const pageInstanceIds =
    rootInstanceIds === undefined
      ? undefined
      : new Set(
          getInstanceDepths(getRequiredInstances(state), rootInstanceIds).keys()
        );
  return {
    texts: serializeTextNodes({
      instances: getRequiredInstances(state).values(),
      rootInstanceIds: pageInstanceIds,
      instanceId: input.instanceId,
      mode: input.mode,
      contains: input.contains,
      maxValueLength: input.maxValueLength,
    }),
  };
};

export const inspectInstance = (
  state: Pick<
    BuilderState,
    "instances" | "props" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: {
    instanceId: string;
    include?: Array<"props" | "styles" | "children" | "bindings" | "sources">;
    childDepth?: number;
  }
) => {
  const instances = getRequiredInstances(state);
  const instance = instances.get(input.instanceId);
  if (instance === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const depths = getInstanceDepths(instances, [input.instanceId]);
  const include = new Set(input.include ?? []);
  const details: Record<string, unknown> = serializeInstanceSummary(
    instance,
    depths.get(instance.id) ?? 0
  );
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
        serializeInstanceSummary(child, depths.get(child.id) ?? 0)
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
  if (result.status === "mode-mismatch") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Child is ${result.actual}, not ${input.mode}`
    );
  }

  const mode = input.mode ?? result.child.type;
  const errors = getTextContentErrors({ type: mode, value: input.text });
  if (errors.length > 0) {
    return throwBuilderRuntimeError("BAD_REQUEST", errors.join("\n"));
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
