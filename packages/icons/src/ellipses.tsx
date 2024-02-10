import * as React from "react";
import type { IconProps } from "./types";

type EllipsesIconProps = IconProps & {
  colors?: Array<string>;
};

export const EllipsesIcon = React.forwardRef<SVGSVGElement, EllipsesIconProps>(
  ({ color = "currentColor", colors = [], ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        {...props}
        ref={forwardedRef}
      >
        <circle cx="2.3" cy="8" r="1.8" fill={colors[0] ?? color} />
        <circle cx="8" cy="8" r="1.8" fill={colors[1] ?? color} />
        <circle cx="14" cy="8" r="1.8" fill={colors[2] ?? color} />
      </svg>
    );
  }
);
EllipsesIcon.displayName = "EllipsesIcon";
