import * as React from "react";
import { IconProps } from "./types";

export const AlignContentSpaceBetweenIcon = React.forwardRef<
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
        d="M19 5H5V6H19V5ZM19 18H5V19H19V18ZM8 8H11V11H8V8ZM16 8H13V11H16V8ZM13 13H16V16H13V13ZM11 13H8V16H11V13Z"
        fill={color}
      />
    </svg>
  );
});
AlignContentSpaceBetweenIcon.displayName = "AlignContentSpaceBetweenIcon";
