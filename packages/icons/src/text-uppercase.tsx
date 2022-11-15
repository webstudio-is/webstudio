import * as React from "react";
import { IconProps } from "./types";

export const TextUppercaseIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M2.33566 8.8573H5.81566M1.17566 11.85L3.65325 4.81882C3.78744 4.43799 3.85454 4.24757 3.94752 4.1885C4.02831 4.13717 4.12301 4.13717 4.2038 4.1885C4.29678 4.24757 4.36387 4.43799 4.49807 4.81882L6.97566 11.85M10.1843 8.85777H13.6643M9.02429 11.8517L11.5019 4.81764C11.6361 4.43664 11.7032 4.24615 11.7962 4.18705C11.8769 4.1357 11.9716 4.1357 12.0524 4.18705C12.1454 4.24615 12.2125 4.43664 12.3467 4.81764L14.8243 11.8517"
          stroke={color}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);
TextUppercaseIcon.displayName = "TextUppercaseIcon";
