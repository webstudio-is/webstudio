import * as React from "react";
import { IconProps } from "./types";

export const JustifyContentStart = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M10.9999 7.19999H8.79995V4.79999H7.19995V19.2H8.79995V16.8H10.9999V7.19999Z"
          fill="#11181C"
        />
        <path d="M16.8 7.19999H13.6V16.8H16.8V7.19999Z" fill="#11181C" />
      </svg>
    );
  }
);

export const JustifyContentCenter = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12.7999 4.79999V19.2H11.1999V4.79999H12.7999ZM16.5999 15.8H14.3999V8.19999H16.5999V15.8ZM7.3999 15.8H9.5999V8.19999H7.3999V15.8Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const JustifyContentEnd = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12 16.8H15.2V19.2H16.8V4.79999H15.2V7.19999H12V16.8Z"
          fill="#11181C"
        />
        <path d="M7.19995 16.8H10.4V7.19999H7.19995V16.8Z" fill="#11181C" />
      </svg>
    );
  }
);

export const JustifyContentSpaceBetween = React.forwardRef<
  SVGSVGElement,
  IconProps
>(({ color = "currentColor", ...props }, forwardedRef) => {
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
        d="M11.1999 7.19999H7.9999V4.79999H6.3999V19.2H7.9999V16.8H11.1999V7.19999ZM12.7999 16.8H15.9999V19.2H17.5999V4.79999H15.9999V7.19999H12.7999V16.8Z"
        fill="#11181C"
      />
    </svg>
  );
});

export const JustifyContentSpaceAround = React.forwardRef<
  SVGSVGElement,
  IconProps
>(({ color = "currentColor", ...props }, forwardedRef) => {
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
      <path d="M7.9999 19.2V4.79999H6.3999V19.2H7.9999Z" fill="#11181C" />
      <path d="M17.5999 19.2V4.79999H15.9999V19.2H17.5999Z" fill="#11181C" />
      <path d="M15.1999 16.8H12.7999V7.19999H15.1999V16.8Z" fill="#11181C" />
      <path d="M8.7999 16.8H11.1999V7.19999H8.7999V16.8Z" fill="#11181C" />
    </svg>
  );
});

export const justifyContent = {
  normal: JustifyContentStart,
  start: JustifyContentStart,
  end: JustifyContentEnd,
  center: JustifyContentCenter,
  spaceBetween: JustifyContentSpaceBetween,
  spaceAround: JustifyContentSpaceAround,
};
