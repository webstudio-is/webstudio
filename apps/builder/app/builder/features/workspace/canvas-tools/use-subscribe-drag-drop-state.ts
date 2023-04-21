import { useSubscribe } from "~/shared/pubsub";
import { useDragAndDropState } from "~/shared/nano-states";

export const useSubscribeDragAndDropState = () => {
  const [, setState] = useDragAndDropState();

  useSubscribe("dragStart", (dragPayload) => {
    // It's possible that dropTargetChange comes before dragStart.
    // So it's important to spread the current ...state here.
    setState((state) => ({ ...state, isDragging: true, dragPayload }));
  });

  useSubscribe("dropTargetChange", (dropTarget) => {
    setState((state) => ({ ...state, dropTarget }));
  });

  useSubscribe("placementIndicatorChange", (placementIndicator) => {
    setState((state) => ({ ...state, placementIndicator }));
  });

  useSubscribe("dragEnd", () => {
    setState({ isDragging: false });
  });
};
