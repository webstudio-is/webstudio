import { useEffect, useState } from "react";
import { Alert } from "./alert";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

const useTooSmallMessage = () => {
  const [message, setMessage] = useState<string>();
  const check = () => {
    const minWidth = 900;
    const message =
      window.innerWidth >= minWidth
        ? undefined
        : `Your browser window is too small. Resize your browser to at least ${minWidth}px wide to continue building with Webstudio.`;
    setMessage(message);
  };

  useWindowResizeDebounced(check);
  useEffect(check, []);
  return message;
};

const useUnsupportedBrowser = () => {
  const [message, setMessage] = useState<string>();
  useEffect(() => {
    if ("chrome" in window || isFeatureEnabled("unsupportedBrowsers")) {
      return;
    }
    setMessage(
      "Webstudio currently supports Google Chrome and Microsoft Edge. We plan to support more browsers in the near future."
    );
  }, []);
  return message;
};

export const BlockingAlerts = () => {
  // Takes the latest message, order matters
  const message = [useTooSmallMessage(), useUnsupportedBrowser()]
    .filter(Boolean)
    .pop();

  if (message === undefined) {
    return null;
  }

  return <Alert message={message} />;
};
