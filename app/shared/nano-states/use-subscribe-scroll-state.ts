import { useSubscribe } from "@webstudio-is/sdk";
import { useIsScrolling } from "./nano-states";

export const useSubscribeScrollState = () => {
  const [, setIsScrolling] = useIsScrolling();
  useSubscribe<"scrollState", boolean>("scrollState", setIsScrolling);
};
