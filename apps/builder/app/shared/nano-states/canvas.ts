import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/sdk";
import type { FontWeight } from "@webstudio-is/fonts";
import type { Rect } from "@webstudio-is/design-system";
import { $instances } from "../sync/data-stores";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";

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
  rect: Rect;
};

export type SelectedInstanceOutline = InstanceOutline & {
  selector: InstanceSelector;
};

export type BlockChildOutline = {
  selector: InstanceSelector;
  hoveredSelector: InstanceSelector;
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

export const $selectedInstanceOutlines = atom<SelectedInstanceOutline[]>([]);

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

export type InstanceContextMenu = {
  position: { x: number; y: number };
  instanceSelector: InstanceSelector;
};

export const $instanceContextMenu = atom<undefined | InstanceContextMenu>(
  undefined
);

export const $canvasIframeState = atom<"idle" | "ready">("idle");

export const $detectedFontsWeights = atom<Map<string, Array<FontWeight>>>(
  new Map()
);

export type GridCellData = {
  instanceId: Instance["id"];
  columnCount: number;
  rowCount: number;
  // Raw bounding client rect (post-transform). The builder recovers the
  // untransformed position by probing a hidden element with the same CSS.
  bcr: { top: number; left: number };
  // Untransformed border-box dimensions from offsetWidth/offsetHeight.
  untransformedWidth: number;
  untransformedHeight: number;
  // CSS text built from getComputedStyle on the canvas element.
  // Applied verbatim to the builder overlay mirror div via style.cssText.
  // Adding a new synced property = one line in the whitelist array
  // in grid-guide-utils.ts.
  resolvedCssText: string;
  // Index of the first implicit column track (0-based), or columnCount
  // when all tracks are explicit.
  implicitColumnStart: number;
  // Index of the first implicit row track (0-based), or rowCount
  // when all tracks are explicit.
  implicitRowStart: number;
};

export const $gridCellData = atom<GridCellData | undefined>(undefined);
