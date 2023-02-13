import * as React from "react";
import type { IconProps } from "./types";

export const TextDirectionLTRIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.46967 12.5303C8.17678 12.2374 8.17678 11.7626 8.46967 11.4697L11.1893 8.75L3 8.75C2.58579 8.75 2.25 8.41421 2.25 8C2.25 7.58579 2.58579 7.25 3 7.25L11.1893 7.25L8.46967 4.53033C8.17678 4.23744 8.17678 3.76256 8.46967 3.46967C8.76256 3.17678 9.23744 3.17678 9.53033 3.46967L13.5303 7.46967C13.8232 7.76256 13.8232 8.23744 13.5303 8.53033L9.53033 12.5303C9.23744 12.8232 8.76256 12.8232 8.46967 12.5303Z"
          fill={color}
        />
      </svg>
    );
  }
);
TextDirectionLTRIcon.displayName = "TextDirectionLTRIcon";
