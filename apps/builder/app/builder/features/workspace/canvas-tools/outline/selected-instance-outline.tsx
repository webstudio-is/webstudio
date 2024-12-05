import { useStore } from "@nanostores/react";
import {
  $instances,
  $selectedInstanceOutlineAndInstance,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { type InstanceSelector } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { applyScale } from "./apply-scale";
import { $scale } from "~/builder/shared/nano-states";
import { findClosestSlot } from "~/shared/instance-utils";
import { $ephemeralStyles } from "~/canvas/stores";

const isDescendantOrSelf = (
  descendant: InstanceSelector,
  self: InstanceSelector
) => {
  return descendant.join(",").endsWith(self.join(","));
};

export const SelectedInstanceOutline = () => {
  const instances = useStore($instances);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const outline = useStore($selectedInstanceOutlineAndInstance);
  const scale = useStore($scale);
  const ephemeralStyles = useStore($ephemeralStyles);

  if (selectedInstanceSelector === undefined) {
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

  return <Outline rect={rect} variant={variant} />;
};
