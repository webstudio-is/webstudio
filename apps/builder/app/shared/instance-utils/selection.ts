import { ROOT_INSTANCE_ID, type Instances } from "@webstudio-is/sdk";
import {
  areInstanceSelectorsEqual,
  isDescendantOrSelf,
  type InstanceSelector,
} from "./tree";

export const areSelectorListsEqual = (
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

const getSelectorKey = (selector: InstanceSelector) => JSON.stringify(selector);

const sortSelectorsByOrder = (
  selectors: InstanceSelector[],
  orderedSelectors: InstanceSelector[]
) => {
  const order = new Map(
    orderedSelectors.map((selector, index) => [getSelectorKey(selector), index])
  );
  return [...selectors].sort((left, right) => {
    const leftIndex = order.get(getSelectorKey(left)) ?? Infinity;
    const rightIndex = order.get(getSelectorKey(right)) ?? Infinity;
    return leftIndex - rightIndex;
  });
};

export const getInstanceSelectionUpdate = ({
  selectedSelectors,
  clickedSelector,
  orderedSelectors,
  anchorSelector,
  isToggle,
  isRange,
}: {
  selectedSelectors: InstanceSelector[];
  clickedSelector: InstanceSelector;
  orderedSelectors: InstanceSelector[];
  anchorSelector: undefined | InstanceSelector;
  isToggle: boolean;
  isRange: boolean;
}) => {
  if (isRange && anchorSelector !== undefined) {
    const anchorIndex = orderedSelectors.findIndex((selector) =>
      areInstanceSelectorsEqual(selector, anchorSelector)
    );
    const clickedIndex = orderedSelectors.findIndex((selector) =>
      areInstanceSelectorsEqual(selector, clickedSelector)
    );
    if (anchorIndex !== -1 && clickedIndex !== -1) {
      const start = Math.min(anchorIndex, clickedIndex);
      const end = Math.max(anchorIndex, clickedIndex);
      const rangeSelectors = orderedSelectors.slice(start, end + 1);
      return {
        selectedSelectors: sortSelectorsByOrder(
          [
            ...selectedSelectors.filter(
              (selector) =>
                rangeSelectors.some((rangeSelector) =>
                  areInstanceSelectorsEqual(selector, rangeSelector)
                ) === false
            ),
            ...rangeSelectors,
          ],
          orderedSelectors
        ),
        anchorSelector: clickedSelector,
      };
    }
  }

  if (isToggle) {
    const isSelected = selectedSelectors.some((selector) =>
      areInstanceSelectorsEqual(selector, clickedSelector)
    );
    const nextSelectedSelectors = isSelected
      ? selectedSelectors.filter(
          (selector) =>
            areInstanceSelectorsEqual(selector, clickedSelector) === false
        )
      : [...selectedSelectors, clickedSelector];
    return {
      selectedSelectors: sortSelectorsByOrder(
        nextSelectedSelectors,
        orderedSelectors
      ),
      anchorSelector: clickedSelector,
    };
  }

  return {
    selectedSelectors: [clickedSelector],
    anchorSelector: clickedSelector,
  };
};

export const normalizeInstanceSelectors = (
  instanceSelectors: InstanceSelector[]
) => {
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
  instances: Instances
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

export const canResolveInstanceSelector = (
  instanceSelector: InstanceSelector,
  instances: Instances
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
