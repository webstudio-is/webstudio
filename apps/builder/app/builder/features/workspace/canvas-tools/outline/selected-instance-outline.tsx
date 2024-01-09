import { useStore } from "@nanostores/react";
import {
  $selectedInstanceOutlineAndInstance,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { areInstanceSelectorsEqual } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { Label } from "./label";
import { applyScale } from "./apply-scale";
import { $scale } from "~/builder/shared/nano-states";

export const SelectedInstanceOutline = () => {
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const outline = useStore($selectedInstanceOutlineAndInstance);
  const scale = useStore($scale);
  const isEditingCurrentInstance =
    textEditingInstanceSelector !== undefined &&
    areInstanceSelectorsEqual(
      textEditingInstanceSelector,
      selectedInstanceSelector
    );

  if (isEditingCurrentInstance || outline === undefined) {
    return null;
  }
  const rect = applyScale(outline.rect, scale);
  return (
    <Outline rect={rect}>
      <Label instance={outline.instance} instanceRect={rect} />
    </Outline>
  );
};
