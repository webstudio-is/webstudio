import * as React from "react";
import type { IconProps } from "./types";

export const AlignSelfStartIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M1.5 1.79961c0-.3866.34393-.7.76818-.7H13.7318c.4243 0 .7682.3134.7682.7 0 .3866-.3439.7-.7682.7H2.26818c-.42425 0-.76818-.3134-.76818-.7Z"
          clipRule="evenodd"
        />
        <rect width="3" height="9" x="6.5" y="3.59961" fill={color} rx=".8" />
      </svg>
    );
  }
);
AlignSelfStartIcon.displayName = "AlignSelfStartIcon";
