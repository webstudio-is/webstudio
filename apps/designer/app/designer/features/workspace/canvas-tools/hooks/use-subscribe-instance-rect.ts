import { useSubscribe } from "@webstudio-is/sdk";
import {
  useSelectedInstanceRect,
  useHoveredInstanceRect,
} from "apps/designer/app/shared/nano-states";

export const useSubscribeInstanceRect = () => {
  const [, setSelectedRect] = useSelectedInstanceRect();
  useSubscribe<"selectedInstanceRect", DOMRect>(
    "selectedInstanceRect",
    setSelectedRect
  );
  const [, setHoveredRect] = useHoveredInstanceRect();
  useSubscribe<"hoveredInstanceRect", DOMRect>(
    "hoveredInstanceRect",
    setHoveredRect
  );
};
