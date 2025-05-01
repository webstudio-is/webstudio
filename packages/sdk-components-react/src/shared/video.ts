import { createContext } from "react";

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
