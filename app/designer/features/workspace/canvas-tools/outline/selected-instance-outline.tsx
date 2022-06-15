import { useMemo } from "react";
import { useSelectedInstanceRect } from "~/shared/nano-states";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

const useStyle = (rect?: DOMRect) => {
  return useMemo(() => {
    if (rect === undefined) return;
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, [rect]);
};

export const SelectedInstanceOutline = () => {
  const [instanceRect] = useSelectedInstanceRect();
  const style = useStyle(instanceRect);
  const [instanceData] = useSelectedInstanceData();

  if (
    style === undefined ||
    instanceData === undefined ||
    instanceRect === undefined
  ) {
    return null;
  }

  return (
    <Outline style={style}>
      <Label component={instanceData.component} instanceRect={instanceRect} />
    </Outline>
  );
};
