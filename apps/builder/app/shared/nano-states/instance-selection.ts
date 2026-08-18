import { atom, computed } from "nanostores";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import {
  areSelectorListsEqual,
  canResolveInstanceSelector,
  normalizeInstanceSelectors,
} from "../instance-utils/selection";
import { $instances } from "../sync/data-stores";

export const $allSelectedInstanceSelectors = atom<InstanceSelector[]>([]);
// Instance pruning is derived from tree updates and must not be synchronized
// back as an explicit selection change.
export const $instanceSelectionUpdate = atom<{
  revision: number;
  origin: "explicit" | "instance-pruning";
}>({ revision: 0, origin: "explicit" });

export const $selectedInstanceSelector = computed(
  $allSelectedInstanceSelectors,
  (instanceSelectors) => {
    if (instanceSelectors.length === 1) {
      return instanceSelectors[0];
    }
  }
);

const setSelectedInstances = (
  instanceSelectors: InstanceSelector[],
  origin: "explicit" | "instance-pruning"
) => {
  const normalizedSelectors = normalizeInstanceSelectors(instanceSelectors);
  const selectedSelectors = $allSelectedInstanceSelectors.get();
  if (areSelectorListsEqual(selectedSelectors, normalizedSelectors) === false) {
    $instanceSelectionUpdate.set({
      revision: $instanceSelectionUpdate.get().revision + 1,
      origin,
    });
    $allSelectedInstanceSelectors.set(normalizedSelectors);
  }
};

export const selectInstances = (instanceSelectors: InstanceSelector[]) => {
  setSelectedInstances(instanceSelectors, "explicit");
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

$instances.listen((instances) => {
  const selectedSelectors = $allSelectedInstanceSelectors.get();
  if (selectedSelectors.length === 0) {
    return;
  }
  setSelectedInstances(
    selectedSelectors.filter((instanceSelector) =>
      canResolveInstanceSelector(instanceSelector, instances)
    ),
    "instance-pruning"
  );
});
