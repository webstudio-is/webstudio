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

  const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
  if (
    anchor === null ||
    anchor.namespaceURI !== "http://www.w3.org/1999/xhtml"
  ) {
    return;
  }

  if (anchor.hasAttribute("download")) {
    return;
  }

  const target = anchor.getAttribute("target");
  const targetKeyword = target?.toLowerCase();
  const currentWindow = anchor.ownerDocument.defaultView;
  const targetsCurrentContext =
    target === null ||
    target === "" ||
    targetKeyword === "_self" ||
    (targetKeyword === "_parent" && currentWindow?.parent === currentWindow) ||
    (targetKeyword === "_top" && currentWindow?.top === currentWindow) ||
    (targetKeyword?.startsWith("_") === false &&
      target === currentWindow?.name);
  if (targetsCurrentContext === false) {
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
