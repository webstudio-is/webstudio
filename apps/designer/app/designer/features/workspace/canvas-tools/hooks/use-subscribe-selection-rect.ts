import { useSubscribe } from "~/shared/pubsub";
import { useSelectionRect } from "~/designer/shared/nano-states";

export const useSubscribeSelectionRect = () => {
  const [, setSelectionRect] = useSelectionRect();
  useSubscribe("selectionRect", setSelectionRect);
};
