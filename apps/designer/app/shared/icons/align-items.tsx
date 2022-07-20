import * as React from "react";
import { IconProps } from "./types";

export const AlignItemsStart = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M0 2C0 0.89543 0.895431 0 2 0H22C23.1046 0 24 0.895431 24 2V22C24 23.1046 23.1046 24 22 24H2C0.89543 24 0 23.1046 0 22V2Z"
          fill="white"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.8 7.99999H11.2V14.4H8.00005V7.99999H4.80005V6.39999H19.2V7.99999H16V17.6H12.8V7.99999Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignItemsEnd = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M0 2C0 0.89543 0.895431 0 2 0H22C23.1046 0 24 0.895431 24 2V22C24 23.1046 23.1046 24 22 24H2C0.89543 24 0 23.1046 0 22V2Z"
          fill="white"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 16H19.2V17.6H4.80005V16H8.00005V9.59999H11.2V16H12.8V6.39999H16V16Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignItemsCenter = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M0 2C0 0.89543 0.895431 0 2 0H22C23.1046 0 24 0.895431 24 2V22C24 23.1046 23.1046 24 22 24H2C0.89543 24 0 23.1046 0 22V2Z"
          fill="white"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.4 11H12.8V5L15 5V11H20V12.6H15V19H12.8V12.6H10.4V17H8.2V12.6H4V11H8.2V7H10.4V11Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignItemsBaseline = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M0 2C0 0.89543 0.895431 0 2 0H22C23.1046 0 24 0.895431 24 2V22C24 23.1046 23.1046 24 22 24H2C0.89543 24 0 23.1046 0 22V2Z"
          fill="white"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 6H8V15H10V6ZM7 5V16H11V5H7Z"
          fill="#11181C"
        />
        <path d="M7 12H11V18H7V12Z" fill="#11181C" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 13H8V17H10V13ZM7 12V18H11V12H7Z"
          fill="#11181C"
        />
        <path d="M13 12H16V15H13V12Z" fill="#11181C" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15 13H14V14H15V13ZM13 12V15H16V12H13Z"
          fill="#11181C"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 8H14V15H16V8ZM13 7V16H17V7H13Z"
          fill="#11181C"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20 13H4V11.5H20V13Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignItemsStretch = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M0 2C0 0.89543 0.895431 0 2 0H22C23.1046 0 24 0.895431 24 2V22C24 23.1046 23.1046 24 22 24H2C0.89543 24 0 23.1046 0 22V2Z"
          fill="white"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 16H19.2V17.6H4.80005V16H8.00005V7.99999H4.80005V6.39999H19.2V7.99999H16V16ZM12.8 16V7.99999H11.2V16H12.8Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignItemsNormal = AlignItemsStart;

export const alignItems = {
  normal: AlignItemsStart,
  start: AlignItemsStart,
  end: AlignItemsEnd,
  "flex-start": AlignItemsStart,
  "flex-end": AlignItemsEnd,
  center: AlignItemsCenter,
  baseline: AlignItemsBaseline,
  stretch: AlignItemsStretch,
};
