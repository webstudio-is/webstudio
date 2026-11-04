import { atom } from "nanostores";
import {
  $selectedBreakpoint,
  $selectedInstanceKey,
  $selectedOrLastStyleSourceSelector,
} from "~/shared/nano-states";

export type StyleBlockEditorSource =
  | "local"
  | "cascaded"
  | "preset"
  | "globalVariables";

export const $styleBlockEditorOpenFor = atom<
  { selectionKey: string } | undefined
>(undefined);

export const getStyleBlockSelectionKey = () => {
  const instanceKey = $selectedInstanceKey.get();
  if (instanceKey === undefined) {
    return;
  }
  const breakpoint = $selectedBreakpoint.get();
  const selector = $selectedOrLastStyleSourceSelector.get();
  return `${instanceKey}:${breakpoint?.id}:${selector?.styleSourceId}:${selector?.state}`;
};

export const openStyleBlockEditor = () => {
  const selectionKey = getStyleBlockSelectionKey();
  if (selectionKey !== undefined) {
    $styleBlockEditorOpenFor.set({ selectionKey });
  }
};
