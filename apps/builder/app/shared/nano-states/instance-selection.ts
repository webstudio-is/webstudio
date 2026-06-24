import { atom, computed } from "nanostores";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import {
  areInstanceSelectorsEqual,
  isDescendantOrSelf,
  type InstanceSelector,
} from "../instance-utils/tree";
import { $instances } from "../sync/data-stores";

export const $allSelectedInstanceSelectors = atom<InstanceSelector[]>([]);

export const $selectedInstanceSelector = computed(
  $allSelectedInstanceSelectors,
  (instanceSelectors) => {
    if (instanceSelectors.length === 1) {
      return instanceSelectors[0];
    }
  }
);

const areSelectorListsEqual = (
  left: InstanceSelector[],
  right: InstanceSelector[]
) => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((selector, index) =>
    areInstanceSelectorsEqual(selector, right[index])
  );
};

const normalizeInstanceSelectors = (instanceSelectors: InstanceSelector[]) => {
  const normalized: InstanceSelector[] = [];

  for (const instanceSelector of instanceSelectors) {
    if (normalized[0]?.[0] === ROOT_INSTANCE_ID) {
      continue;
    }

    if (
      instanceSelector.length === 1 &&
      instanceSelector[0] === ROOT_INSTANCE_ID
    ) {
      normalized.splice(0, normalized.length, instanceSelector);
      continue;
    }

    const hasSelectedAncestor = normalized.some((selectedSelector) =>
      isDescendantOrSelf(instanceSelector, selectedSelector)
    );
    if (hasSelectedAncestor) {
      continue;
    }

    let removedSelectedDescendant = false;
    for (let index = normalized.length - 1; index >= 0; index -= 1) {
      const selectedSelector = normalized[index];
      if (isDescendantOrSelf(selectedSelector, instanceSelector)) {
        normalized.splice(index, 1);
        removedSelectedDescendant = true;
      }
    }

    if (removedSelectedDescendant) {
      normalized.splice(0, normalized.length);
    }

    normalized.push(instanceSelector);
  }

  return normalized;
};

const indexedInstanceIdPattern = /^(.*)\[[^\]]+\]$/;

const getIndexedBaseInstanceId = (instanceId: InstanceSelector[number]) =>
  indexedInstanceIdPattern.exec(instanceId)?.[1];

const isKnownSelectorSegment = (
  instanceSelector: InstanceSelector,
  index: number,
  instances: ReturnType<typeof $instances.get>
) => {
  const instanceId = instanceSelector[index];
  if (instanceId === ROOT_INSTANCE_ID || instances.has(instanceId)) {
    return true;
  }
  const baseInstanceId = getIndexedBaseInstanceId(instanceId);
  return (
    baseInstanceId !== undefined &&
    instanceSelector[index + 1] === baseInstanceId &&
    instances.has(baseInstanceId)
  );
};

const canResolveInstanceSelector = (
  instanceSelector: InstanceSelector,
  instances: ReturnType<typeof $instances.get>
) => {
  for (let index = 0; index < instanceSelector.length; index += 1) {
    if (isKnownSelectorSegment(instanceSelector, index, instances) === false) {
      return false;
    }

    const parentId = instanceSelector[index + 1];
    if (parentId === undefined) {
      continue;
    }

    const instanceId = instanceSelector[index];
    const baseInstanceId = getIndexedBaseInstanceId(instanceId);
    if (baseInstanceId !== undefined && parentId === baseInstanceId) {
      continue;
    }

    const parentInstance = instances.get(parentId);
    if (
      parentInstance?.children.some(
        (child) => child.type === "id" && child.value === instanceId
      ) !== true
    ) {
      return false;
    }
  }

  return true;
};

export const selectInstances = (instanceSelectors: InstanceSelector[]) => {
  const normalizedSelectors = normalizeInstanceSelectors(instanceSelectors);
  if (
    areSelectorListsEqual(
      $allSelectedInstanceSelectors.get(),
      normalizedSelectors
    ) === false
  ) {
    $allSelectedInstanceSelectors.set(normalizedSelectors);
  }
};

export const clearInstanceSelection = () => {
  selectInstances([]);
};

export const selectInstance = (
  instanceSelector: undefined | InstanceSelector
) => {
  if (instanceSelector === undefined) {
    clearInstanceSelection();
    return;
  }
  selectInstances([instanceSelector]);
};

export const toggleSelectedInstance = (instanceSelector: InstanceSelector) => {
  const selectedSelectors = $allSelectedInstanceSelectors.get();
  const selectedIndex = selectedSelectors.findIndex((selectedSelector) =>
    areInstanceSelectorsEqual(selectedSelector, instanceSelector)
  );
  if (selectedIndex === -1) {
    selectInstances([...selectedSelectors, instanceSelector]);
    return;
  }

  const nextSelectedSelectors = [...selectedSelectors];
  nextSelectedSelectors.splice(selectedIndex, 1);
  selectInstances(nextSelectedSelectors);
};

export const getContextMenuSelectedInstanceSelectors = ({
  selectedSelectors,
  clickedSelector,
}: {
  selectedSelectors: InstanceSelector[];
  clickedSelector: InstanceSelector;
}) => {
  const isClickedAlreadySelected = selectedSelectors.some((selector) =>
    areInstanceSelectorsEqual(selector, clickedSelector)
  );
  return isClickedAlreadySelected ? selectedSelectors : [clickedSelector];
};

$instances.listen((instances) => {
  const selectedSelectors = $allSelectedInstanceSelectors.get();
  if (selectedSelectors.length === 0) {
    return;
  }
  selectInstances(
    selectedSelectors.filter((instanceSelector) =>
      canResolveInstanceSelector(instanceSelector, instances)
    )
  );
});
