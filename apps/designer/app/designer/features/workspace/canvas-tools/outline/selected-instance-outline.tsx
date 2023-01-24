import { useStore } from "@nanostores/react";
import {
  selectedInstanceStore,
  useSelectedInstanceOutline,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const SelectedInstanceOutline = () => {
  const [{ rect, visible }] = useSelectedInstanceOutline();
  const selectedInstance = useStore(selectedInstanceStore);
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const isEditingCurrentInstance =
    textEditingInstanceId !== undefined &&
    textEditingInstanceId === selectedInstance?.id;

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
      <Label component={selectedInstance.component} instanceRect={rect} />
    </Outline>
  );
};
