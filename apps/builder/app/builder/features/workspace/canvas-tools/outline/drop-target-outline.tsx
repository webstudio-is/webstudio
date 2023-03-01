import { Outline } from "./outline";
import type { DropTargetChangePayload } from "~/canvas/shared/use-drag-drop";
import { Label } from "./label";

export const DropTargetOutline = ({
  dropTarget,
}: {
  dropTarget: DropTargetChangePayload;
}) => {
  return (
    <Outline rect={dropTarget.rect}>
      <Label instance={dropTarget.instance} instanceRect={dropTarget.rect} />
    </Outline>
  );
};
