import * as React from "react";
import type { IconProps } from "./types";

export const TextAlignJustifyIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M1 8C1 7.65482 1.27982 7.375 1.625 7.375H14.375C14.7202 7.375 15 7.65482 15 8C15 8.34518 14.7202 8.625 14.375 8.625H1.625C1.27982 8.625 1 8.34518 1 8Z"
          fill={color}
        />
        <path
          d="M1.625 11.375C1.27982 11.375 1 11.6548 1 12C1 12.3452 1.27982 12.625 1.625 12.625H14.375C14.7202 12.625 15 12.3452 15 12C15 11.6548 14.7202 11.375 14.375 11.375H1.625Z"
          fill={color}
        />
      </svg>
    );
  }
);
TextAlignJustifyIcon.displayName = "TextAlignJustifyIcon";
