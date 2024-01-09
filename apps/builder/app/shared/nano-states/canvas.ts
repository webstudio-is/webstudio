import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/sdk";
import { $instances } from "./instances";
import type { InstanceSelector } from "../tree-utils";

export type TextToolbarState = {
  selectionRect: undefined | DOMRect;
  isBold: boolean;
  isItalic: boolean;
  isSuperscript: boolean;
  isSubscript: boolean;
  isLink: boolean;
  isSpan: boolean;
};

export const $textToolbar = atom<undefined | TextToolbarState>(undefined);

type InstanceOutline = {
  instanceId: Instance["id"];
  rect: DOMRect;
};

const getInstanceOutlineAndInstance = (
  instances: Instances,
  instanceOutline: undefined | InstanceOutline
) => {
  if (instanceOutline === undefined) {
    return;
  }
  const { instanceId, rect } = instanceOutline;
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  return {
    instance,
    rect,
  };
};

export const selectedInstanceOutlineStore = atom<undefined | InstanceOutline>(
  undefined
);

export const $selectedInstanceOutlineAndInstance = computed(
  [$instances, selectedInstanceOutlineStore],
  getInstanceOutlineAndInstance
);

export const hoveredInstanceOutlineStore = atom<undefined | InstanceOutline>(
  undefined
);

export const $hoveredInstanceOutlineAndInstance = computed(
  [$instances, hoveredInstanceOutlineStore],
  getInstanceOutlineAndInstance
);

export const $collaborativeInstanceSelector = atom<
  undefined | InstanceSelector
>(undefined);

export const $collaborativeInstanceRect = atom<undefined | DOMRect>(undefined);

export const synchronizedCanvasStores = [
  ["textToolbar", $textToolbar],
  ["selectedInstanceOutline", selectedInstanceOutlineStore],
  ["hoveredInstanceOutline", hoveredInstanceOutlineStore],
  ["$collaborativeInstanceSelector", $collaborativeInstanceSelector],
  ["$collaborativeInstanceRect", $collaborativeInstanceRect],
] as const;
