import * as React from "react";
import type { IconProps } from "./types";

export const TextHyphenIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12 8C12 8.55228 11.5523 9 11 9H5C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7H11C11.5523 7 12 7.44772 12 8Z"
          fill={color}
        />
      </svg>
    );
  }
);
TextHyphenIcon.displayName = "TextHyphenIcon";
