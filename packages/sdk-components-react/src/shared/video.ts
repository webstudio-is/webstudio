import { createContext } from "react";

const preconnectedOrigins = new Set<string>();

export const preconnect = (url: string) => {
  if (preconnectedOrigins.has(url)) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = url;
  link.crossOrigin = "true";
  document.head.appendChild(link);
  preconnectedOrigins.add(url);
};

export const requestFullscreen = (element: HTMLIFrameElement) => {
  const isTouchDevice = "ontouchstart" in window;
  // Allows it to work on small screens on desktop too and makes it easy to test.
  const isMobileResolution = window.matchMedia("(max-width: 1024px)").matches;
  if (isMobileResolution || isTouchDevice) {
    element.requestFullscreen();
  }
};

export type PlayerStatus = "initial" | "loading" | "ready";

export const VideoContext = createContext<{
  previewImageUrl?: URL;
  onInitPlayer: () => void;
  status: PlayerStatus;
}>({
  onInitPlayer: () => {},
  status: "initial",
});
