import * as React from "react";
import type { IconProps } from "./types";

export const NewPageIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M9.19995 2.16172V4.64004C9.19995 4.97607 9.19995 5.14409 9.26535 5.27244C9.32287 5.38533 9.41466 5.47712 9.52756 5.53465C9.6559 5.60004 9.82392 5.60004 10.16 5.60004H12.6383M7.99995 11.6V8M6.19995 9.8H9.79995M9.19995 2H6.07995C5.07186 2 4.56781 2 4.18277 2.19619C3.84408 2.36876 3.56871 2.64413 3.39614 2.98282C3.19995 3.36786 3.19995 3.87191 3.19995 4.88V11.12C3.19995 12.1281 3.19995 12.6321 3.39614 13.0172C3.56871 13.3559 3.84408 13.6312 4.18277 13.8038C4.56781 14 5.07186 14 6.07995 14H9.91995C10.928 14 11.4321 14 11.8171 13.8038C12.1558 13.6312 12.4312 13.3559 12.6038 13.0172C12.8 12.6321 12.8 12.1281 12.8 11.12V5.6L9.19995 2Z"
          stroke={color}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

NewPageIcon.displayName = "NewPageIcon";
