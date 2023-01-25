import { useSubscribe } from "~/shared/pubsub";
import { useSelectedInstanceOutline } from "~/shared/nano-states";

export const useSubscribeInstanceRect = () => {
  const [selectedInstanceOutline, setSelectedInstanceOutline] =
    useSelectedInstanceOutline();
  useSubscribe("updateSelectedInstanceOutline", (value) => {
    setSelectedInstanceOutline({ ...selectedInstanceOutline, ...value });
  });
};
