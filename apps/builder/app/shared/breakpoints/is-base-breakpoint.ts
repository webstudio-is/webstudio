export const isBaseBreakpoint = (breakpoint: {
  minWidth?: number;
  maxWidth?: number;
}) => breakpoint.minWidth === undefined && breakpoint.maxWidth === undefined;
