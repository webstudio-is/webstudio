import { useStore } from "@nanostores/react";
import {
  hoveredInstanceIdStore,
  hoveredInstanceOutlineStore,
  selectedInstanceIdStore,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const HoveredInstanceOutline = () => {
  const selectedInstanceId = useStore(selectedInstanceIdStore);
  const hoveredInstanceId = useStore(hoveredInstanceIdStore);
  const instanceOutline = useStore(hoveredInstanceOutlineStore);
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const isEditingText = textEditingInstanceId !== undefined;
  const isHoveringSelectedInstance = selectedInstanceId === hoveredInstanceId;

  if (
    hoveredInstanceId === undefined ||
    instanceOutline === undefined ||
    isHoveringSelectedInstance ||
    isEditingText
  ) {
    return null;
  }

  return (
    <Outline rect={instanceOutline.rect}>
      <Label
        component={instanceOutline.component}
        instanceRect={instanceOutline.rect}
      />
    </Outline>
  );
};
