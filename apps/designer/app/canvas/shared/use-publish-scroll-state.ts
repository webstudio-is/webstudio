import { publish } from "@webstudio-is/sdk";
import { useScrollState } from "apps/designer/app/shared/dom-hooks";

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
