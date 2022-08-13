import * as React from "react";
import { IconProps } from "./types";

export const FlexDirectionRowReverse = React.forwardRef<
  SVGSVGElement,
  IconProps
>(({ color = "currentColor", ...props }, forwardedRef) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
      style={{ transform: "rotate(180deg)" }}
    >
      <path
        d="M5 12.8334L14.8881 12.8334L11.9794 15.825L13.125 17L18 12L13.125 7.00003L11.9794 8.17503L14.8881 11.1667L5 11.1667V12.8334Z"
        fill={color}
      />
    </svg>
  );
});
FlexDirectionRowReverse.displayName = "FlexDirectionRowReverse";
