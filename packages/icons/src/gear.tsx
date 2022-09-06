import { cssVars } from "@webstudio-is/css-vars";
import * as React from "react";
import { IconProps } from "./types";

const fillVar = cssVars.define("fill");

export const gearIconCssVars = ({ fill }: { fill: string }) => ({
  [fillVar]: fill,
});

export const GearIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M9.117 2.878c-.284-1.17-1.95-1.17-2.234 0a1.149 1.149 0 01-1.714.71c-1.03-.627-2.207.551-1.58 1.58a1.15 1.15 0 01-.711 1.715c-1.17.284-1.17 1.95 0 2.234a1.15 1.15 0 01.71 1.714c-.627 1.03.551 2.207 1.58 1.58a1.148 1.148 0 011.715.711c.284 1.17 1.95 1.17 2.234 0a1.15 1.15 0 011.714-.71c1.03.627 2.207-.551 1.58-1.58a1.148 1.148 0 01.711-1.715c1.17-.284 1.17-1.95 0-2.234a1.15 1.15 0 01-.71-1.714c.627-1.03-.551-2.207-1.58-1.58a1.15 1.15 0 01-1.715-.711z"
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ fill: cssVars.use(fillVar, "none") }}
        />
        <circle
          cx={8}
          cy={7.99988}
          r={1.875}
          stroke={color}
          strokeWidth={1.25}
        />
      </svg>
    );
  }
);

GearIcon.displayName = "GearIcon";
