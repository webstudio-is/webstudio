import { Outline } from "./outline";
import { DropTargetSharedData } from "~/canvas/shared/use-drag-drop";
import { Label } from "./label";

export const DropTargetOutline = ({
  dropTarget,
}: {
  dropTarget: DropTargetSharedData;
}) => {
  return (
    <Outline rect={dropTarget.rect}>
      <Label
        component={dropTarget.instanceComponent}
        instanceRect={dropTarget.rect}
      />
    </Outline>
  );
};
