import * as React from "react";
import { IconProps } from "./types";

export const AlignContentStart = React.forwardRef<SVGSVGElement, IconProps>(
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
        <path d="M4 6H20V7H4V6Z" fill="#11181C" />
        <path d="M8 9H11V12H8V9Z" fill="#11181C" />
        <path d="M16 9H13V12H16V9Z" fill="#11181C" />
        <path d="M13 14H16V17H13V14Z" fill="#11181C" />
        <path d="M11 14H8V17H11V14Z" fill="#11181C" />
      </svg>
    );
  }
);

export const AlignContentCenter = React.forwardRef<SVGSVGElement, IconProps>(
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
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8 6H11V9H8V6ZM4 11.5H20V12.5H4V11.5ZM16 6H13V9H16V6ZM13 15H16V18H13V15ZM11 15H8V18H11V15Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignContentEnd = React.forwardRef<SVGSVGElement, IconProps>(
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
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8 8H11V11H8V8ZM4 18H20V19H4V18ZM16 8H13V11H16V8ZM13 13H16V16H13V13ZM11 13H8V16H11V13Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignContentStretch = React.forwardRef<SVGSVGElement, IconProps>(
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
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M19 5H5V6H19V5ZM19 18H5V19H19V18ZM8 8H11V11H8V8ZM16 8H13V11H16V8ZM13 13H16V16H13V13ZM11 13H8V16H11V13Z"
          fill="#11181C"
        />
      </svg>
    );
  }
);

export const AlignContentSpaceAround = React.forwardRef<
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
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M19 5H5V6H19V5ZM19 18H5V19H19V18ZM8 8H11V11H8V8ZM16 8H13V11H16V8ZM13 13H16V16H13V13ZM11 13H8V16H11V13Z"
        fill="#11181C"
      />
    </svg>
  );
});

export const AlignContentSpaceBetween = React.forwardRef<
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
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M19 5H5V6H19V5ZM19 18H5V19H19V18ZM8 8H11V11H8V8ZM16 8H13V11H16V8ZM13 13H16V16H13V13ZM11 13H8V16H11V13Z"
        fill="#11181C"
      />
    </svg>
  );
});

export const alignContent = {
  normal: AlignContentStart,
  start: AlignContentStart,
  end: AlignContentEnd,
  center: AlignContentCenter,
  stretch: AlignContentStretch,
  spaceAround: AlignContentSpaceAround,
  spaceBetween: AlignContentSpaceBetween,
};
