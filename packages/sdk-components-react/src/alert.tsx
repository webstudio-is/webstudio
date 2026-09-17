import { forwardRef, type ComponentProps, type ElementRef } from "react";

export const defaultTag = "div";

type Props = Omit<ComponentProps<typeof defaultTag>, "title"> & {
  variant?: "note" | "tip" | "important" | "warning" | "caution";
};

export const Alert = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ variant = "note", role = "note", children, ...props }, ref) => {
    return (
      <div {...props} role={role} data-state={variant} ref={ref}>
        {children}
      </div>
    );
  }
);

Alert.displayName = "Alert";
