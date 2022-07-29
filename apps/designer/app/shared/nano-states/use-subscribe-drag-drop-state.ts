import { useSubscribe } from "@webstudio-is/react-sdk";
import { useDragAndDropState } from "./nano-states";
import {
  DropTargetChangePayload,
  DragStartPayload,
  DragEndPayload,
} from "~/canvas/shared/use-drag-drop";

export const useSubscribeDragAndDropState = () => {
  const [state, setState] = useDragAndDropState();

  useSubscribe<"dragStart", DragStartPayload>(
    "dragStart",
    ({ origin, dragItem }) => {
      setState({ isDragging: true, origin, dragItem });
    }
  );

  useSubscribe<"dropTargetChange", DropTargetChangePayload>(
    "dropTargetChange",
    (dropTarget) => {
      setState({ ...state, dropTarget });
    }
  );

  useSubscribe<"dragEnd", DragEndPayload>("dragEnd", () => {
    setState({ isDragging: false });
  });
};
