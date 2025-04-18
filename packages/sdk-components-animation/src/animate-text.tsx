import { forwardRef, type ElementRef } from "react";

const easings = {
  linear: true,
  easeIn: true,
  easeInCubic: true,
  easeInQuart: true,
  easeOut: true,
  easeOutCubic: true,
  easeOutQuart: true,
  ease: true,
  easeInOutCubic: true,
  easeInOutQuart: true,
};

const split = {
  char: true,
  space: true,
  'symbol "#"': true,
  'symbol "~"': true,
};

type AnimateChildrenProps = {
  /**
   * Size of the sliding window for the animation:
   * - 0: Typewriter effect (no animation).
   * - (0..1]: Animates one part of the text at a time.
   * - (1..n]: Animates multiple parts of the text within the sliding window.
   */
  slidingWindow?: number;
  /**
   * Easing function applied within the sliding window.
   */
  easing?: keyof typeof easings;
  /**
   * Text content to animate.
   */
  children: React.ReactNode;
  /**
   * Defines how the text is split for animation (e.g., by character, space, or symbol).
   */
  splitBy?: keyof typeof split;
} & {
  className?: string;
};

export const AnimateText = forwardRef<ElementRef<"div">, AnimateChildrenProps>(
  (
    { slidingWindow = 5, easing = "linear", splitBy = "char", ...props },
    ref
  ) => {
    return <div ref={ref} {...props} />;
  }
);

const displayName = "AnimateText";
AnimateText.displayName = displayName;
