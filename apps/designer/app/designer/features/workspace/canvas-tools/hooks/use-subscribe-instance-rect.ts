import { useSubscribe } from "~/shared/pubsub";
import {
  useSelectedInstanceRect,
  useHoveredInstanceRect,
} from "~/shared/nano-states";

export const useSubscribeInstanceRect = () => {
  const [, setSelectedRect] = useSelectedInstanceRect();
  useSubscribe("selectedInstanceRect", setSelectedRect);
  const [, setHoveredRect] = useHoveredInstanceRect();
  useSubscribe("hoveredInstanceRect", setHoveredRect);
};
