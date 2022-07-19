import { publish } from "@webstudio-is/react-sdk";
import { useScrollState } from "~/shared/dom-hooks";

export const usePublishScrollState = () => {
  useScrollState({
    onScrollStart() {
      publish<"scrollState", boolean>({ type: "scrollState", payload: true });
    },
    onScrollEnd() {
      publish<"scrollState", boolean>({
        type: "scrollState",
        payload: false,
      });
    },
  });
};
