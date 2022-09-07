import * as React from "react";
import { IconProps } from "./types";

export const AlignContentCenterIcon = React.forwardRef<
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
        d="M8 6H11V9H8V6ZM4 11.5H20V12.5H4V11.5ZM16 6H13V9H16V6ZM13 15H16V18H13V15ZM11 15H8V18H11V15Z"
        fill={color}
      />
    </svg>
  );
});
AlignContentCenterIcon.displayName = "AlignContentCenterIcon";
