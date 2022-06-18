import { useSelectedInstanceRect } from "~/shared/nano-states";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const SelectedInstanceOutline = () => {
  const [instanceRect] = useSelectedInstanceRect();
  const [instanceData] = useSelectedInstanceData();

  if (instanceData === undefined || instanceRect === undefined) {
    return null;
  }

  return (
    <Outline rect={instanceRect}>
      <Label component={instanceData.component} instanceRect={instanceRect} />
    </Outline>
  );
};
