import { useStore } from "@nanostores/react";
import {
  selectedInstanceIdStore,
  useHoveredInstanceRect,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { useHoveredInstanceData } from "~/designer/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const HoveredInstanceOutline = () => {
  const selectedInstanceId = useStore(selectedInstanceIdStore);
  const [instanceRect] = useHoveredInstanceRect();
  const [hoveredInstanceData] = useHoveredInstanceData();
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const isEditingText = textEditingInstanceId !== undefined;
  const isHoveringSelectedInstance =
    selectedInstanceId === hoveredInstanceData?.id;

  if (
    hoveredInstanceData === undefined ||
    instanceRect === undefined ||
    isHoveringSelectedInstance ||
    isEditingText
  ) {
    return null;
  }

  return (
    <Outline rect={instanceRect}>
      <Label
        component={hoveredInstanceData.component}
        instanceRect={instanceRect}
      />
    </Outline>
  );
};
