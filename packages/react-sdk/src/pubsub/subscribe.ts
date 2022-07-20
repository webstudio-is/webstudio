import mitt from "mitt";
import { useEffect } from "react";

// @todo do we want to have a central map of all events/data?
// Pro - you can't use a wrong event with a wrong data
// Contra - if we have hundreds of events, this list will become a central thing to change,
// may result in maintenance downsides and merge conflicts, because it will have to import each data type
type Events = Record<string, any>;

export const emitter = mitt<Events>();

if (typeof window === "object") {
  window.addEventListener(
    "message",
    (event: MessageEvent) => {
      // @todo this has no type safety built in, could be anything from any source.
      // we could potentially maintain a list of valid event types, but see prior contra points.
      if (typeof event.data?.type === "string") {
        emitter.emit(event.data.type, event.data.payload);
      }
    },
    false
  );
}

/**
 * To subscribe a message event on the current window.
 */
export const useSubscribe = <Type extends string, Payload = undefined>(
  type: Type,
  onAction: (payload: Payload) => void
) => {
  useEffect(() => {
    emitter.on(type, onAction);
    return () => {
      emitter.off(type, onAction);
    };
  }, [type, onAction]);
};
