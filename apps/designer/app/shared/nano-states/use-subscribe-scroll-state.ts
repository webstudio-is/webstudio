import { useSubscribe } from "@webstudio-is/react-sdk";
import { useIsScrolling } from "./nano-states";

export const useSubscribeScrollState = () => {
  const [, setIsScrolling] = useIsScrolling();
  useSubscribe<"scrollState", boolean>("scrollState", setIsScrolling);
};
