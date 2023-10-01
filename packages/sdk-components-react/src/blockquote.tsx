import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "blockquote";

type Props = ComponentProps<typeof defaultTag>;

export const Blockquote = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ children, ...props }, ref) => {
    return (
      <blockquote {...props} ref={ref}>
        {children ?? "Blockquote you can edit"}
      </blockquote>
    );
  }
);

Blockquote.displayName = "Blockquote";
