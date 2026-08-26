import {
  createContext,
  type MouseEvent as ReactMouseEvent,
  useContext,
} from "react";

type LinkActivationEvent = Pick<
  ReactMouseEvent,
  "target" | "button" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

export const getLinkActivation = (event: LinkActivationEvent) => {
  if (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.target instanceof Element === false
  ) {
    return;
  }

  const anchor = event.target.closest("a[href]");
  if (anchor instanceof HTMLAnchorElement === false) {
    return;
  }

  if (anchor.hasAttribute("download")) {
    return;
  }

  const target = anchor.getAttribute("target")?.toLowerCase();
  if (target !== undefined && target !== "" && target !== "_self") {
    return;
  }

  if (anchor.getAttribute("href") === "#") {
    return;
  }

  return anchor;
};

export const NavigationOverlayContext = createContext<(() => void) | undefined>(
  undefined
);

export const useNavigationOverlay = () => useContext(NavigationOverlayContext);
