import * as React from "react";
import { IconProps } from "./types";

export const SizeIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.897 12.497a.6.6 0 00.6-.6V8a.6.6 0 10-1.2 0v2.449L5.55 4.702H8a.6.6 0 000-1.2H4.102a.6.6 0 00-.6.6V8a.6.6 0 001.2 0V5.55l5.747 5.747h-2.45a.6.6 0 100 1.2h3.898z"
          fill={color}
        />
      </svg>
    );
  }
);

SizeIcon.displayName = "SizeIcon";
