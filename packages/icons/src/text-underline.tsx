import * as React from "react";
import { IconProps } from "./types";

export const TextUnderlineIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M5 3C5.34518 3 5.625 3.27982 5.625 3.625V8.5C5.625 9.81168 6.68832 10.875 8 10.875C9.31168 10.875 10.375 9.81168 10.375 8.5V3.625C10.375 3.27982 10.6548 3 11 3C11.3452 3 11.625 3.27982 11.625 3.625V8.5C11.625 10.502 10.002 12.125 8 12.125C5.99797 12.125 4.375 10.502 4.375 8.5V3.625C4.375 3.27982 4.65482 3 5 3ZM13.375 13.875C13.7202 13.875 14 14.1548 14 14.5C14 14.8452 13.7202 15.125 13.375 15.125H2.625C2.27982 15.125 2 14.8452 2 14.5C2 14.1548 2.27982 13.875 2.625 13.875H13.375Z"
          fill={color}
        />
      </svg>
    );
  }
);
TextUnderlineIcon.displayName = "TextUnderlineIcon";
