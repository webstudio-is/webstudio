import { useEffect, useState } from "react";
import { Alert } from "./alert";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Link,
  Text,
  theme,
} from "@webstudio-is/design-system";
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

const useIsUnsupportedBrowser = () => {
  const [isUnsupportedBrowser, setIsUnsupportedBrowser] = useState(false);
  useEffect(() => {
    if ("chrome" in window || isFeatureEnabled("unsupportedBrowsers")) {
      return;
    }

    setIsUnsupportedBrowser(true);
  }, []);
  return isUnsupportedBrowser;
};

export const UnsupportedBrowserDialog = ({
  onDismiss,
}: {
  onDismiss: () => void;
}) => (
  <Dialog
    open
    modal
    onOpenChange={(open) => {
      if (open === false) {
        onDismiss();
      }
    }}
  >
    <DialogContent width={480}>
      <DialogTitle>Unsupported browser</DialogTitle>
      <DialogDescription asChild>
        <Text css={{ padding: theme.panel.padding }}>
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
          and many more. We plan to support Firefox and Safari in the near
          future.
          <br />
          <br />
          The website you&apos;re building should function correctly across all
          browsers!
        </Text>
      </DialogDescription>
      <DialogActions>
        <Button autoFocus onClick={onDismiss}>
          Continue
        </Button>
      </DialogActions>
    </DialogContent>
  </Dialog>
);

export const BlockingAlerts = () => {
  const isPreviewMode = useStore($isPreviewMode);
  const loadingState = useStore($loadingState);
  const [isUnsupportedBrowserDialogDismissed, setIsDialogDismissed] =
    useState(false);
  const isUnsupportedBrowser = useIsUnsupportedBrowser();
  const tooSmallMessage = useTooSmallMessage();

  if (
    // We want user to be able to test in unsupported browsers in preview mode.
    isPreviewMode ||
    loadingState.state !== "ready"
  ) {
    return;
  }

  if (tooSmallMessage !== undefined) {
    return <Alert message={tooSmallMessage} />;
  }

  if (isUnsupportedBrowser && isUnsupportedBrowserDialogDismissed === false) {
    return (
      <UnsupportedBrowserDialog onDismiss={() => setIsDialogDismissed(true)} />
    );
  }
};
