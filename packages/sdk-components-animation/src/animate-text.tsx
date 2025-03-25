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
  slidingWindow?: number;
  easing?: keyof typeof easings;
  children: React.ReactNode;
  splitBy?: keyof typeof split;
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
