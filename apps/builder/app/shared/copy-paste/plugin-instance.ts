import {
  detectFragmentTokenConflicts,
  extractWebstudioFragment,
  findSafeFragmentPasteTarget,
  getCommonAncestorSelector,
  getPasteRootInstanceIds,
  mergeWebstudioFragments,
} from "@webstudio-is/project-build/runtime/fragment";
import { findClosestInsertable } from "../instance-utils/insert";
import {
  executeRuntimeMutationAsync,
  getWebstudioData,
} from "../instance-utils/data";
import { type Insertable } from "../instance-utils/insert";
import { shallowEqual } from "shallow-equal";
import { z } from "zod";
import { toast } from "@webstudio-is/design-system";
import {
  type WebstudioFragment,
  webstudioFragment,
  isComponentDetachable,
} from "@webstudio-is/sdk";
import { $instances } from "~/shared/sync/data-stores";
import {
  type InstanceSelector,
  sortInstancePathsForChildMutation,
} from "@webstudio-is/project-build/runtime/tree";
import { findChildReferenceIndex } from "@webstudio-is/project-build/runtime/instances";
import { deleteInstanceBySelector } from "../instance-utils/mutation";
import {
  $allSelectedInstanceSelectors,
  clearInstanceSelection,
  $selectedInstancePath,
  $selectedInstanceSelector,
  selectInstances,
} from "~/shared/nano-states";
import { getInstancePath } from "@webstudio-is/project-build/runtime/lookup";
import { builderApi } from "../builder-api";
import type { Plugin } from "./copy-paste";
import { breakpointPasteLimitWarning } from "@webstudio-is/project-build/runtime/breakpoints";

const version = "@webstudio/instance/v0.1";
const multiRootVersion = "@webstudio/instances/v0.1";

const instanceData = webstudioFragment.extend({
  instanceSelector: z.array(z.string()),
});

type InstanceData = z.infer<typeof instanceData>;

const multiRootInstanceData = z.object({
  rootInstanceIds: z.array(z.string()),
  fragment: webstudioFragment,
});

type MultiRootInstanceData = z.infer<typeof multiRootInstanceData>;

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

const stringify = (data: InstanceData) => {
  return JSON.stringify({ [version]: data });
};

const stringifyMultiRoot = (data: MultiRootInstanceData) => {
  return JSON.stringify({ [multiRootVersion]: data });
};

const stringifyMultiRootSelection = (selectedData: InstanceData[]) => {
  const rootInstanceIds = selectedData.map((data) => data.instanceSelector[0]);
  return stringifyMultiRoot({
    rootInstanceIds,
    fragment: mergeWebstudioFragments(rootInstanceIds, selectedData),
  });
};

const clipboard = z.object({ [version]: instanceData });
const multiRootClipboard = z.object({
  [multiRootVersion]: multiRootInstanceData,
});

const parse = (clipboardData: string): InstanceData | undefined => {
  try {
    const data = clipboard.parse(JSON.parse(clipboardData));
    return data[version];
  } catch {
    return;
  }
};

const parseMultiRoot = (
  clipboardData: string
): MultiRootInstanceData | undefined => {
  try {
    const data = multiRootClipboard.parse(JSON.parse(clipboardData));
    return data[multiRootVersion];
  } catch {
    return;
  }
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

const findPasteTarget = (data: InstanceData): undefined | Insertable => {
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

const resolveFragmentTokenConflicts = async (fragment: WebstudioFragment) => {
  const conflicts = detectFragmentTokenConflicts({
    fragment,
    targetData: getWebstudioData(),
  });
  return conflicts.length > 0
    ? await builderApi.showTokenConflictDialog(conflicts)
    : "theirs";
};

const handlePasteInstance = async (clipboardData: string) => {
  const multiRootFragment = parseMultiRoot(clipboardData);
  if (multiRootFragment !== undefined) {
    const pasteRootInstanceIds = getPasteRootInstanceIds(multiRootFragment);
    if (pasteRootInstanceIds.length === 0) {
      return false;
    }
    const fragment: WebstudioFragment = {
      ...multiRootFragment.fragment,
      children: pasteRootInstanceIds.map((instanceId) => ({
        type: "id",
        value: instanceId,
      })),
    };
    const pasteTarget = findSelectionPasteTarget(fragment);
    if (pasteTarget === undefined) {
      return false;
    }

    try {
      const conflictResolution = await resolveFragmentTokenConflicts(fragment);
      const result = await executeRuntimeMutationAsync({
        id: "instances.insertFragment",
        input: {
          parentInstanceId: pasteTarget.parentSelector[0],
          fragment,
          conflictResolution,
          allowExistingComponents: true,
          insertIndex:
            typeof pasteTarget.position === "number"
              ? pasteTarget.position
              : undefined,
        },
      });
      if (result === undefined || result.result.rootInstanceIds.length === 0) {
        return false;
      }
      if (result.result.didMergeBreakpointsDueToLimit === true) {
        toast.warn(breakpointPasteLimitWarning);
      }
      selectInstances(
        result.result.rootInstanceIds.map((newRootInstanceId) => [
          newRootInstanceId,
          ...pasteTarget.parentSelector,
        ])
      );
    } catch (error) {
      // User cancelled
      return false;
    }

    return true;
  }
  const fragment = parse(clipboardData);
  if (fragment === undefined) {
    return false;
  }

  const pasteTarget = findPasteTarget(fragment);
  if (pasteTarget === undefined) {
    return false;
  }

  try {
    const conflictResolution = await resolveFragmentTokenConflicts(fragment);
    const result = await executeRuntimeMutationAsync({
      id: "instances.insertFragment",
      input: {
        parentInstanceId: pasteTarget.parentSelector[0],
        fragment,
        conflictResolution,
        allowExistingComponents: true,
        insertIndex:
          typeof pasteTarget.position === "number"
            ? pasteTarget.position
            : undefined,
      },
    });
    const [newRootInstanceId] = result?.result.rootInstanceIds ?? [];
    if (newRootInstanceId === undefined) {
      return false;
    }
    if (result?.result.didMergeBreakpointsDueToLimit === true) {
      toast.warn(breakpointPasteLimitWarning);
    }
    selectInstances([[newRootInstanceId, ...pasteTarget.parentSelector]]);
  } catch (error) {
    // User cancelled
    return false;
  }

  return true;
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
    .filter((data): data is InstanceData => data !== undefined);
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
          data: InstanceData;
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

export const instanceText: Plugin = {
  name: "instance-text",
  mimeType: "text/plain",
  onCopy: handleCopyInstance,
  onCut: handleCutInstance,
  onPaste: handlePasteInstance,
};

export const instanceJson: Plugin = {
  name: "instance-json",
  mimeType: "application/json",
  onPaste: handlePasteInstance,
};
