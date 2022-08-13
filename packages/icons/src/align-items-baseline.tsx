import * as React from "react";
import { IconProps } from "./types";

export const AlignItemsBaseline = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
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
          d="M10 6H8V15H10V6ZM7 5V16H11V5H7Z"
          fill={color}
        />
        <path d="M7 12H11V18H7V12Z" fill={color} />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 13H8V17H10V13ZM7 12V18H11V12H7Z"
          fill={color}
        />
        <path d="M13 12H16V15H13V12Z" fill={color} />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15 13H14V14H15V13ZM13 12V15H16V12H13Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 8H14V15H16V8ZM13 7V16H17V7H13Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20 13H4V11.5H20V13Z"
          fill={color}
        />
      </svg>
    );
  }
);
AlignItemsBaseline.displayName = "AlignItemsBaseline";
