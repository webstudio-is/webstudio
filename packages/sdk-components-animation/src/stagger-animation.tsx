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

type StaggerAnimationProps = {
  /**
   * Size of the sliding window for the animation:
   * - 0: Typewriter effect (no animation).
   * - (0..1]: Animates one child at a time.
   * - (1..n]: Animates multiple children within the sliding window.
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
} & {
  className?: string;
};

export const StaggerAnimation = forwardRef<
  ElementRef<"div">,
  StaggerAnimationProps
>(({ slidingWindow = 1, easing = "linear", ...props }, ref) => {
  // Implementation is located in private-src
  return <div ref={ref} {...props} />;
});

const displayName = "StaggerAnimation";
StaggerAnimation.displayName = displayName;
