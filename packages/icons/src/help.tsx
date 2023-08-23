import { forwardRef } from "react";
import type { IconProps } from "./types";

export const HelpIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "#707375", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 22 22"
        width={size}
        height={size}
        fill={color}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill={color}
          d="M11 20c-4.96 0-9-4.04-9-9s4.04-9 9-9 9 4.04 9 9-4.04 9-9 9Zm0-16.5c-4.14 0-7.5 3.36-7.5 7.5 0 4.14 3.36 7.5 7.5 7.5 4.14 0 7.5-3.36 7.5-7.5 0-4.14-3.36-7.5-7.5-7.5Z"
        />
        <path
          fill={color}
          d="M11.01 16.14c-.5 0-.91-.4-.91-.9s.4-.9.89-.9H11c.5 0 .9.4.9.9s-.4.9-.9.9h.01ZM10.93 12.46c-.31 0-.6-.2-.71-.51-.13-.39.08-.82.47-.95.51-.17 1.96-.87 1.96-1.76 0-.41-.14-.8-.41-1.12a1.743 1.743 0 0 0-2.2-.38c-.35.21-.62.53-.75.92-.14.39-.57.59-.96.46a.754.754 0 0 1-.46-.96c.25-.72.75-1.32 1.41-1.71.66-.39 1.43-.53 2.18-.4a3.23 3.23 0 0 1 2.68 3.18c0 2.16-2.87 3.14-2.99 3.19-.08.03-.16.04-.24.04h.02Z"
        />
      </svg>
    );
  }
);

HelpIcon.displayName = "HelpIcon";
