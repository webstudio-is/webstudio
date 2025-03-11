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

type AnimateChildrenProps = {
  charWindow?: number;
  easing?: keyof typeof easings;
  children: React.ReactNode;
};

export const AnimateText = forwardRef<ElementRef<"div">, AnimateChildrenProps>(
  ({ charWindow = 5, easing = "linear", ...props }, ref) => {
    return <div ref={ref} {...props} />;
  }
);

const displayName = "AnimateText";
AnimateText.displayName = displayName;
