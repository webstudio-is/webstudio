import { useHoveredInstanceRect } from "~/shared/nano-states";
import {
  useHoveredInstanceData,
  useSelectedInstanceData,
} from "~/designer/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const HoveredInstanceOutline = () => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [instanceRect] = useHoveredInstanceRect();
  const [instanceData] = useHoveredInstanceData();

  if (
    instanceData === undefined ||
    instanceRect === undefined ||
    selectedInstanceData?.id === instanceData.id
  ) {
    return null;
  }

  return (
    <Outline rect={instanceRect}>
      <Label component={instanceData.component} instanceRect={instanceRect} />
    </Outline>
  );
};
