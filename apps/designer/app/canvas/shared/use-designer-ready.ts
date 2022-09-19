import { useState } from "react";
import { publish, useSubscribe } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    designerReady: undefined;
    designerReadyAck: undefined;
  }
}

export const useSubscribeDesignerReady = () => {
  const [isReady, setIsReady] = useState<boolean>(false);
  useSubscribe("designerReady", () => {
    setIsReady(true);
    publish({ type: "designerReadyAck" });
  });
  return isReady;
};
