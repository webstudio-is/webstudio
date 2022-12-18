import mitt from "mitt";
import { useCallback, useEffect, useRef } from "react";

export const createPubsub = <PublishMap>() => {
  type Action<Type extends keyof PublishMap> =
    undefined extends PublishMap[Type]
      ? { type: Type; payload?: PublishMap[Type] }
      : { type: Type; payload: PublishMap[Type] };

  // `mitt` has a somewhat annoying overload for `*` type that makes it hard to wrap in a generic context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitter = mitt<Record<any, any>>();

  if (typeof window === "object") {
    window.addEventListener(
      "message",
      (event: MessageEvent) => {
        // @todo this has no type safety built in, could be anything from any source.
        // we could potentially maintain a list of valid event types at runtime
        // at the very least we could add a brand property or something to our events
        if (typeof event.data?.type === "string") {
          emitter.emit(event.data.type, event.data.payload);
        }
      },
      false
    );
  }

  return {
    /**
     * To publish a postMessage event on the current window and parent window from the iframe.
     */
    publish<Type extends keyof PublishMap>(action: Action<Type>) {
      window.parent.postMessage(action, "*");
      window.postMessage(action, "*");
    },

    /**
     * To publish a postMessage event on the iframe and parent window from the parent window.
     */
    usePublish() {
      const iframeRef = useRef<HTMLIFrameElement | null>(null);
      const publishCallback = useCallback(
        <Type extends keyof PublishMap>(action: Action<Type>) => {
          const element = iframeRef.current;
          if (element?.contentWindow == null) {
            return;
          }
          element.contentWindow.postMessage(action, "*");
          window.postMessage(action, "*");
        },
        [iframeRef]
      );
      return [publishCallback, iframeRef] as const;
    },

    /**
     * To subscribe a message event on the current window.
     */
    useSubscribe<Type extends keyof PublishMap>(
      type: Type,
      onAction: (payload: PublishMap[Type]) => void
    ) {
      useEffect(() => {
        emitter.on(type, onAction);
        return () => {
          emitter.off(type, onAction);
        };
      }, [type, onAction]);
    },

    useSubscribeAll(
      onAction: <Type extends keyof PublishMap>(
        type: Type,
        payload: PublishMap[Type]
      ) => void
    ) {
      useEffect(() => {
        emitter.on("*", onAction);
        return () => {
          emitter.off("*", onAction);
        };
      }, [onAction]);
    },

    subscribe<Type extends keyof PublishMap>(
      type: Type,
      onAction: (payload: PublishMap[Type]) => void
    ) {
      emitter.on(type, onAction);
      return () => {
        emitter.off(type, onAction);
      };
    },

    subscribeAll(
      onAction: <Type extends keyof PublishMap>(
        type: Type,
        payload: PublishMap[Type]
      ) => void
    ) {
      emitter.on("*", onAction);
      return () => {
        emitter.off("*", onAction);
      };
    },
  };
};
