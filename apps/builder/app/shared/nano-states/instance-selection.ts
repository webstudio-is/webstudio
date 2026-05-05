import { atom } from "nanostores";
import type { InstanceSelector } from "../tree-utils";

export const $selectedInstanceSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const selectInstance = (
  instanceSelector: undefined | InstanceSelector
) => {
  // prevent triggering select across the builder when selector is the same
  // useful when click and focus events have to select instance
  if ($selectedInstanceSelector.get()?.join() !== instanceSelector?.join()) {
    $selectedInstanceSelector.set(instanceSelector);
  }
};
