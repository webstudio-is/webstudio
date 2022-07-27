import * as React from "react";
import { IconProps } from "./types";

export const DevicesIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          fill={color}
          d="M22.265 9.51L17.265 9.5C16.715 9.5 16.265 9.95 16.265 10.5V19.5C16.265 20.05 16.715 20.5 17.265 20.5H22.265C22.815 20.5 23.265 20.05 23.265 19.5V10.5C23.265 9.95 22.815 9.51 22.265 9.51ZM22.265 19.5H17.265V10.5H19.5H22.265V19.5ZM20.265 1.5H2.26499C1.15499 1.5 0.264988 2.39 0.264988 3.5V15.5C0.264988 16.6 1.15499 17.5 2.26499 17.5H10.5V19.5H7.26499V20.5H15.265V19.5H12.5V17.5H15.265V16.5H1.26499V2.5H21.265V8.5H22.265V3.5C22.265 2.39 21.365 1.5 20.265 1.5Z"
        />
      </svg>
    );
  }
);

DevicesIcon.displayName = "DevicesIcon";
