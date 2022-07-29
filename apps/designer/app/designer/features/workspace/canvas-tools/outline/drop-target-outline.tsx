import { Outline } from "./outline";
import { DropTargetChangePayload } from "~/canvas/shared/use-drag-drop";
import { Label } from "./label";

export const DropTargetOutline = ({
  dropTarget,
}: {
  dropTarget: DropTargetChangePayload;
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
