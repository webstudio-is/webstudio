import * as React from "react";
import { IconProps } from "./types";

export const TextItalicIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12.75 3H7.125M9.625 13H4M10.25 3L6.5 13"
          stroke={color}
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);
TextItalicIcon.displayName = "TextItalicIcon";
