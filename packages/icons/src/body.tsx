import * as React from "react";
import type { IconProps } from "./types";

export const BodyIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M1 3.96833H14M2.51667 14H12.4833C13.321 14 14 13.321 14 12.4833V2.51667C14 1.67903 13.321 1 12.4833 1H2.51667C1.67903 1 1 1.67903 1 2.51667V12.4833C1 13.321 1.67903 14 2.51667 14Z"
          stroke={color}
          strokeWidth="1.15"
        />
      </svg>
    );
  }
);

BodyIcon.displayName = "BodyIcon";
