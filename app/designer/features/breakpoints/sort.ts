/**
 * Sort by minWidth descending.
 * We want media querries with bigger minWidth to override the smaller once.
 */
export const sort = <BreakpointSubset extends { minWidth: number }>(
  breakpoints: Array<BreakpointSubset>
) => {
  return [...breakpoints].sort((breakpointA, breakpointB) => {
    return breakpointA.minWidth - breakpointB.minWidth;
  });
};
