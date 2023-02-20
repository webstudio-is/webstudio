import * as React from "react";
import type { IconProps } from "./types";

export const ExternalLinkIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill={color}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill={color}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.7 3.7h2.294a.7.7 0 1 0 0-1.4H3.5a1.2 1.2 0 0 0-1.2 1.2v9a1.2 1.2 0 0 0 1.2 1.2h9a1.2 1.2 0 0 0 1.2-1.2V9.993a.7.7 0 1 0-1.4 0V12.3H3.7V3.7ZM8.813 3a.7.7 0 0 1 .7-.7H13a.7.7 0 0 1 .7.7v3.49a.7.7 0 1 1-1.4 0v-1.8L8.495 8.495a.7.7 0 1 1-.99-.99L11.31 3.7H9.513a.7.7 0 0 1-.7-.7Z"
        />
      </svg>
    );
  }
);

ExternalLinkIcon.displayName = "ExternalLinkIcon";
