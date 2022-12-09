import { useEffect } from "react";
import mitt from "mitt";
import noop from "lodash.noop";

// Using a JS emitter to avoid overhead with subscribing scroll event directly on the DOM by many listeners
const emitter = mitt();

if (typeof window === "object") {
  const eventOptions = {
    passive: true,
    capture: true,
  };
  window.addEventListener(
    "scroll",
    () => {
      emitter.emit("scroll");
    },
    eventOptions
  );

  let timeoutId = 0;
  let isScrolling = false;

  emitter.on("scroll", () => {
    isScrolling = true;
    emitter.emit("scrollStart");
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      if (isScrolling === false) {
        return;
      }
      isScrolling = false;
      emitter.emit("scrollEnd");
    }, 150);
  });
}

type UseScrollState = {
  onScroll?: () => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
};

/**
 * Scroll state abstraction that can handle a lot of subscribers well.
 * Potentially could add rate limiting and actual scroll top/left values.
 */
export const useScrollState = ({
  onScroll = noop,
  onScrollStart = noop,
  onScrollEnd = noop,
}: UseScrollState) => {
  useEffect(() => {
    emitter.on("scrollStart", onScrollStart);
    emitter.on("scroll", onScroll);
    emitter.on("scrollEnd", onScrollEnd);

    return () => {
      emitter.off("scrollStart", onScrollStart);
      emitter.off("scroll", onScroll);
      emitter.off("scrollEnd", onScrollEnd);
    };
  }, [onScroll, onScrollEnd, onScrollStart]);
};
