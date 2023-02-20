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

  let timeoutId = 0;
  let isScrolling = false;

  window.addEventListener(
    "scroll",
    () => {
      if (isScrolling === false) {
        emitter.emit("scrollStart");
      }
      emitter.emit("scroll");
      isScrolling = true;
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (isScrolling === false) {
          return;
        }
        isScrolling = false;
        emitter.emit("scrollEnd");
      }, 150);
    },
    eventOptions
  );
}

type UseScrollState = {
  onScroll?: () => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
};

export const subscribeScrollState = ({
  onScroll = noop,
  onScrollStart = noop,
  onScrollEnd = noop,
}: UseScrollState) => {
  emitter.on("scrollStart", onScrollStart);
  emitter.on("scroll", onScroll);
  emitter.on("scrollEnd", onScrollEnd);

  return () => {
    emitter.off("scrollStart", onScrollStart);
    emitter.off("scroll", onScroll);
    emitter.off("scrollEnd", onScrollEnd);
  };
};

/**
 * Scroll state abstraction that can handle a lot of subscribers well.
 * Potentially could add rate limiting and actual scroll top/left values.
 */
export const useScrollState = ({
  onScroll,
  onScrollStart,
  onScrollEnd,
}: UseScrollState) => {
  useEffect(() => {
    const unsubscribe = subscribeScrollState({
      onScrollStart,
      onScroll,
      onScrollEnd,
    });
    return unsubscribe;
  }, [onScroll, onScrollEnd, onScrollStart]);
};
