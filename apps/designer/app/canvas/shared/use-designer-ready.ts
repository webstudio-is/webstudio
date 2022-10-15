import { useState } from "react";
import { useInterval } from "react-use";
import { publish, useSubscribe } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    canvasReady: undefined;
    canvasReadyAck: undefined;
  }
}

export const useSubscribeDesignerReady = () => {
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  useInterval(
    () => {
      // We publish this event to make sure designer is listening to the events,
      // otherwise if canvas loads faster than designer, which is possible with SSR,
      // we can miss the events and designer will just not connect to the canvas.
      publish({ type: "canvasReady" });
    },
    isAcknowledged ? null : 100
  );

  useSubscribe("canvasReadyAck", () => {
    setIsAcknowledged(true);
  });

  return isAcknowledged;
};
