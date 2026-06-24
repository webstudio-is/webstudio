import { atom, computed } from "nanostores";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "../instance-utils/tree";
import {
  areSelectorListsEqual,
  canResolveInstanceSelector,
  normalizeInstanceSelectors,
} from "../instance-utils/selection";
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
