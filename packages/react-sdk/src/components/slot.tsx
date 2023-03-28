import { forwardRef, type ElementRef, type ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export const Slot = forwardRef<ElementRef<"div">, Props>((props, ref) => {
  return (
    <div
      {...props}
      ref={ref}
      style={{ display: props.children ? "contents" : "block" }}
    />
  );
});

Slot.displayName = "Slot";
