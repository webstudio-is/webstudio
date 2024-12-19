import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/sdk";
import type { FontWeight } from "@webstudio-is/fonts";
import { $instances } from "./instances";
import type { InstanceSelector } from "../tree-utils";
import { blockComponent } from "@webstudio-is/react-sdk";

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

export type BlockChildOutline = {
  selector: InstanceSelector;
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

export const $selectedInstanceOutline = atom<undefined | InstanceOutline>(
  undefined
);

export const $selectedInstanceOutlineAndInstance = computed(
  [$instances, $selectedInstanceOutline],
  getInstanceOutlineAndInstance
);

export const $hoveredInstanceOutline = atom<undefined | InstanceOutline>(
  undefined
);

export const $hoveredInstanceOutlineAndInstance = computed(
  [$instances, $hoveredInstanceOutline],
  getInstanceOutlineAndInstance
);

export const $collaborativeInstanceSelector = atom<
  undefined | InstanceSelector
>(undefined);

export const $collaborativeInstanceRect = atom<undefined | DOMRect>(undefined);

export const $blockChildOutline = atom<undefined | BlockChildOutline>(
  undefined
);

export const findBlockChildSelector = (instanceSelector: InstanceSelector) => {
  const instances = $instances.get();
  let blockChildSelector: InstanceSelector | undefined = undefined;

  for (let i = 1; i < instanceSelector.length; ++i) {
    const instance = instances.get(instanceSelector[i]);
    if (instance?.component === blockComponent) {
      blockChildSelector = instanceSelector.slice(i - 1);

      return blockChildSelector;
    }
  }

  if (instances.get(instanceSelector[0])?.component === blockComponent) {
    return instanceSelector;
  }
};

export const $canvasIframeState = atom<"idle" | "ready">("idle");

export const $detectedFontsWeights = atom<Map<string, Array<FontWeight>>>(
  new Map()
);
