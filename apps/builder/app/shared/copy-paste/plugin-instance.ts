import {
  detectFragmentTokenConflicts,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "@webstudio-is/project-build/runtime/fragment";
import { findClosestInsertable } from "../instance-utils/insert";
import {
  updateInstanceData,
  updateWebstudioData,
  getWebstudioData,
} from "../instance-utils/data";
import {
  insertInstanceChildrenMutable,
  type Insertable,
} from "../instance-utils/insert";
import { shallowEqual } from "shallow-equal";
import { z } from "zod";
import { toast } from "@webstudio-is/design-system";
import {
  type Instance,
  type Instances,
  type WebstudioFragment,
  webstudioFragment,
  findTreeInstanceIdsExcludingSlotDescendants,
  isComponentDetachable,
  portalComponent,
} from "@webstudio-is/sdk";
import { $instances, $project } from "~/shared/sync/data-stores";
import type { InstanceSelector } from "../instance-utils/tree";
import { findChildReferenceIndex } from "@webstudio-is/project-build/runtime/instances";
import {
  deleteInstanceMutable,
  sortInstancePathsForChildMutation,
} from "../instance-utils/mutation";
import {
  $allSelectedInstanceSelectors,
  clearInstanceSelection,
  getInstancePath,
  $selectedInstancePath,
  $selectedInstanceSelector,
  selectInstances,
} from "~/shared/nano-states";
import { findAvailableVariables } from "@webstudio-is/project-build/runtime/data";
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

const getPasteRootInstanceIds = ({
  rootInstanceIds,
  fragment,
}: MultiRootInstanceData) => {
  const instanceIds = new Set(
    fragment.instances.map((instance) => instance.id)
  );
  const fragmentRootIds = new Set<Instance["id"]>();
  for (const child of fragment.children) {
    if (child.type === "id") {
      fragmentRootIds.add(child.value);
    }
  }
  const seen = new Set<Instance["id"]>();
  return rootInstanceIds.filter((instanceId) => {
    if (
      instanceIds.has(instanceId) === false ||
      fragmentRootIds.has(instanceId) === false ||
      seen.has(instanceId)
    ) {
      return false;
    }
    seen.add(instanceId);
    return true;
  });
};

const mergeById = <Item extends { id: string }>(items: Item[]) =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());

const mergeUniqueByJson = <Item>(items: Item[]) =>
  Array.from(
    new Map(items.map((item) => [JSON.stringify(item), item])).values()
  );

const mergeWebstudioFragments = (
  rootInstanceIds: Instance["id"][],
  fragments: WebstudioFragment[]
): WebstudioFragment => ({
  children: rootInstanceIds.map((instanceId) => ({
    type: "id" as const,
    value: instanceId,
  })),
  instances: mergeById(fragments.flatMap((fragment) => fragment.instances)),
  styleSourceSelections: mergeUniqueByJson(
    fragments.flatMap((fragment) => fragment.styleSourceSelections)
  ),
  styleSources: mergeById(
    fragments.flatMap((fragment) => fragment.styleSources)
  ),
  breakpoints: mergeById(fragments.flatMap((fragment) => fragment.breakpoints)),
  styles: mergeUniqueByJson(fragments.flatMap((fragment) => fragment.styles)),
  dataSources: mergeById(fragments.flatMap((fragment) => fragment.dataSources)),
  resources: mergeById(fragments.flatMap((fragment) => fragment.resources)),
  props: mergeById(fragments.flatMap((fragment) => fragment.props)),
  assets: mergeById(fragments.flatMap((fragment) => fragment.assets)),
});

const reportSkippedSelectedInstances = (operation: "copied" | "cut") => {
  builderApi.toast.info(`Some selected instances could not be ${operation}.`);
};

const getPortalFragmentSelector = (
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  const instance = instances.get(instanceSelector[0]);
  if (
    instance?.component !== portalComponent ||
    instance.children.length === 0 ||
    instance.children[0].type !== "id"
  ) {
    return;
  }
  // first portal child is always fragment
  return [instance.children[0].value, ...instanceSelector];
};

