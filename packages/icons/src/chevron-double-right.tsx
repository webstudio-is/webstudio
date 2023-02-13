import * as React from "react";
import type { IconProps } from "./types";

export const ChevronDoubleRightIcon = React.forwardRef<
  SVGSVGElement,
  IconProps
>(({ color = "currentColor", ...props }, forwardedRef) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
    >
      <path
        d="M2 3L7 8L2 13M9 3L14 8L9 13"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

ChevronDoubleRightIcon.displayName = "ChevronDoubleRightIcon";
