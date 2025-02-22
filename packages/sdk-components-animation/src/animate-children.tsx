import type { Hook } from "@webstudio-is/react-sdk";
import type { AnimationAction } from "@webstudio-is/sdk";
import { forwardRef, type ElementRef } from "react";
import { animationCanPlayOnCanvasProperty } from "./shared/consts";

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

const namespace = "@webstudio-is/sdk-components-animation";

export const hooksAnimateChildren: Hook = {
  onNavigatorUnselect: (context, event) => {
    if (
      event.instancePath.length > 0 &&
      event.instancePath[0].component === `${namespace}:${displayName}`
    ) {
      context.setMemoryProp(
        event.instancePath[0],
        animationCanPlayOnCanvasProperty,
        undefined
      );
    }
  },
  onNavigatorSelect: (context, event) => {
    if (
      event.instancePath.length > 0 &&
      event.instancePath[0].component === `${namespace}:${displayName}`
    ) {
      context.setMemoryProp(
        event.instancePath[0],
        animationCanPlayOnCanvasProperty,
        true
      );
    }
  },
};
