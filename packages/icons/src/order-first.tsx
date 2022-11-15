import * as React from "react";
import { IconProps } from "./types";

export const OrderFirstIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M2.10022 2.5C1.54794 2.5 1.10022 2.94771 1.10022 3.5L1.10022 12.5C1.10022 13.0523 1.54793 13.5 2.10022 13.5H3.90022C4.4525 13.5 4.90022 13.0523 4.90022 12.5L4.90022 3.5C4.90022 2.94772 4.45251 2.5 3.90022 2.5L2.10022 2.5Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.9 4C11.3477 4 10.9 4.44771 10.9 5L10.9 11C10.9 11.5523 11.3477 12 11.9 12H13.9C14.4523 12 14.9 11.5523 14.9 11L14.9 5C14.9 4.44772 14.4523 4 13.9 4L11.9 4ZM12 5.1L12 10.9H13.8L13.8 5.1H12Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.10022 4C6.54794 4 6.10022 4.44771 6.10022 5L6.10022 11C6.10022 11.5523 6.54794 12 7.10022 12H9.10022C9.65251 12 10.1002 11.5523 10.1002 11L10.1002 5C10.1002 4.44771 9.65251 4 9.10022 4L7.10022 4ZM7.20022 5.1L7.20022 10.9H9.00022L9.00022 5.1L7.20022 5.1Z"
          fill={color}
        />
      </svg>
    );
  }
);
OrderFirstIcon.displayName = "OrderFirstIcon";
