import {
  createElement,
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useEffect,
} from "react";

const defaultTag = "body";

export const Body = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>(({ children, className }, ref) => {
  useEffect(() => {
    document.body.className = className;
  }, []);
  return children;
});

Body.displayName = "Body";
