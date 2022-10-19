import { useSubscribe } from "~/shared/pubsub";
import { useIsScrolling } from "./nano-states";

export const useSubscribeScrollState = () => {
  const [, setIsScrolling] = useIsScrolling();
  useSubscribe("scrollState", setIsScrolling);
};
