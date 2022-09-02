import * as React from "react";
import { IconProps } from "./types";

export const UploadIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M9.758 8.442a.625.625 0 10.884-.884l-.884.884zM8 5.8l.442-.442a.625.625 0 00-.884 0L8 5.8zM5.358 7.558a.625.625 0 10.884.884l-.884-.884zM7.375 10.2a.625.625 0 101.25 0h-1.25zm5.5-2.2A4.875 4.875 0 018 12.875v1.25A6.125 6.125 0 0014.125 8h-1.25zM8 12.875A4.875 4.875 0 013.125 8h-1.25A6.125 6.125 0 008 14.125v-1.25zM3.125 8A4.875 4.875 0 018 3.125v-1.25A6.125 6.125 0 001.875 8h1.25zM8 3.125A4.875 4.875 0 0112.875 8h1.25A6.125 6.125 0 008 1.875v1.25zm2.642 4.433l-2.2-2.2-.884.884 2.2 2.2.884-.884zm-3.084-2.2l-2.2 2.2.884.884 2.2-2.2-.884-.884zM8.625 10.2V5.8h-1.25v4.4h1.25z"
          fill={color}
        />
      </svg>
    );
  }
);

UploadIcon.displayName = "UploadIcon";
