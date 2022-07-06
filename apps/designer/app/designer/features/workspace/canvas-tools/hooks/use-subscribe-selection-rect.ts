import { useSubscribe } from "@webstudio-is/sdk";
import { useSelectionRect } from "apps/designer/app/designer/shared/nano-states";

export const useSubscribeSelectionRect = () => {
  const [, setSelectionRect] = useSelectionRect();
  useSubscribe<"selectionRect", DOMRect>("selectionRect", setSelectionRect);
};
