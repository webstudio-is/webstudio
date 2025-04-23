import { useEffect, useState, type ReactNode } from "react";
import { Alert } from "./alert";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { Link } from "@webstudio-is/design-system";
import { $isPreviewMode } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";
import { $loadingState } from "~/builder/shared/nano-states";

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
        The Webstudio Builder UI currently supports any{" "}
        <Link
          href="https://en.wikipedia.org/wiki/Chromium_(web_browser)"
          target="_blank"
          color="inherit"
          variant="inherit"
        >
          Chromium-based
        </Link>{" "}
        browsers such as{" "}
        <Link
          href="https://www.google.com/chrome"
          target="_blank"
          color="inherit"
          variant="inherit"
        >
          Google Chrome
        </Link>
        ,{" "}
        <Link
          href="https://www.microsoft.com/en-us/edge"
          target="_blank"
          color="inherit"
          variant="inherit"
        >
          Microsoft Edge
        </Link>
        ,{" "}
        <Link
          href="https://brave.com/"
          target="_blank"
          color="inherit"
          variant="inherit"
        >
          Brave
        </Link>
        ,{" "}
        <Link
          href="https://arc.net/"
          target="_blank"
          color="inherit"
          variant="inherit"
        >
          Arc
        </Link>{" "}
        and many more. We plan to support Firefox and Safari in the near future.
        <br />
        <br />
        The website you&apos;re building should function correctly across all
        browsers!
      </>
    );
  }, []);
  return message;
};

export const BlockingAlerts = () => {
  const isPreviewMode = useStore($isPreviewMode);
  const loadingState = useStore($loadingState);

  const unsupportedBrowsersMessage = useUnsupportedBrowser();
  // Takes the latest message, order matters
  const message = [useTooSmallMessage(), unsupportedBrowsersMessage]
    .filter(Boolean)
    .pop();

  if (
    message === undefined ||
    // We want user to be able to test in unsupported browsers in preview mode.
    isPreviewMode ||
    loadingState.state !== "ready"
  ) {
    return;
  }

  return (
    <Alert
      message={message}
      isDismissable={unsupportedBrowsersMessage !== undefined}
    />
  );
};
