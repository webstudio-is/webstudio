import { useSubscribe } from "@webstudio-is/sdk";
import { Box } from "~/shared/design-system";
import { useSelectedInstanceRect } from "~/shared/nano-states";
import { SelectedInstanceOutline } from "./outlines";

const useLink = () => {
  const [, setRect] = useSelectedInstanceRect();
  useSubscribe<"selectedInstanceRect", DOMRect>(
    "selectedInstanceRect",
    setRect
  );
};

const toolsStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

export const CanvasTools = () => {
  useLink();
  return (
    <Box css={toolsStyle}>
      <SelectedInstanceOutline />
    </Box>
  );
};
