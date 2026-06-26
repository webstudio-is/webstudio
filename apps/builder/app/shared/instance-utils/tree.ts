// Tree utilities own generic instance-tree mechanics that are not tied to a
// specific command: selector comparison, ancestry checks, drop target shaping,
// and style-source traversal within instance trees.
import { nanoid } from "nanoid";
import { shallowEqual } from "shallow-equal";
import type { z } from "zod";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type { CompactBuild } from "@webstudio-is/project-build";
import type {
  Instance,
  Instances,
  DataSource,
  Prop,
  Props,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSourceSelection,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  collectionComponent,
  elementComponent,
  findTreeInstanceIds,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import { compactBuildPatchPayload } from "../build-patch-utils";
import { isRichTextTree } from "../content-model";
import { getSlotFragmentDropTargetMutable } from "./slot";

// slots can have multiple parents so instance should be addressed
// with full rendered path to avoid double selections with slots
// and support deletion of slot child from specific parent
// selector starts with target instance and ends with root
export type InstanceSelector = Instance["id"][];

export const areInstanceSelectorsEqual = (
  left?: InstanceSelector,
  right?: InstanceSelector
) => {
  return (
    left !== undefined &&
    right !== undefined &&
    left.length === right.length &&
    left.every((instanceId, index) => instanceId === right[index])
  );
};

export const isDescendantOrSelf = (
  descendant: InstanceSelector,
  self: InstanceSelector
) => {
  if (self.length === 0) {
    return true;
  }

  if (descendant.length < self.length) {
    return false;
  }

  const endSlice = descendant.slice(-self.length);

  return shallowEqual(endSlice, self);
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
  build: Pick<CompactBuild, "instances" | "pages">,
  rootInstanceIds?: Instance["id"][]
) => {
  const instances = new Map(
    build.instances.map((instance) => [instance.id, instance])
  );
  const roots =
    rootInstanceIds ??
    Array.from(build.pages.pages.values()).map((page) => page.rootInstanceId);
  return getInstanceDepths(instances, roots);
};

export type DroppableTarget = {
  parentSelector: InstanceSelector;
  position: number | "end";
};

const getCollectionDropTarget = (
  instances: Instances,
  dropTarget: DroppableTarget
) => {
  const [parentId, grandparentId] = dropTarget.parentSelector;
  const parent = instances.get(parentId);
  const grandparent = instances.get(grandparentId);
  if (parent === undefined && grandparent?.component === collectionComponent) {
    return {
      parentSelector: dropTarget.parentSelector.slice(1),
      position: dropTarget.position,
    };
  }
};

/**
 * Navigator tree and canvas dnd do not have text representation
 * and position does not consider it and include only instances.
 * This function adjust the position to consider text children
 */
const adjustChildrenPosition = (
  children: Instance["children"],
  position: number
) => {
  let newPosition = 0;
  let idPosition = 0;
  for (let index = 0; index < children.length; index += 1) {
    newPosition = index;
    if (idPosition === position) {
      return newPosition;
    }
    const child = children[index];
    if (child.type === "id") {
      idPosition += 1;
    }
  }
  // the index after last item
  return newPosition + 1;
};

/**
 * Wrap children before and after drop target with spans
 * to preserve lexical specific components while allowing
 * to insert into editable components
 */
export const wrapEditableChildrenAroundDropTargetMutable = (
  instances: Instances,
  props: Props,
  metas: Map<string, WsComponentMeta>,
  dropTarget: DroppableTarget
) => {
  const [parentId] = dropTarget.parentSelector;
  const parentInstance = instances.get(parentId);
  if (parentInstance === undefined || parentInstance.children.length === 0) {
    return;
  }
  // wrap only containers with text and rich text childre
  const isParentRichText = isRichTextTree({
    instances,
    props,
    metas,
    instanceId: parentId,
  });
  if (!isParentRichText) {
    return;
  }
  const position =
    dropTarget.position === "end"
      ? parentInstance.children.length
      : adjustChildrenPosition(parentInstance.children, dropTarget.position);

  const newChildren: Instance["children"] = [];
  let newPosition = 0;
  // create left span when not at the beginning
  if (position !== 0) {
    const leftSpan: Instance = {
      id: nanoid(),
      type: "instance",
      component: elementComponent,
      tag: "span",
      children: parentInstance.children.slice(0, position),
    };
    newChildren.push({ type: "id", value: leftSpan.id });
    instances.set(leftSpan.id, leftSpan);
    newPosition = 1;
  }
  // create right span when not in the end
  if (position < parentInstance.children.length) {
    const rightSpan: Instance = {
      id: nanoid(),
      type: "instance",
      component: elementComponent,
      tag: "span",
      children: parentInstance.children.slice(position),
    };
    newChildren.push({ type: "id", value: rightSpan.id });
    instances.set(rightSpan.id, rightSpan);
  }
  parentInstance.children = newChildren;
  return {
    parentSelector: dropTarget.parentSelector,
    position: newPosition,
  };
};

export const getReparentDropTargetMutable = (
  instances: Instances,
  props: Props,
  metas: Map<string, WsComponentMeta>,
  dropTarget: DroppableTarget
): undefined | DroppableTarget => {
  dropTarget = getCollectionDropTarget(instances, dropTarget) ?? dropTarget;
  dropTarget =
    getSlotFragmentDropTargetMutable(instances, dropTarget) ?? dropTarget;
  dropTarget =
    wrapEditableChildrenAroundDropTargetMutable(
      instances,
      props,
      metas,
      dropTarget
    ) ?? dropTarget;
  return dropTarget;
};

export const cloneStyles = (
  styles: Styles,
  clonedStyleSourceIds: Map<Instance["id"], Instance["id"]>
) => {
  const clonedStyles: StyleDecl[] = [];
  for (const styleDecl of styles.values()) {
    const styleSourceId = clonedStyleSourceIds.get(styleDecl.styleSourceId);
    if (styleSourceId === undefined) {
      continue;
    }
    clonedStyles.push({
      ...styleDecl,
      styleSourceId,
    });
  }
  return clonedStyles;
};

export const cloneInstanceWithNewIds = ({
  instance,
  newInstanceIds,
}: {
  instance: Instance;
  newInstanceIds: Map<Instance["id"], Instance["id"]>;
}): Instance => {
  return {
    ...instance,
    id: newInstanceIds.get(instance.id) ?? instance.id,
    children: instance.children.map((child) =>
      child.type === "id"
        ? { ...child, value: newInstanceIds.get(child.value) ?? child.value }
        : child
    ),
  };
};

export const findLocalStyleSourcesWithinInstances = (
  styleSources: IterableIterator<StyleSource> | StyleSource[],
  styleSourceSelections:
    | IterableIterator<StyleSourceSelection>
    | StyleSourceSelection[],
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
    // skip selections outside of subtree
    if (instanceIds.has(instanceId) === false) {
      continue;
    }
    // find only local style sources on selections
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
  styleSources: IterableIterator<StyleSource> | StyleSource[];
  styleSourceSelections:
    | IterableIterator<StyleSourceSelection>
    | StyleSourceSelection[];
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

export const collectInstanceIds = (
  instances: Map<Instance["id"], Instance>,
  rootInstanceId: Instance["id"]
) => Array.from(findTreeInstanceIds(instances, rootInstanceId));

export const cloneInstanceSubtree = ({
  instances,
  rootInstanceId,
  createId = nanoid,
}: {
  instances: Map<Instance["id"], Instance>;
  rootInstanceId: Instance["id"];
  createId?: () => Instance["id"];
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

const createRemovePatches = (ids: Iterable<string>) =>
  Array.from(ids, (id) => ({ op: "remove" as const, path: [id] }));

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
  styleSources: IterableIterator<StyleSource> | StyleSource[];
  styleSourceSelections:
    | IterableIterator<StyleSourceSelection>
    | StyleSourceSelection[];
  styles: Iterable<StyleDecl>;
}): z.infer<typeof buildPatchTransaction>["payload"] => {
  const deleteTargets = getInstanceDeleteTargets({
    instanceIds,
    props,
    dataSources,
    styleSources,
    styleSourceSelections,
  });

  return compactBuildPatchPayload([
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
  const payload: z.infer<typeof buildPatchTransaction>["payload"] =
    compactBuildPatchPayload([{ namespace: "instances", patches }]);
  return { errors, payload };
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
  styleSources: IterableIterator<StyleSource> | StyleSource[];
  styleSourceSelections:
    | IterableIterator<StyleSourceSelection>
    | StyleSourceSelection[];
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

export const createInstanceAppendPayload = ({
  build,
  parent,
  instances,
  createdInstances,
  insertIndex,
  mode,
}: {
  build: Pick<
    CompactBuild,
    | "props"
    | "dataSources"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >;
  parent: Instance;
  instances: Instances;
  createdInstances: Instance[];
  insertIndex: number;
  mode: "append" | "prepend" | "replace";
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
  const payload: z.infer<typeof buildPatchTransaction>["payload"] = [
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
      props: build.props,
      dataSources: build.dataSources,
      styleSources: build.styleSources,
      styleSourceSelections: build.styleSourceSelections,
      styles: build.styles,
    });
    payload[0]?.patches.push(...(instanceCleanup?.patches ?? []));
    payload.push(...compactBuildPatchPayload(cleanupPayload));
  }

  return {
    payload,
    replacedInstanceIds: Array.from(replacedInstanceIds),
  };
};

export const serializeInstanceSummary = (
  instance: Instance,
  depth: number
) => ({
  id: instance.id,
  label: instance.label,
  component: instance.component,
  tag: instance.tag,
  depth,
  childCount: instance.children.length,
});

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
