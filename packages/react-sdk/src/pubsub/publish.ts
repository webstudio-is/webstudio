import { useRef, useCallback, MutableRefObject } from "react";

type Action<Type, Payload> = {
  type: Type;
  payload?: Payload;
};

export type Publish = <Type, Payload = undefined>(
  action: Action<Type, Payload>
) => void;

type UsePublish = [Publish, MutableRefObject<HTMLIFrameElement | null>];

/**
 * To publish a postMessage event on the iframe and parent window from the parent window.
 */
export const usePublish = (): UsePublish => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const publishCallback: Publish = useCallback(
    (action) => {
      const element = iframeRef.current;
      if (element?.contentWindow == null) return;
      element.contentWindow.postMessage(action, "*");
      window.postMessage(action, "*");
    },
    [iframeRef]
  );
  return [publishCallback, iframeRef];
};

/**
 * To publish a postMessage event on the current window and parent window from the iframe.
 */
export const publish = <Type extends string, Payload = undefined>(
  action: Action<Type, Payload>
) => {
  window.parent.postMessage(action, "*");
  window.postMessage(action, "*");
};
