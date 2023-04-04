import { createNanoEvents } from "nanoevents";

// Using a JS emitter to avoid overhead with subscribing scroll event directly on the DOM by many listeners
const emitter = createNanoEvents<{
  scrollStart: () => void;
  scroll: () => void;
  scrollEnd: () => void;
}>();

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

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

/**
 * Scroll state abstraction that can handle a lot of subscribers well.
 * Potentially could add rate limiting and actual scroll top/left values.
 */
export const subscribeScrollState = ({
  onScroll = noop,
  onScrollStart = noop,
  onScrollEnd = noop,
}: UseScrollState) => {
  const unsubscribeScrollStart = emitter.on("scrollStart", onScrollStart);
  const unsubscribeScroll = emitter.on("scroll", onScroll);
  const unsubscribeScrollEnd = emitter.on("scrollEnd", onScrollEnd);

  return () => {
    unsubscribeScrollStart();
    unsubscribeScroll();
    unsubscribeScrollEnd();
  };
};
