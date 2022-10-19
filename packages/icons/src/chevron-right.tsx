import * as React from "react";
import { IconProps } from "./types";

export const ChevronRightIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M6.2838 11.9599C6.03034 11.7057 6.03097 11.2941 6.2852 11.0407L9.33503 8.00013L6.2852 4.95959C6.03097 4.70614 6.03034 4.29458 6.2838 4.04036C6.53725 3.78613 6.94881 3.7855 7.20303 4.03895L10.7146 7.5398C10.8369 7.66176 10.9057 7.82739 10.9057 8.00013C10.9057 8.17286 10.8369 8.33849 10.7146 8.46045L7.20303 11.9613C6.94881 12.2148 6.53725 12.2141 6.2838 11.9599Z"
          fill={color}
        />
      </svg>
    );
  }
);

ChevronRightIcon.displayName = "ChevronRightIcon";
