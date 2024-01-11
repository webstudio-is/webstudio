import { type ElementRef, type ComponentProps, forwardRef } from "react";

export const defaultTag = "code";

export const CodeText = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>(({ children, ...props }, ref) => {
  return (
    <code {...props} ref={ref}>
      {children ?? "Code you can edit"}
    </code>
  );
});

CodeText.displayName = "CodeText";
