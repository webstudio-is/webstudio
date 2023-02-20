import * as React from "react";
import type { IconProps } from "./types";

export const AlignSelfEndIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        {...props}
        ref={forwardedRef}
      >
        <path
          fill={color}
          fillRule="evenodd"
          d="M14.5 14.2004c0 .3866-.3439.7-.7682.7H2.26818c-.42425 0-.76818-.3134-.76818-.7 0-.3866.34393-.7.76818-.7H13.7318c.4243 0 .7682.3134.7682.7Z"
          clipRule="evenodd"
        />
        <rect
          width="3"
          height="9"
          x="9.5"
          y="12.4004"
          fill={color}
          rx=".8"
          transform="rotate(-180 9.5 12.4004)"
        />
      </svg>
    );
  }
);
AlignSelfEndIcon.displayName = "AlignSelfEndIcon";
