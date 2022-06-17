import * as React from "react";
import { IconProps } from "./types";

export const UserIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        x="0px"
        y="0px"
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM2.5 12a9.5 9.5 0 1119 0 9.5 9.5 0 01-19 0z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8.5 10a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0zM12 16a6.497 6.497 0 00-5.63 3.25l-.866-.5A7.497 7.497 0 0112 15c2.777 0 5.2 1.51 6.497 3.75l-.866.5a6.497 6.497 0 00-5.63-3.25z"
          fill={color}
        />
      </svg>
    );
  }
);

UserIcon.displayName = "UserIcon";
