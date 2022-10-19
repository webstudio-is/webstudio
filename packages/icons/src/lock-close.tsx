import * as React from "react";
import { IconProps } from "./types";

export const LockCloseIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="8"
        height="10"
        viewBox="0 0 8 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <g clipPath="url(#clip0_561_9202)">
          <rect width="8" height="9" transform="translate(0 0.5)" fill="none" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1.14286 4.4375V3.3125C1.14286 2.56658 1.44388 1.85121 1.97969 1.32376C2.51551 0.796316 3.24224 0.5 4 0.5C4.75776 0.5 5.48449 0.796316 6.02031 1.32376C6.55612 1.85121 6.85714 2.56658 6.85714 3.3125V4.4375C7.16025 4.4375 7.45094 4.55603 7.66527 4.767C7.87959 4.97798 8 5.26413 8 5.5625V8.375C8 8.67337 7.87959 8.95952 7.66527 9.1705C7.45094 9.38147 7.16025 9.5 6.85714 9.5H1.14286C0.839753 9.5 0.549062 9.38147 0.334735 9.1705C0.120408 8.95952 0 8.67337 0 8.375V5.5625C0 5.26413 0.120408 4.97798 0.334735 4.767C0.549062 4.55603 0.839753 4.4375 1.14286 4.4375ZM5.71429 3.3125V4.4375H2.28571V3.3125C2.28571 2.86495 2.46633 2.43572 2.78782 2.11926C3.10931 1.80279 3.54534 1.625 4 1.625C4.45466 1.625 4.89069 1.80279 5.21218 2.11926C5.53367 2.43572 5.71429 2.86495 5.71429 3.3125Z"
            fill={color}
          />
        </g>
        <defs>
          <clipPath id="clip0_561_9202">
            <rect
              width="8"
              height="9"
              fill="none"
              transform="translate(0 0.5)"
            />
          </clipPath>
        </defs>
      </svg>
    );
  }
);
LockCloseIcon.displayName = "LockCloseIcon";
