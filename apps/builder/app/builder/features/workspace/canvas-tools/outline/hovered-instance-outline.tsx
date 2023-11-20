import { useStore } from "@nanostores/react";
import {
  hoveredInstanceOutlineAndInstanceStore,
  hoveredInstanceSelectorStore,
  selectedInstanceSelectorStore,
  textEditingInstanceSelectorStore,
} from "~/shared/nano-states";
import { areInstanceSelectorsEqual } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { Label } from "./label";
import { applyScale } from "./apply-scale";
import { scaleStore } from "~/builder/shared/nano-states";

export const HoveredInstanceOutline = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const hoveredInstanceSelector = useStore(hoveredInstanceSelectorStore);
  const outline = useStore(hoveredInstanceOutlineAndInstanceStore);
  const scale = useStore(scaleStore);
  const textEditingInstanceSelector = useStore(
    textEditingInstanceSelectorStore
  );
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
