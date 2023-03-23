import { useSubscribe } from "~/shared/pubsub";
import { useDragAndDropState } from "./nano-states";

export const useSubscribeDragAndDropState = () => {
  const [state, setState] = useDragAndDropState();

  useSubscribe("dragStart", (dragPayload) => {
    // It's possible that dropTargetChange comes before dragStart.
    // So it's important to spread the current ...state here.
    setState({ ...state, isDragging: true, dragPayload });
  });

  useSubscribe("dropTargetChange", (dropTarget) => {
    setState({ ...state, dropTarget });
  });

  useSubscribe("placementIndicatorChange", (placementIndicator) => {
    setState({ ...state, placementIndicator });
  });

  useSubscribe("dragEnd", () => {
    setState({ isDragging: false });
  });
};
