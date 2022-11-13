import * as React from "react";
import { IconProps } from "./types";

export const TextAlignCenterIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
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
          d="M1 4C1 3.65482 1.27982 3.375 1.625 3.375H14.375C14.7202 3.375 15 3.65482 15 4C15 4.34518 14.7202 4.625 14.375 4.625H1.625C1.27982 4.625 1 4.34518 1 4Z"
          fill={color}
        />
        <path
          d="M4 8C4 7.65482 4.27982 7.375 4.625 7.375H11.375C11.7202 7.375 12 7.65482 12 8C12 8.34518 11.7202 8.625 11.375 8.625H4.625C4.27982 8.625 4 8.34518 4 8Z"
          fill={color}
        />
        <path
          d="M3 12C3 11.6548 3.27982 11.375 3.625 11.375H12.375C12.7202 11.375 13 11.6548 13 12C13 12.3452 12.7202 12.625 12.375 12.625H3.625C3.27982 12.625 3 12.3452 3 12Z"
          fill={color}
        />
      </svg>
    );
  }
);
TextAlignCenterIcon.displayName = "TextAlignCenterIcon";
