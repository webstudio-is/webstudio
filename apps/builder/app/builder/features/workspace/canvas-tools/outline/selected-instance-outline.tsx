import { useStore } from "@nanostores/react";
import {
  $instances,
  $selectedInstanceOutlineAndInstance,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { isDescendantOrSelf } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { applyScale } from "./apply-scale";
import { $clampingRect, $scale } from "~/builder/shared/nano-states";
import { findClosestSlot } from "~/shared/instance-utils";
import { $ephemeralStyles } from "~/canvas/stores";

export const SelectedInstanceOutline = () => {
  const instances = useStore($instances);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const outline = useStore($selectedInstanceOutlineAndInstance);
  const scale = useStore($scale);
  const ephemeralStyles = useStore($ephemeralStyles);
  const clampingRect = useStore($clampingRect);

  if (selectedInstanceSelector === undefined) {
    return;
  }

  if (clampingRect === undefined) {
    return;
  }

  const isEditingCurrentInstance =
    textEditingInstanceSelector !== undefined &&
    isDescendantOrSelf(
      selectedInstanceSelector,
      textEditingInstanceSelector.selector
    );

  if (
    isEditingCurrentInstance ||
    outline === undefined ||
    ephemeralStyles.length !== 0
  ) {
    return;
  }

  const variant = findClosestSlot(instances, selectedInstanceSelector)
    ? "slot"
    : "default";
  const rect = applyScale(outline.rect, scale);

  return <Outline rect={rect} clampingRect={clampingRect} variant={variant} />;
};
