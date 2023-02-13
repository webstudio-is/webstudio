import * as React from "react";
import type { IconProps } from "./types";

export const AspectRatioIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M10.85 10.503a.625.625 0 100-1.25v1.25zM4.975 3.378a.625.625 0 10-1.25 0h1.25zm-.072 6.394l.275-.561-.275.561zm-.443-.426l.552-.292-.552.292zm6.39-.093H5.972v1.25h4.878v-1.25zM4.975 8.32V3.38h-1.25v4.94h1.25zm.997.934c-.294 0-.478 0-.617-.01a.524.524 0 01-.177-.032l-.55 1.123c.21.102.423.138.63.154.198.016.44.015.714.015v-1.25zM3.725 8.32c0 .262 0 .498.016.693.017.203.056.418.167.627l1.104-.585c0-.001-.004-.008-.009-.028a.803.803 0 01-.017-.12 7.858 7.858 0 01-.011-.587h-1.25zm1.453.892a.37.37 0 01-.166-.157l-1.104.585c.16.303.414.545.72.695l.55-1.123z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.349 6.067c.345 0 .625-.28.625-.625V3.466l1.428 1.429a.625.625 0 10.884-.884L4.791 1.515a.625.625 0 00-.884 0L1.412 4.011a.625.625 0 10.884.884l1.428-1.429v1.976c0 .345.28.625.625.625zM7.769 9.878c0 .345.28.625.625.625h1.975l-1.428 1.429a.625.625 0 10.884.883l2.495-2.495a.625.625 0 000-.883L9.825 6.94a.625.625 0 10-.884.884l1.428 1.428H8.394a.625.625 0 00-.625.625z"
          fill={color}
        />
      </svg>
    );
  }
);

AspectRatioIcon.displayName = "AspectRatioIcon";
