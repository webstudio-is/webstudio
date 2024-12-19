import { useStore } from "@nanostores/react";
import {
  $blockChildOutline,
  $hoveredInstanceOutlineAndInstance,
  $hoveredInstanceSelector,
  $instances,
  $isContentMode,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";
import { applyScale } from "./apply-scale";
import { $clampingRect, $scale } from "~/builder/shared/nano-states";
import { findClosestSlot } from "~/shared/instance-utils";
import { shallowEqual } from "shallow-equal";
import { isDescendantOrSelf } from "~/shared/tree-utils";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

export const HoveredInstanceOutline = () => {
  const instances = useStore($instances);
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const blockChildOutline = useStore($blockChildOutline);
  const outline = useStore($hoveredInstanceOutlineAndInstance);
  const scale = useStore($scale);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const isContentMode = useStore($isContentMode);
  const clampingRect = useStore($clampingRect);

  if (
    outline === undefined ||
    hoveredInstanceSelector === undefined ||
    clampingRect === undefined
  ) {
    return;
  }

  if (isFeatureEnabled("contentEditableMode") && isContentMode) {
    if (shallowEqual(blockChildOutline?.selector, hoveredInstanceSelector)) {
      return;
    }
  }

  if (
    textEditingInstanceSelector?.selector &&
    isDescendantOrSelf(
      hoveredInstanceSelector,
      textEditingInstanceSelector.selector
    )
  ) {
    return;
  }

  const variant = findClosestSlot(instances, hoveredInstanceSelector)
    ? "slot"
    : "default";
  const rect = applyScale(outline.rect, scale);

  return (
    <Outline rect={rect} clampingRect={clampingRect} variant={variant}>
      <Label
        variant={variant}
        instance={outline.instance}
        instanceRect={rect}
      />
    </Outline>
  );
};
