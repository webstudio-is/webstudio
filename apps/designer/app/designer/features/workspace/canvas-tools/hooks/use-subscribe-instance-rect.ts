import { useSubscribe } from "~/shared/pubsub";
import {
  useSelectedInstanceOutline,
  useHoveredInstanceRect,
} from "~/shared/nano-states";

export const useSubscribeInstanceRect = () => {
  const [selectedInstanceOutline, setSelectedInstanceOutline] =
    useSelectedInstanceOutline();
  useSubscribe("updateSelectedInstanceOutline", (value) => {
    setSelectedInstanceOutline({ ...selectedInstanceOutline, ...value });
  });
  const [, setHoveredRect] = useHoveredInstanceRect();
  useSubscribe("hoveredInstanceRect", setHoveredRect);
};
