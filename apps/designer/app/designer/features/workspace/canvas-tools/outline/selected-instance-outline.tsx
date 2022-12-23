import {
  useSelectedInstanceOutline,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const SelectedInstanceOutline = () => {
  const [{ rect, visible }] = useSelectedInstanceOutline();
  const [instanceData] = useSelectedInstanceData();
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const isEditingCurrentInstance =
    textEditingInstanceId !== undefined &&
    textEditingInstanceId === instanceData?.id;

  if (
    instanceData === undefined ||
    isEditingCurrentInstance ||
    visible === false ||
    rect === undefined
  ) {
    return null;
  }

  return (
    <Outline rect={rect}>
      <Label component={instanceData.component} instanceRect={rect} />
    </Outline>
  );
};
