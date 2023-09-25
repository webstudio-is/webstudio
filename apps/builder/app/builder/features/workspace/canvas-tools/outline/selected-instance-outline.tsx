import { useStore } from "@nanostores/react";
import {
  selectedInstanceOutlineAndInstanceStore,
  selectedInstanceSelectorStore,
} from "@webstudio-is/sdk-plugin";
import { textEditingInstanceSelectorStore } from "@webstudio-is/sdk-plugin";
import { areInstanceSelectorsEqual } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { Label } from "./label";
import { applyScale } from "./apply-scale";
import { scaleStore } from "~/builder/shared/nano-states";

export const SelectedInstanceOutline = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const textEditingInstanceSelector = useStore(
    textEditingInstanceSelectorStore
  );
  const outline = useStore(selectedInstanceOutlineAndInstanceStore);
  const scale = useStore(scaleStore);
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
