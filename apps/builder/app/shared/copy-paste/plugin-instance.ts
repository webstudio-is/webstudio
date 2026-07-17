import {
  extractWebstudioFragment,
  findSafeFragmentPasteTarget,
  getCommonAncestorSelector,
  getPasteRootInstanceIds,
  mergeWebstudioFragments,
} from "@webstudio-is/project-build/runtime";
import {
  instanceTransferDataVersion,
  instancesTransferDataVersion,
  parseInstanceTransferData,
  type InstanceTransferData,
  type InstancesTransferData,
} from "@webstudio-is/project-build/transfer";
import { findClosestInsertable } from "../instance-utils/insert";
import {
  executeRuntimeMutationAsync,
  getWebstudioData,
} from "../instance-utils/data";
import { type Insertable } from "../instance-utils/insert";
import { shallowEqual } from "shallow-equal";
import { toast } from "@webstudio-is/design-system";
import {
  type Instance,
  type WebstudioFragment,
  isComponentDetachable,
} from "@webstudio-is/sdk";
import { $instances } from "~/shared/sync/data-stores";
import {
  type InstanceSelector,
  sortInstancePathsForChildMutation,
} from "@webstudio-is/project-build/runtime";
import { findChildReferenceIndex } from "@webstudio-is/project-build/runtime";
import { deleteInstanceBySelector } from "../instance-utils/mutation";
import {
  $allSelectedInstanceSelectors,
  clearInstanceSelection,
  $selectedInstancePath,
  $selectedInstanceSelector,
  selectInstances,
} from "~/shared/nano-states";
import { getInstancePath } from "@webstudio-is/project-build/runtime";
import { builderApi } from "../builder-api";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import { breakpointPasteLimitWarning } from "@webstudio-is/project-build/runtime";
import { resolveFragmentTokenConflicts } from "../resolve-token-conflicts";

const invalidPasteDataMessage =
  "Could not paste Webstudio instance data. The clipboard data appears to be incomplete or invalid.";

const getTreeData = (
  instanceSelector: InstanceSelector,
  { showToast = true }: { showToast?: boolean } = {}
) => {
  const instances = $instances.get();
  const [targetInstanceId] = instanceSelector;
  const instance = instances.get(targetInstanceId);
  if (instance && !isComponentDetachable(instance.component)) {
    if (showToast) {
      toast.error(
        "This instance can not be moved outside of its parent component."
      );
    }
    return;
  }

  // @todo tell user they can't copy or cut root
  if (instanceSelector.length === 1) {
    return;
  }

  return {
    instanceSelector,
    ...extractWebstudioFragment(getWebstudioData(), targetInstanceId),
  };
};

const stringify = (data: InstanceTransferData) => {
  return JSON.stringify({ [instanceTransferDataVersion]: data });
};

const stringifyMultiRoot = (data: InstancesTransferData) => {
  return JSON.stringify({ [instancesTransferDataVersion]: data });
};

const stringifyMultiRootSelection = (selectedData: InstanceTransferData[]) => {
  const rootInstanceIds = selectedData.map((data) => data.instanceSelector[0]);
  return stringifyMultiRoot({
    rootInstanceIds,
    fragment: mergeWebstudioFragments(rootInstanceIds, selectedData),
  });
};

const reportSkippedSelectedInstances = (operation: "copied" | "cut") => {
  builderApi.toast.info(`Some selected instances could not be ${operation}.`);
};

