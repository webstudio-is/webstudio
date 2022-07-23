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
      {/* @todo: real component name */}
      <Label component={"Box"} instanceRect={dropTarget.rect} />
    </Outline>
  );
};
