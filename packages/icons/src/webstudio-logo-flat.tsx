import { forwardRef } from "react";
import type { IconProps } from "./types";

export const WebstudioLogoFlatIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "#fff", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 14 12"
        width={size}
        height={size}
        fill={color}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill={color}
          fillRule="evenodd"
          d="m11.32 10.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746L9.028 9.67a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fill={color}
          fillRule="evenodd"
          d="M7 5.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.206 1.206 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C9.744 4.364 8.594 3.208 7 3.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.8-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.206 1.206 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill={color}
          fillRule="evenodd"
          d="M4.973 9.669 2.352 1.585a1.205 1.205 0 1 0-2.293.746l2.622 8.084a1.205 1.205 0 1 0 2.292-.746Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);

WebstudioLogoFlatIcon.displayName = "WebstudioLogoFlatIcon";
