import { useScrollState } from "~/shared/dom-hooks";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    scrollState: boolean;
  }
}

export const usePublishScrollState = () => {
  useScrollState({
    onScrollStart() {
      publish({ type: "scrollState", payload: true });
    },
    onScrollEnd() {
      publish({
        type: "scrollState",
        payload: false,
      });
    },
  });
};
