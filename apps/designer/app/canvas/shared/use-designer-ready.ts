import { useState } from "react";
import { useSubscribe } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    designerReady: undefined;
  }
}

export const useSubscribeDesignerReady = () => {
  const [isReady, setIsReady] = useState<boolean>(false);
  useSubscribe("designerReady", () => {
    setIsReady(true);
  });
  return isReady;
};
