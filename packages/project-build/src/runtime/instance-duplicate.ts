import {
  assignUniqueBlockTemplateNamesMutable,
  ROOT_INSTANCE_ID,
  type Instance,
  type WebstudioData,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { findAvailableVariables, produceWebstudioDataMutation } from "./data";
import { throwBuilderRuntimeError } from "./errors";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./fragment";
import {
  findChildReferenceIndex,
  findParentInstanceReference,
  insertIndexInput,
} from "./instances";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { isAutoGridPlacement, resetGridChildPlacement } from "./style-utils";
import { createRuntimeMutation } from "./mutation";
import { getSlotFragmentDropTargetMutable } from "./slot";
import { z } from "zod";

export const duplicateInstanceAfterItselfInput = z.object({
  sourceInstanceId: z.string(),
  parentInstanceId: z.string(),
});

export const cloneInstanceInput = z.object({
  sourceInstanceId: z.string(),
  targetParentInstanceId: z.string().optional(),
  insertIndex: insertIndexInput.optional(),
});

export const instanceDuplicateNamespaces = [
  "pages",
  "instances",
  "props",
  "dataSources",
  "resources",
  "styleSources",
  "styleSourceSelections",
  "styles",
  "breakpoints",
  "assets",
] as const;

type InstanceDuplicateState = Pick<
  BuilderState,
  (typeof instanceDuplicateNamespaces)[number]
>;

const getRequiredInstanceDuplicateState = (state: InstanceDuplicateState) => {
  for (const namespace of instanceDuplicateNamespaces) {
    if (state[namespace] === undefined) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `${namespace} namespace is missing`
      );
    }
  }
  return state as WebstudioData;
};

const copyInstanceSubtreeMutable = ({
  data,
  sourceInstanceId,
  targetParentInstanceId,
  projectId,
  createId,
}: {
  data: Omit<WebstudioData, "pages">;
  sourceInstanceId: Instance["id"];
  targetParentInstanceId: Instance["id"];
  projectId: string;
  createId?: () => string;
}) =>
  insertWebstudioFragmentCopy({
    data,
    fragment: extractWebstudioFragment(data, sourceInstanceId),
    availableVariables: findAvailableVariables({
      ...data,
      startingInstanceId: targetParentInstanceId,
    }),
    projectId,
    createId,
  }).newInstanceIds;

export const cloneInstance = (
  state: InstanceDuplicateState,
  input: z.infer<typeof cloneInstanceInput>,
  context: BuilderRuntimeContext
) => {
  const before = getRequiredInstanceDuplicateState(state);
  const source = before.instances.get(input.sourceInstanceId);
  if (source === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  if (source.id === ROOT_INSTANCE_ID) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Source instance could not be cloned"
    );
  }
  const targetParent =
    input.targetParentInstanceId === undefined
      ? findParentInstanceReference(before.instances, source.id)?.instance
      : before.instances.get(input.targetParentInstanceId);
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

  let clonedRootId: Instance["id"] | undefined;
  let clonedInstanceIds: Instance["id"][] = [];
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    const newInstanceIds = copyInstanceSubtreeMutable({
      data: draft,
      sourceInstanceId: source.id,
      targetParentInstanceId: targetParent.id,
      projectId: context.projectId ?? "",
      createId: context.createId,
    });
    clonedRootId = newInstanceIds.get(source.id);
    if (clonedRootId === undefined) {
      return;
    }
    clonedInstanceIds = [...newInstanceIds.values()].filter(
      (instanceId) => instanceId !== ROOT_INSTANCE_ID
    );
    assignUniqueBlockTemplateNamesMutable({
      instanceIds: [clonedRootId],
      parent: targetParent,
      instances: draft.instances,
      components: componentMetas.keys(),
    });
    draft.instances.get(targetParent.id)?.children.splice(insertIndex, 0, {
      type: "id",
      value: clonedRootId,
    });
  });
  if (clonedRootId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Source instance could not be cloned"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { instanceId: clonedRootId, instanceIds: clonedInstanceIds },
    invalidatesNamespaces: instanceDuplicateNamespaces,
  });
};

export const duplicateInstanceAfterItselfMutable = ({
  data,
  sourceInstanceId,
  parentInstanceId,
  projectId,
  createId,
}: {
  data: Omit<WebstudioData, "pages">;
  sourceInstanceId: Instance["id"];
  parentInstanceId: Instance["id"];
  projectId: string;
  createId?: () => string;
}) => {
  const newInstanceIds = copyInstanceSubtreeMutable({
    data,
    sourceInstanceId,
    targetParentInstanceId: parentInstanceId,
    projectId,
    createId,
  });
  const newRootInstanceId = newInstanceIds.get(sourceInstanceId);
  if (newRootInstanceId === undefined) {
    return;
  }

  if (
    isAutoGridPlacement({
      styles: data.styles,
      styleSources: data.styleSources,
      styleSourceSelections: data.styleSourceSelections,
      instanceId: sourceInstanceId,
    })
  ) {
    resetGridChildPlacement({
      styles: data.styles,
      styleSources: data.styleSources,
      styleSourceSelections: data.styleSourceSelections,
      instanceId: newRootInstanceId,
    });
  }

  const parentInstance = data.instances.get(parentInstanceId);
  if (parentInstance === undefined) {
    return;
  }
  const indexWithinChildren = findChildReferenceIndex(
    parentInstance.children,
    sourceInstanceId
  );
  if (indexWithinChildren === -1) {
    parentInstance.children.push({ type: "id", value: newRootInstanceId });
    return newRootInstanceId;
  }
  parentInstance.children.splice(indexWithinChildren + 1, 0, {
    type: "id",
    value: newRootInstanceId,
  });
  return newRootInstanceId;
};

export const duplicateInstanceAfterItself = (
  state: InstanceDuplicateState,
  input: z.infer<typeof duplicateInstanceAfterItselfInput>,
  context: BuilderRuntimeContext
) => {
  const before = getRequiredInstanceDuplicateState(state);
  if (before.instances.has(input.sourceInstanceId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Source instance not found");
  }
  if (before.instances.has(input.parentInstanceId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
  }
  let duplicateParentId: Instance["id"] | undefined;
  let instanceId: Instance["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    duplicateParentId =
      getSlotFragmentDropTargetMutable(
        draft.instances,
        { parentSelector: [input.parentInstanceId], position: "end" },
        context.createId
      )?.parentSelector[0] ?? input.parentInstanceId;
    instanceId = duplicateInstanceAfterItselfMutable({
      data: draft,
      sourceInstanceId: input.sourceInstanceId,
      parentInstanceId: duplicateParentId,
      projectId: context.projectId ?? "",
      createId: context.createId,
    });
  });
  if (instanceId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Source instance could not be duplicated after itself"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { instanceId, parentInstanceId: duplicateParentId },
    invalidatesNamespaces: instanceDuplicateNamespaces,
  });
};
