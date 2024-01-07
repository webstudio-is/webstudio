import { createNanoEvents } from "nanoevents";
import { useEffect } from "react";
import { batchUpdate } from "./raf-queue";

export const createPubsub = <PublishMap>() => {
  type Action<Type extends keyof PublishMap> =
    PublishMap[Type] extends undefined
      ? { type: Type; payload?: undefined }
      : { type: Type; payload: PublishMap[Type] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitter = createNanoEvents<Record<any, any>>();

  if (globalThis.addEventListener) {
    globalThis.addEventListener(
      "message",
      (event: MessageEvent) => {
        // @todo this has no type safety built in, could be anything from any source.
        // we could potentially maintain a list of valid event types at runtime
        // at the very least we could add a brand property or something to our events
        if (typeof event.data?.type === "string") {
          // Execute all updates within a single batch to improve performance
          batchUpdate(() => emitter.emit(event.data.type, event.data.payload));
        }
      },
      false
    );
  }

  const iframes = new Set<HTMLIFrameElement>();
  const registerIframe = (element: HTMLIFrameElement) => {
    iframes.add(element);
    return () => {
      iframes.delete(element);
    };
  };

  return {
    registerIframe,

    /**
     * To publish a postMessage event on the current window and parent window from the iframe.
     */
    publish<Type extends keyof PublishMap>(action: Action<Type>) {
      // avoid double events when no parent window
      // and window.parent references window itself
      if (typeof window !== "undefined" && window.parent !== window) {
        window.parent.postMessage(action, "*");
      }
      // broadcast actions to connected plugins
      for (const element of iframes) {
        element.contentWindow?.postMessage(action, "*");
      }
      // support node environment for testing
      if (globalThis.postMessage) {
        globalThis.postMessage(action, "*");
      } else {
        emitter.emit(action.type, action.payload);
      }
    },

    /**
     * To subscribe a message event on the current window.
     */
    useSubscribe<Type extends keyof PublishMap>(
      type: Type,
      onAction: (payload: PublishMap[Type]) => void
    ) {
      useEffect(() => {
        return emitter.on(type, onAction);
      }, [type, onAction]);
    },

    subscribe<Type extends keyof PublishMap>(
      type: Type,
      onAction: (payload: PublishMap[Type]) => void
    ) {
      return emitter.on(type, onAction);
    },
  };
};
