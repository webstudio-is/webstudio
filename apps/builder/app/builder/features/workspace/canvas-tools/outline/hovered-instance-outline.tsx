import { useStore } from "@nanostores/react";
import {
  hoveredInstanceSelectorStore,
  selectedInstanceSelectorStore,
  textEditingInstanceSelectorStore,
  hoveredInstanceOutlineAndInstanceStore,
} from "~/shared/nano-states";
import { areInstanceSelectorsEqual } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { Label } from "./label";

export const HoveredInstanceOutline = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const hoveredInstanceSelector = useStore(hoveredInstanceSelectorStore);
  const outline = useStore(hoveredInstanceOutlineAndInstanceStore);
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

  return (
    <Outline rect={outline.rect}>
      <Label instance={outline.instance} instanceRect={outline.rect} />
    </Outline>
  );
};