const findMultiSelectionInsertable = (
  fragment: WebstudioFragment
): undefined | Insertable => {
  const selectedInstanceSelectors = $allSelectedInstanceSelectors.get();
  if (selectedInstanceSelectors.length < 2) {
    return;
  }
  const instances = $instances.get();
  const selectedPaths = selectedInstanceSelectors
    .map((instanceSelector) => getInstancePath(instanceSelector, instances))
    .filter((path): path is NonNullable<typeof path> => path !== undefined);
  if (selectedPaths.length < 2) {
    return;
  }

  const directParentSelector = selectedPaths[0][1]?.instanceSelector;
  const hasSameDirectParent =
    directParentSelector !== undefined &&
    selectedPaths.every((path) =>
      shallowEqual(path[1]?.instanceSelector, directParentSelector)
    );
  if (hasSameDirectParent) {
    const parentInstance = instances.get(directParentSelector[0]);
    if (parentInstance === undefined) {
      return;
    }
    const selectedSiblingIndexes = selectedPaths.map((path) =>
      findChildReferenceIndex(parentInstance.children, path[0].instance.id)
    );
    if (selectedSiblingIndexes.includes(-1)) {
      return;
    }
    const lastSelectedSiblingIndex = Math.max(...selectedSiblingIndexes);
    return findPasteTargetForFragment(fragment, {
      parentSelector: directParentSelector,
      position: lastSelectedSiblingIndex + 1,
    });
  }

  const commonAncestorSelector = getCommonAncestorSelector(
    selectedPaths.map((path) => path[0].instanceSelector)
  );
  if (commonAncestorSelector === undefined) {
    return;
  }
  return findPasteTargetForFragment(fragment, {
    parentSelector: commonAncestorSelector,
    position: "end",
  });
};

const findSelectionPasteTarget = (fragment: WebstudioFragment) =>
  findMultiSelectionInsertable(fragment) ??
  findPasteTargetForFragment(fragment);

const findPasteTargetForFragment = (
  fragment: WebstudioFragment,
  insertable?: Insertable
): undefined | Insertable => {
  const instances = $instances.get();

  insertable = findClosestInsertable(fragment, insertable);
  if (insertable === undefined) {
    return;
  }
  return findSafeFragmentPasteTarget({
    fragment,
    instances,
    insertTarget: insertable,
  });
};

const findPasteTarget = (
  data: InstanceTransferData
): undefined | Insertable => {
  const instances = $instances.get();

  const instanceSelector = $selectedInstanceSelector.get();

  // paste after selected instance
  if (
    instanceSelector &&
    shallowEqual(instanceSelector, data.instanceSelector)
  ) {
    // body is not allowed to copy
    // so clipboard always have at least two level instance selector
    const [currentInstanceId, parentInstanceId] = instanceSelector;
    const parentInstance = instances.get(parentInstanceId);
    if (parentInstance === undefined) {
      return;
    }
    const indexWithinChildren = parentInstance.children.findIndex(
      (child) => child.type === "id" && child.value === currentInstanceId
    );
    return {
      parentSelector: instanceSelector.slice(1),
      position: indexWithinChildren + 1,
    };
  }

  return findSelectionPasteTarget(data);
};

const insertPastedFragment = async ({
  fragment,
  pasteTarget,
  selectRootInstances,
}: {
  fragment: WebstudioFragment;
  pasteTarget: Insertable;
  selectRootInstances: (rootInstanceIds: Instance["id"][]) => void;
}) => {
  try {
    const conflictResolution = await resolveFragmentTokenConflicts(fragment);
    if (conflictResolution === "cancel") {
      return;
    }
    const result = await executeRuntimeMutationAsync({
      id: "instances.insertFragment",
      input: {
        parentInstanceId: pasteTarget.parentSelector[0],
        fragment,
        conflictResolution,
        insertIndex:
          typeof pasteTarget.position === "number"
            ? pasteTarget.position
            : undefined,
      },
    });
    const rootInstanceIds = result?.result.rootInstanceIds;
    if (rootInstanceIds === undefined || rootInstanceIds.length === 0) {
      return false;
    }
    if (result?.result.didMergeBreakpointsDueToLimit === true) {
      toast.warn(breakpointPasteLimitWarning);
    }
    selectRootInstances(rootInstanceIds);
  } catch (error) {
    // User cancelled
    return false;
  }
  return true;
};

