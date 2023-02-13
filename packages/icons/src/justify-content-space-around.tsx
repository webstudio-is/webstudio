import * as React from "react";
import type { IconProps } from "./types";

export const JustifyContentSpaceAroundIcon = React.forwardRef<
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
      <path d="M7.9999 19.2V4.79999H6.3999V19.2H7.9999Z" fill={color} />
      <path d="M17.5999 19.2V4.79999H15.9999V19.2H17.5999Z" fill={color} />
      <path d="M15.1999 16.8H12.7999V7.19999H15.1999V16.8Z" fill={color} />
      <path d="M8.7999 16.8H11.1999V7.19999H8.7999V16.8Z" fill={color} />
    </svg>
  );
});
JustifyContentSpaceAroundIcon.displayName = "JustifyContentSpaceAroundIcon";
