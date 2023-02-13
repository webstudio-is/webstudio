import * as React from "react";
import type { IconProps } from "./types";

export const TrashIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12.2127 4.9909L11.6908 12.2986C11.6692 12.6023 11.5333 12.8865 11.3105 13.094C11.0878 13.3015 10.7946 13.4168 10.4902 13.4168H5.50923C5.20477 13.4168 4.91163 13.3015 4.68883 13.094C4.46604 12.8865 4.33015 12.6023 4.30853 12.2986L3.78673 4.9909M12.2127 4.9909H9.80525M12.2127 4.9909H12.8145M3.78673 4.9909H6.19413M3.78673 4.9909H3.18488M6.19413 4.9909H9.80525M6.19413 4.9909V3.18535C6.19413 3.02573 6.25754 2.87264 6.37041 2.75977C6.48328 2.64691 6.63637 2.5835 6.79599 2.5835H9.20339C9.36302 2.5835 9.5161 2.64691 9.62897 2.75977C9.74184 2.87264 9.80525 3.02573 9.80525 3.18535V4.9909M6.79604 7.35518V10.9663M9.20345 7.35518V10.9663"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

TrashIcon.displayName = "TrashIcon";
