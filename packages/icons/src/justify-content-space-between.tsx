import * as React from "react";
import type { IconProps } from "./types";

export const JustifyContentSpaceBetweenIcon = React.forwardRef<
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.1999 7.19999H7.9999V4.79999H6.3999V19.2H7.9999V16.8H11.1999V7.19999ZM12.7999 16.8H15.9999V19.2H17.5999V4.79999H15.9999V7.19999H12.7999V16.8Z"
        fill={color}
      />
    </svg>
  );
});
JustifyContentSpaceBetweenIcon.displayName = "JustifyContentSpaceBetweenIcon";
