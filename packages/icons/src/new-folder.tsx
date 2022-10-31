import * as React from "react";
import { IconProps } from "./types";

export const NewFolderIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M8.6 5L7.93068 3.66135C7.73804 3.27608 7.64172 3.08344 7.49802 2.9427C7.37095 2.81824 7.21779 2.72358 7.04965 2.66558C6.8595 2.6 6.64412 2.6 6.21337 2.6H3.92C3.24794 2.6 2.91191 2.6 2.65521 2.73079C2.42942 2.84584 2.24584 3.02942 2.13079 3.25521C2 3.5119 2 3.84794 2 4.52V5M2 5H11.12C12.1281 5 12.6321 5 13.0172 5.19619C13.3559 5.36876 13.6312 5.64412 13.8038 5.98282C14 6.36786 14 6.8719 14 7.88V10.52C14 11.5281 14 12.0321 13.8038 12.4172C13.6312 12.7559 13.3559 13.0312 13.0172 13.2038C12.6321 13.4 12.1281 13.4 11.12 13.4H4.88C3.87191 13.4 3.36786 13.4 2.98282 13.2038C2.64413 13.0312 2.36876 12.7559 2.19619 12.4172C2 12.0321 2 11.5281 2 10.52V5ZM8 11V7.4M6.2 9.2H9.8"
          stroke={color}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

NewFolderIcon.displayName = "NewFolderIcon";
