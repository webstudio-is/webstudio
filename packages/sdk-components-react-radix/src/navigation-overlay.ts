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

  // An anchor without target inherits the first document-level <base target>.
  // HTMLAnchorElement.target only exposes the anchor's own attribute.
  const target =
    anchor.getAttribute("target") ??
    anchor.ownerDocument
      .querySelector<HTMLBaseElement>("base[target]")
      ?.getAttribute("target") ??
    null;
  const targetKeyword = target?.toLowerCase();
  const currentWindow = anchor.ownerDocument.defaultView;
  // _parent and _top reuse the current context only at the top level. A named
  // target does so only when it names the current window.
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
