import {
  useSelectedInstanceRect,
  useTextEditingInstanceId,
} from "apps/designer/app/shared/nano-states";
import { useSelectedInstanceData } from "apps/designer/app/designer/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const SelectedInstanceOutline = () => {
  const [instanceRect] = useSelectedInstanceRect();
  const [instanceData] = useSelectedInstanceData();
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const isEditingCurrentInstance =
    textEditingInstanceId !== undefined &&
    textEditingInstanceId === instanceData?.id;

  if (
    instanceData === undefined ||
    instanceRect === undefined ||
    isEditingCurrentInstance
  ) {
    return null;
  }

  return (
    <Outline rect={instanceRect}>
      <Label component={instanceData.component} instanceRect={instanceRect} />
    </Outline>
  );
};
