import { useSubscribe } from "~/shared/pubsub";
import { $dragAndDropState } from "~/shared/nano-states";

export const useSubscribeDragAndDropState = () => {
  useSubscribe("dragStart", (dragPayload) => {
    // It's possible that dropTargetChange comes before dragStart.
    // So it's important to spread the current ...state here.
    $dragAndDropState.set({
      ...$dragAndDropState.get(),
      isDragging: true,
      dragPayload,
    });
  });

  useSubscribe("dropTargetChange", (dropTarget) => {
    $dragAndDropState.set({ ...$dragAndDropState.get(), dropTarget });
  });

  useSubscribe("dragEnd", () => {
    $dragAndDropState.set({ isDragging: false });
  });
};
