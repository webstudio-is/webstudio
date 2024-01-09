import { useStore } from "@nanostores/react";
import {
  $hoveredInstanceOutlineAndInstance,
  $hoveredInstanceSelector,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import { areInstanceSelectorsEqual } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { Label } from "./label";
import { applyScale } from "./apply-scale";
import { $scale } from "~/builder/shared/nano-states";

export const HoveredInstanceOutline = () => {
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const outline = useStore($hoveredInstanceOutlineAndInstance);
  const scale = useStore($scale);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const isEditingText = textEditingInstanceSelector !== undefined;
  const isHoveringSelectedInstance = areInstanceSelectorsEqual(
    selectedInstanceSelector,
    hoveredInstanceSelector
  );

  if (outline === undefined || isHoveringSelectedInstance || isEditingText) {
    return null;
  }
  const rect = applyScale(outline.rect, scale);
  return (
    <Outline rect={rect}>
      <Label instance={outline.instance} instanceRect={rect} />
    </Outline>
  );
};
