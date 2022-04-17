import { useRef, useCallback, MutableRefObject } from "react";
export { useSubscribe } from "@webstudio-is/sdk";

export type Publish = <Type, Payload = undefined>(action: {
  type: Type;
  payload?: Payload;
}) => void;

type UsePublish = [Publish, MutableRefObject<HTMLIFrameElement | null>];

export const usePublish = (): UsePublish => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const publish = useCallback(
    (action) => {
      const element = iframeRef.current;
      if (element?.contentWindow == null) return;
      element.contentWindow.postMessage(action, "*");
      window.postMessage(action, "*");
    },
    [iframeRef]
  );
  return [publish, iframeRef];
};