const handlePasteInstance = async (clipboardData: string) => {
  const transferData = parseInstanceTransferData(clipboardData);
  if (transferData.owned === false) {
    return pasteIgnored;
  }
  if (transferData.valid === false) {
    return { success: false, error: invalidPasteDataMessage } as const;
  }
  if (transferData.type === "multi-root") {
    const pasteRootInstanceIds = getPasteRootInstanceIds(transferData.data);
    if (pasteRootInstanceIds.length === 0) {
      return pasteHandled;
    }
    const fragment: WebstudioFragment = {
      ...transferData.data.fragment,
      children: pasteRootInstanceIds.map((instanceId) => ({
        type: "id",
        value: instanceId,
      })),
    };
    const pasteTarget = findSelectionPasteTarget(fragment);
    if (pasteTarget === undefined) {
      return pasteHandled;
    }
    await insertPastedFragment({
      fragment,
      pasteTarget,
      selectRootInstances: (rootInstanceIds) => {
        selectInstances(
          rootInstanceIds.map((newRootInstanceId) => [
            newRootInstanceId,
            ...pasteTarget.parentSelector,
          ])
        );
      },
    });
    return pasteHandled;
  }
  const fragment = transferData.data;

  const pasteTarget = findPasteTarget(fragment);
  if (pasteTarget === undefined) {
    return pasteHandled;
  }
  await insertPastedFragment({
    fragment,
    pasteTarget,
    selectRootInstances: (rootInstanceIds) => {
      const newRootInstanceId = rootInstanceIds[0];
      if (newRootInstanceId === undefined) {
        return;
      }
      selectInstances([[newRootInstanceId, ...pasteTarget.parentSelector]]);
    },
  });
  return pasteHandled;
};

const handleCopyInstance = () => {
  const selectedInstanceSelectors = $allSelectedInstanceSelectors.get();
  if (selectedInstanceSelectors.length === 0) {
    return;
  }
  if (selectedInstanceSelectors.length === 1) {
    const data = getTreeData(selectedInstanceSelectors[0]);
    if (data === undefined) {
      return;
    }
    return stringify(data);
  }

  const selectedData = selectedInstanceSelectors
    .map((instanceSelector) =>
      getTreeData(instanceSelector, { showToast: false })
    )
    .filter((data): data is InstanceTransferData => data !== undefined);
  if (selectedData.length === 0) {
    return;
  }
  if (selectedData.length < selectedInstanceSelectors.length) {
    reportSkippedSelectedInstances("copied");
  }
  return stringifyMultiRootSelection(selectedData);
};

const handleCutInstance = () => {
  const selectedInstanceSelectors = $allSelectedInstanceSelectors.get();
  if (selectedInstanceSelectors.length > 1) {
    const instances = $instances.get();
    const selectedPaths = selectedInstanceSelectors
      .map((instanceSelector) => {
        const data = getTreeData(instanceSelector, { showToast: false });
        const instancePath =
          data === undefined
            ? undefined
            : getInstancePath(data.instanceSelector, instances);
        if (data === undefined || instancePath === undefined) {
          return;
        }
        return { data, instancePath };
      })
      .filter(
        (
          item
        ): item is {
          data: InstanceTransferData;
          instancePath: NonNullable<ReturnType<typeof getInstancePath>>;
        } => item !== undefined
      );
    if (selectedPaths.length === 0) {
      return;
    }
    const selectedPathData = selectedPaths.map(({ data }) => data);
    if (selectedPathData.length < selectedInstanceSelectors.length) {
      reportSkippedSelectedInstances("cut");
    }
    const clipboardData = stringifyMultiRootSelection(selectedPathData);
    for (const { instancePath } of sortInstancePathsForChildMutation(
      selectedPaths
    )) {
      deleteInstanceBySelector(instancePath[0].instanceSelector);
    }
    clearInstanceSelection();
    return clipboardData;
  }

  const instancePath = $selectedInstancePath.get();
  if (instancePath === undefined) {
    return;
  }
  // @todo tell user they can't delete root
  if (instancePath.length === 1) {
    return;
  }
  const data = getTreeData(instancePath[0].instanceSelector);
  if (data === undefined) {
    return;
  }
  deleteInstanceBySelector(instancePath[0].instanceSelector);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};

export const instanceText = {
  name: "instance-text",
  mimeType: "text/plain",
  onCopy: handleCopyInstance,
  onCut: handleCutInstance,
  onPaste: handlePasteInstance,
} satisfies Plugin;

export const instanceJson = {
  name: "instance-json",
  mimeType: "application/json",
  onPaste: handlePasteInstance,
} satisfies Plugin;
