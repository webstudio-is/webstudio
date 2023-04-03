// Generated from icons/plus.svg

import { forwardRef } from "react";
import type { IconProps } from "../types";

// prettier-ignore
export const PlusIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", size = 16, ...props }, forwardedRef) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill={color} {...props} ref={forwardedRef}><path fillRule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V2.75a.75.75 0 0 1 1.5 0v10.5A.75.75 0 0 1 8 14Z" clipRule="evenodd" /><path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1 0-1.5h10.5A.75.75 0 0 1 14 8Z" clipRule="evenodd" /></svg>
    );
  }
);

PlusIcon.displayName = "PlusIcon";
