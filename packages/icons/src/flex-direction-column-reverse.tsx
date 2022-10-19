import * as React from "react";
import { IconProps } from "./types";

export const FlexDirectionColumnReverseIcon = React.forwardRef<
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
        d="M11.1667 6L11.1667 15.8881L8.175 12.9794L7 14.125L12 19L17 14.125L15.825 12.9794L12.8333 15.8881L12.8333 6L11.1667 6Z"
        fill={color}
      />
    </svg>
  );
});
FlexDirectionColumnReverseIcon.displayName = "FlexDirectionColumnReverseIcon";
