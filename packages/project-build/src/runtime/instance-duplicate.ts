import type { Instance, WebstudioData } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { findAvailableVariables, produceWebstudioDataMutation } from "./data";
import { throwBuilderRuntimeError } from "./errors";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./fragment";
import { findChildReferenceIndex } from "./instances";
import { isAutoGridPlacement, resetGridChildPlacement } from "./style-utils";
import { createRuntimeMutation } from "./mutation";
import { getSlotFragmentDropTargetMutable } from "./slot";
import { z } from "zod";

export const duplicateInstanceAfterItselfInput = z.object({
  sourceInstanceId: z.string(),
  parentInstanceId: z.string(),
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
  const fragment = extractWebstudioFragment(data, sourceInstanceId);
  const { newInstanceIds } = insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: findAvailableVariables({
      ...data,
      startingInstanceId: parentInstanceId,
    }),
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
    return;
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
