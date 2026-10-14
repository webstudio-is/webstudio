import { forwardRef, type ElementRef } from "react";
import type { AnimationAction } from "@webstudio-is/sdk";

type ScrollProps = {
  debug?: boolean;
  children?: React.ReactNode;
  action: AnimationAction;
};

export const AnimateChildren = forwardRef<ElementRef<"div">, ScrollProps>(
  ({ debug = false, action, ...props }, ref) => {
    return <div ref={ref} style={{ display: "contents" }} {...props} />;
  }
);

const displayName = "AnimateChildren";
AnimateChildren.displayName = displayName;
