import { nanoid } from "nanoid";
import { z } from "zod";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type {
  Instance,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { createPropClonePatches } from "../prop-utils";
import { createStyleClonePayload } from "../style-source-utils";
import { compactBuildPatchPayload } from "../build-patch-utils";
import {
  cloneInstanceSubtree,
  createInstanceChild,
  type InstanceSelector,
} from "./tree";

type BuildPatchPayload = z.infer<typeof buildPatchTransaction>["payload"];

export const createInstanceClonePayload = ({
  instances,
  sourceInstanceId,
  targetParent,
  insertIndex,
  props,
  styleSourceSelections,
  styleSources,
  styles,
  createId = nanoid,
}: {
  instances: Map<Instance["id"], Instance>;
  sourceInstanceId: Instance["id"];
  targetParent: Instance;
  insertIndex: number;
  props: Prop[];
  styleSourceSelections: StyleSourceSelection[];
  styleSources: StyleSource[];
  styles: StyleDecl[];
  createId?: () => Instance["id"];
}):
  | {
      clonedRootId: Instance["id"];
      clonedInstanceIds: InstanceSelector;
      payload: BuildPatchPayload;
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
  });
  const stylePayload = createStyleClonePayload({
    styleSourceSelections,
    styleSources,
    styles,
    nextIdById,
  });
  return {
    clonedRootId,
    clonedInstanceIds: clonedInstances.map(([instanceId]) => instanceId),
    payload: compactBuildPatchPayload([
      {
        namespace: "instances",
        patches: [
          ...clonedInstances.map(([instanceId, instance]) => ({
            op: "add" as const,
            path: [instanceId],
            value: instance,
          })),
          {
            op: "add",
            path: [targetParent.id, "children", insertIndex],
            value: createInstanceChild(clonedRootId),
          },
        ],
      },
      ...(propPatches.length === 0
        ? []
        : [{ namespace: "props" as const, patches: propPatches }]),
      ...stylePayload,
    ]),
  };
};
