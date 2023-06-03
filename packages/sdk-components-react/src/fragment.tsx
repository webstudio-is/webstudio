import { forwardRef, type ElementRef, type ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export const Fragment = forwardRef<ElementRef<"div">, Props>((props, ref) => {
  return <div {...props} ref={ref} style={{ display: "contents" }} />;
});

Fragment.displayName = "Fragment";
