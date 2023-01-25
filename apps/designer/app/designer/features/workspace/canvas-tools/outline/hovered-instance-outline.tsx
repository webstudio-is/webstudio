import { useStore } from "@nanostores/react";
import {
  hoveredInstanceStore,
  hoveredInstanceOutlineStore,
  selectedInstanceIdStore,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const HoveredInstanceOutline = () => {
  const selectedInstanceId = useStore(selectedInstanceIdStore);
  const hoveredInstance = useStore(hoveredInstanceStore);
  const instanceOutline = useStore(hoveredInstanceOutlineStore);
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const isEditingText = textEditingInstanceId !== undefined;
  const isHoveringSelectedInstance = selectedInstanceId === hoveredInstance?.id;

  if (
    hoveredInstance === undefined ||
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
