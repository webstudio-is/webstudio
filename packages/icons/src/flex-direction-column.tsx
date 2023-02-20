import * as React from "react";
import type { IconProps } from "./types";

export const FlexDirectionColumnIcon = React.forwardRef<
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
    >
      <path
        d="M11.1667 6L11.1667 15.8881L8.175 12.9794L7 14.125L12 19L17 14.125L15.825 12.9794L12.8333 15.8881L12.8333 6L11.1667 6Z"
        fill={color}
      />
    </svg>
  );
});
FlexDirectionColumnIcon.displayName = "FlexDirectionColumnIcon";
