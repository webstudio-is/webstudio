import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/sdk";
import { blockComponent, blockTemplateComponent } from "@webstudio-is/sdk";
import type { FontWeight } from "@webstudio-is/fonts";
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

export type InstanceContextMenu = {
  position: { x: number; y: number };
  instanceSelector: InstanceSelector;
};

export const $instanceContextMenu = atom<undefined | InstanceContextMenu>(
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

export const findBlockSelector = (
  anchor: InstanceSelector,
  instances: Instances
) => {
  if (anchor === undefined) {
    return;
  }

  if (anchor.length === 0) {
    return;
  }

  let blockInstanceSelector: InstanceSelector | undefined = undefined;

  for (let i = 0; i < anchor.length; ++i) {
    const instanceId = anchor[i];

    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }

    if (instance.component === blockComponent) {
      blockInstanceSelector = anchor.slice(i);
      break;
    }
  }

  if (blockInstanceSelector === undefined) {
    return;
  }

  return blockInstanceSelector;
};

export const findTemplates = (
  anchor: InstanceSelector,
  instances: Instances
) => {
  const blockInstanceSelector = findBlockSelector(anchor, instances);
  if (blockInstanceSelector === undefined) {
    return;
  }

  const blockInstance = instances.get(blockInstanceSelector[0]);

  if (blockInstance === undefined) {
    return;
  }

  const templateInstanceId = blockInstance.children.find(
    (child) =>
      child.type === "id" &&
      instances.get(child.value)?.component === blockTemplateComponent
  )?.value;

  if (templateInstanceId === undefined) {
    return;
  }

  const templateInstance = instances.get(templateInstanceId);

  if (templateInstance === undefined) {
    return;
  }

  const result: [instance: Instance, instanceSelector: InstanceSelector][] =
    templateInstance.children
      .filter((child) => child.type === "id")
      .map((child) => child.value)
      .map((childId) => instances.get(childId))
      .filter((child) => child !== undefined)
      .map((child) => [
        child,
        [child.id, templateInstanceId, ...blockInstanceSelector],
      ]);

  return result;
};

export const $canvasIframeState = atom<"idle" | "ready">("idle");

export const $detectedFontsWeights = atom<Map<string, Array<FontWeight>>>(
  new Map()
);

export type GridCellData = {
  instanceId: Instance["id"];
  columnCount: number;
  rowCount: number;
  // Untransformed border-box rect of the grid container in canvas viewport
  // coordinates. Size comes from offsetWidth/offsetHeight (ignores CSS
  // transforms), position is recovered by inverting the element's own
  // transform from the getBoundingClientRect AABB.
  rect: { top: number; left: number; width: number; height: number };
  // Resolved CSS strings from getComputedStyle (canvas-space px values).
  // The builder overlay applies these on a child "mirror" div that
  // faithfully reproduces the canvas element. A parent wrapper handles
  // our scale + translate positioning.
  resolvedDisplay: string;
  resolvedWidth: string;
  resolvedHeight: string;
  resolvedBoxSizing: string;
  resolvedColumnTemplate: string;
  resolvedRowTemplate: string;
  resolvedColumnGap: string;
  resolvedRowGap: string;
  resolvedPadding: string;
  resolvedBorderWidth: string;
  resolvedBorderStyle: string;
  resolvedDirection: string;
  resolvedGridTemplateAreas: string;
  resolvedJustifyContent: string;
  resolvedJustifyItems: string;
  resolvedAlignContent: string;
  resolvedTransform: string;
  resolvedTransformOrigin: string;
};

export const $gridCellData = atom<GridCellData | undefined>(undefined);
