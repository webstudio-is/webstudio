/**
 * @deprecated This component will be replaced by the Element component in the future.
 * Use Element with tag="blockquote" instead.
 */
import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "blockquote";

type Props = ComponentProps<typeof defaultTag>;

export const Blockquote = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ children, ...props }, ref) => {
    return (
      <blockquote {...props} ref={ref}>
        {children}
      </blockquote>
    );
  }
);

Blockquote.displayName = "Blockquote";
