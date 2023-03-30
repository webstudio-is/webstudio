import { useStore } from "@nanostores/react";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states/instances";
import { selectedInstanceOutlineAndInstanceStore } from "~/shared/nano-states/canvas";
import { areInstanceSelectorsEqual } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { Label } from "./label";

export const SelectedInstanceOutline = () => {
  const outline = useStore(selectedInstanceOutlineAndInstanceStore);
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const textEditingInstanceSelector = useStore(
    textEditingInstanceSelectorStore
  );

  const isEditingCurrentInstance =
    textEditingInstanceSelector !== undefined &&
    areInstanceSelectorsEqual(
      textEditingInstanceSelector,
      selectedInstanceSelector
    );

  if (isEditingCurrentInstance || outline === undefined) {
    return null;
  }

  return (
    <Outline rect={outline.rect}>
      <Label instance={outline.instance} instanceRect={outline.rect} />
    </Outline>
  );
};
