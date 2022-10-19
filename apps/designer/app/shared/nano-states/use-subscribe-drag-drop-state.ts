import { useSubscribe } from "~/shared/pubsub";
import { useDragAndDropState } from "./nano-states";

export const useSubscribeDragAndDropState = () => {
  const [state, setState] = useDragAndDropState();

  useSubscribe("dragStart", ({ origin, dragItem }) => {
    // It's possible that dropTargetChange comes before dragStart.
    // So it's important to spread the current ...state here.
    setState({ ...state, isDragging: true, origin, dragItem });
  });

  useSubscribe("dropTargetChange", (dropTarget) => {
    setState({ ...state, dropTarget });
  });

  useSubscribe("dragEnd", () => {
    setState({ isDragging: false });
  });
};
