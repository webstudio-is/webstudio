import * as React from "react";
import { IconProps } from "./types";

export const OrderLastIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M13.8998 13.5C14.4521 13.5 14.8998 13.0523 14.8998 12.5L14.8998 3.5C14.8998 2.94772 14.4521 2.5 13.8998 2.5H12.0998C11.5475 2.5 11.0998 2.94771 11.0998 3.5L11.0998 12.5C11.0998 13.0523 11.5475 13.5 12.0998 13.5H13.8998Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.89978 12C6.57826 12 6.29219 11.8483 6.10925 11.6125C5.97795 11.4433 5.89978 11.2308 5.89978 11L5.89978 5C5.89978 4.76923 5.97795 4.55672 6.10925 4.3875C6.29219 4.15173 6.57826 4 6.89978 4H8.89978C9.45207 4 9.89978 4.44772 9.89978 5V11C9.89978 11.5523 9.45206 12 8.89978 12H6.89978ZM8.79978 5.1V10.9H6.99978L6.99978 5.1L8.79978 5.1Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.89051 4.3875C5.02181 4.55672 5.09998 4.76923 5.09998 5L5.09998 11C5.09998 11.2308 5.02181 11.4433 4.89051 11.6125C4.70757 11.8483 4.42149 12 4.09998 12H2.09998C1.54769 12 1.09998 11.5523 1.09998 11V5C1.09998 4.44771 1.54769 4 2.09998 4H4.09998C4.42149 4 4.70757 4.15173 4.89051 4.3875ZM3.99998 5.1L3.99998 10.9H2.19998L2.19998 5.1L3.99998 5.1Z"
          fill={color}
        />
      </svg>
    );
  }
);
OrderLastIcon.displayName = "OrderLastIcon";
