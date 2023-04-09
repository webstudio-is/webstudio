import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/project-build";
import { instancesStore } from "./instances";

export type TextToolbarState = {
  selectionRect: undefined | DOMRect;
  isBold: boolean;
  isItalic: boolean;
  isSuperscript: boolean;
  isSubscript: boolean;
  isLink: boolean;
  isSpan: boolean;
};

export const textToolbarStore = atom<undefined | TextToolbarState>(undefined);

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

export const selectedInstanceOutlineAndInstanceStore = computed(
  [instancesStore, selectedInstanceOutlineStore],
  getInstanceOutlineAndInstance
);

export const hoveredInstanceOutlineStore = atom<undefined | InstanceOutline>(
  undefined
);

export const hoveredInstanceOutlineAndInstanceStore = computed(
  [instancesStore, hoveredInstanceOutlineStore],
  getInstanceOutlineAndInstance
);

export const synchronizedCanvasStores = [
  ["textToolbar", textToolbarStore],
  ["selectedInstanceOutline", selectedInstanceOutlineStore],
  ["hoveredInstanceOutline", hoveredInstanceOutlineStore],
] as const;
