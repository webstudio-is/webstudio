import * as React from "react";
import { IconProps } from "./types";

export const RowGap = React.forwardRef<SVGSVGElement, IconProps>(
  (props, forwardedRef) => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      ></svg>
    );
  }
);
RowGap.displayName = "RowGap";

export const ColumnGap = React.forwardRef<SVGSVGElement, IconProps>(
  (props, forwardedRef) => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      ></svg>
    );
  }
);
ColumnGap.displayName = "ColumnGap";

export const gap = {
  "row-gap": RowGap,
  "column-gap": ColumnGap,
};
