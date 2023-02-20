import * as React from "react";
import type { IconProps } from "./types";

export const TextAlignLeftIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M1 8C1 7.65482 1.27982 7.375 1.625 7.375H8.375C8.72018 7.375 9 7.65482 9 8C9 8.34518 8.72018 8.625 8.375 8.625H1.625C1.27982 8.625 1 8.34518 1 8Z"
          fill={color}
        />
        <path
          d="M1 12C1 11.6548 1.27982 11.375 1.625 11.375H10.375C10.7202 11.375 11 11.6548 11 12C11 12.3452 10.7202 12.625 10.375 12.625H1.625C1.27982 12.625 1 12.3452 1 12Z"
          fill={color}
        />
      </svg>
    );
  }
);
TextAlignLeftIcon.displayName = "TextAlignLeftIcon";
