import { useSubscribe, type Instance } from "@webstudio-is/react-sdk";
import { useDragAndDropState } from "./nano-states";
import { DropTargetSharedData } from "~/canvas/shared/use-drag-drop";

export const useSubscribeDragAndDropState = () => {
  const [state, setState] = useDragAndDropState();

  useSubscribe<"dropTargetChange", DropTargetSharedData>(
    "dropTargetChange",
    (dropTarget) => {
      if (state.isDragging) {
        setState({ ...state, dropTarget });
      }
    }
  );

  useSubscribe<
    "dragStart",
    { origin: "panel" | "canvas"; dragItem: { instance: Instance } }
  >("dragStart", ({ origin, dragItem }) => {
    setState({
      isDragging: true,
      origin,
      dragItem,
    });
  });

  useSubscribe<"dragEnd", { origin: "panel" | "canvas" }>("dragEnd", () => {
    setState({ isDragging: false });
  });
};