const getCommonAncestorSelector = (
  instanceSelectors: InstanceSelector[]
): undefined | InstanceSelector => {
  const [firstSelector] = instanceSelectors;
  if (firstSelector === undefined) {
    return;
  }
  const ancestorSelector: InstanceSelector = [];
  for (let index = 1; index <= firstSelector.length; index += 1) {
    const ancestorId = firstSelector[firstSelector.length - index];
    if (
      instanceSelectors.every(
        (selector) => selector[selector.length - index] === ancestorId
      )
    ) {
      ancestorSelector.unshift(ancestorId);
      continue;
    }
    break;
  }
  return ancestorSelector.length > 0 ? ancestorSelector : undefined;
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

const getCopiedRootInstanceIds = (fragment: WebstudioFragment) => {
  const newInstances: Instances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const copiedRootInstanceIds = new Set<Instance["id"]>();
  for (const child of fragment.children) {
    if (child.type !== "id") {
      continue;
    }
    for (const instanceId of findTreeInstanceIdsExcludingSlotDescendants(
      newInstances,
      child.value
    )) {
      copiedRootInstanceIds.add(instanceId);
    }
  }
  return copiedRootInstanceIds;
};

const findPasteTargetForFragment = (
  fragment: WebstudioFragment,
  insertable?: Insertable
): undefined | Insertable => {
  const instances = $instances.get();

  insertable = findClosestInsertable(fragment, insertable);
  if (insertable === undefined) {
    return;
  }

  if (fragment.instances.length === 0) {
    return;
  }

  const copiedRootInstanceIds = getCopiedRootInstanceIds(fragment);
  const preservedChildIds = new Set<Instance["id"]>();
  for (const instance of fragment.instances) {
    for (const child of instance.children) {
      if (
        child.type === "id" &&
        copiedRootInstanceIds.has(child.value) === false
      ) {
        preservedChildIds.add(child.value);
      }
    }
  }

  // portal descendants ids are preserved
  // so need to prevent pasting portal inside its copies
  // to avoid circular tree
  const dropTargetSelector =
    // consider portal fragment when check for cycles to avoid cases
    // like pasting portal directly into portal
    getPortalFragmentSelector(instances, insertable.parentSelector) ??
    insertable.parentSelector;
  for (const instanceId of dropTargetSelector) {
    if (preservedChildIds.has(instanceId)) {
      return;
    }
  }

  return insertable;
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
  const project = $project.get();
  const multiRootFragment = parseMultiRoot(clipboardData);
  if (multiRootFragment !== undefined) {
    if (project === undefined) {
      return false;
    }
    const pasteRootInstanceIds = getPasteRootInstanceIds(multiRootFragment);
    if (pasteRootInstanceIds.length === 0) {
      return false;
    }
    const pasteTarget = findSelectionPasteTarget(multiRootFragment.fragment);
    if (pasteTarget === undefined) {
      return false;
    }

    try {
      const conflictResolution = await resolveFragmentTokenConflicts(
        multiRootFragment.fragment
      );
      let didInsert = false;
      updateWebstudioData((data) => {
        const { newInstanceIds } = insertWebstudioFragmentCopy({
          data,
          fragment: multiRootFragment.fragment,
          availableVariables: findAvailableVariables({
            ...data,
            startingInstanceId: pasteTarget.parentSelector[0],
          }),
          projectId: project.id,
          conflictResolution,
          onBreakpointLimitMerge: () => {
            toast.warn(breakpointPasteLimitWarning);
          },
        });
        const children: Instance["children"] = [];
        const newSelectedSelectors: InstanceSelector[] = [];
        for (const rootInstanceId of pasteRootInstanceIds) {
          const newRootInstanceId = newInstanceIds.get(rootInstanceId);
          if (newRootInstanceId === undefined) {
            continue;
          }
          children.push({ type: "id", value: newRootInstanceId });
          newSelectedSelectors.push([
            newRootInstanceId,
            ...pasteTarget.parentSelector,
          ]);
        }
        if (children.length === 0) {
          return;
        }
        insertInstanceChildrenMutable(data, children, pasteTarget);
        selectInstances(newSelectedSelectors);
        didInsert = true;
      });
      if (didInsert === false) {
        return false;
      }
    } catch (error) {
      // User cancelled
      return false;
    }

    return true;
  }
  const fragment = parse(clipboardData);
  if (fragment === undefined || project === undefined) {
    return false;
  }

  const pasteTarget = findPasteTarget(fragment);
  if (pasteTarget === undefined) {
    return false;
  }

  try {
    const conflictResolution = await resolveFragmentTokenConflicts(fragment);
    let didInsert = false;
    updateWebstudioData((data) => {
      const { newInstanceIds } = insertWebstudioFragmentCopy({
        data,
        fragment,
        availableVariables: findAvailableVariables({
          ...data,
          startingInstanceId: pasteTarget.parentSelector[0],
        }),
        projectId: project.id,
        conflictResolution,
        onBreakpointLimitMerge: () => {
          toast.warn(breakpointPasteLimitWarning);
        },
      });
      const newRootInstanceId = newInstanceIds.get(fragment.instances[0].id);
      if (newRootInstanceId === undefined) {
        return;
      }
      const children: Instance["children"] = [
        { type: "id", value: newRootInstanceId },
      ];
      insertInstanceChildrenMutable(data, children, pasteTarget);
      selectInstances([[newRootInstanceId, ...pasteTarget.parentSelector]]);
      didInsert = true;
    });
    if (didInsert === false) {
      return false;
    }
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
    updateInstanceData((data) => {
      for (const { instancePath } of sortInstancePathsForChildMutation(
        selectedPaths
      )) {
        deleteInstanceMutable(data, instancePath);
      }
      clearInstanceSelection();
    });
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
  updateInstanceData((data) => {
    deleteInstanceMutable(data, instancePath);
  });
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
