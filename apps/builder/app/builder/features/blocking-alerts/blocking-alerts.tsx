import { useEffect, useState, type ReactNode } from "react";
import { Alert } from "./alert";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

const useTooSmallMessage = () => {
  const [message, setMessage] = useState<string>();
  const check = () => {
    // To have more space for Chrome DevTools, we allow a smaller window size in development
    const minWidth = process.env.NODE_ENV === "production" ? 900 : 700;
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
  const [message, setMessage] = useState<ReactNode>();
  useEffect(() => {
    if ("chrome" in window || isFeatureEnabled("unsupportedBrowsers")) {
      return;
    }
    setMessage(
      <>
        The Webstudio Builder UI currently supports Chromium-based browsers such
        as Google Chrome and Microsoft Edge. We plan to support more browsers in
        the near future.
        <br />
        <br />
        The website you're building should function correctly across all
        browsers.
      </>
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
