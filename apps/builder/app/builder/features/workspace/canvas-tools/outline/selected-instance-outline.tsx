import { useStore } from "@nanostores/react";
import {
  selectedInstanceSelectorStore,
  selectedInstanceStore,
  useSelectedInstanceOutline,
} from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states/instances";
import { areInstanceSelectorsEqual } from "~/shared/tree-utils";
import { Outline } from "./outline";
import { Label } from "./label";

export const SelectedInstanceOutline = () => {
  const [{ rect, visible }] = useSelectedInstanceOutline();
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const selectedInstance = useStore(selectedInstanceStore);
  const textEditingInstanceSelector = useStore(
    textEditingInstanceSelectorStore
  );

  const isEditingCurrentInstance =
    textEditingInstanceSelector !== undefined &&
    areInstanceSelectorsEqual(
      textEditingInstanceSelector,
      selectedInstanceSelector
    );

  if (
    selectedInstance === undefined ||
    isEditingCurrentInstance ||
    visible === false ||
    rect === undefined
  ) {
    return null;
  }

  return (
    <Outline rect={rect}>
      <Label instance={selectedInstance} instanceRect={rect} />
    </Outline>
  );
};
