import { useStore } from "@nanostores/react";
import { $instances } from "~/shared/sync/data-stores";
import {
  $selectedInstanceOutlines,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import { isDescendantOrSelf } from "~/shared/instance-utils/tree";
import { Outline } from "./outline";
import { applyScale } from "../apply-scale";
import { $clampingRect, $scale } from "~/builder/shared/nano-states";
import { findClosestSlot } from "~/shared/instance-utils/slot";
import { $ephemeralStyles } from "~/canvas/stores";

export const SelectedInstanceOutline = () => {
  const instances = useStore($instances);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const outlines = useStore($selectedInstanceOutlines);
  const scale = useStore($scale);
  const ephemeralStyles = useStore($ephemeralStyles);
  const clampingRect = useStore($clampingRect);

  if (clampingRect === undefined) {
    return;
  }

  if (outlines.length === 0) {
    return;
  }

  if (outlines.length === 1 && ephemeralStyles.length !== 0) {
    return;
  }

  return (
    <>
      {outlines.map((outline) => {
        const isEditingCurrentInstance =
          textEditingInstanceSelector !== undefined &&
          isDescendantOrSelf(
            outline.selector,
            textEditingInstanceSelector.selector
          );
        if (isEditingCurrentInstance) {
          return;
        }
        const variant = findClosestSlot(instances, outline.selector)
          ? "slot"
          : "default";
        const rect = applyScale(outline.rect, scale);
        return (
          <Outline
            key={JSON.stringify(outline.selector)}
            rect={rect}
            clampingRect={clampingRect}
            variant={variant}
          />
        );
      })}
    </>
  );
};
