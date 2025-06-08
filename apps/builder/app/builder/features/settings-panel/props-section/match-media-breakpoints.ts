/**
 * Given an array of [breakpointId, value] tuples and an ordered list of breakpoint IDs,
 * returns the value associated with the last matching breakpoint found.
 * If none of the breakpoint IDs are present, returns undefined.
 * */
export const matchMediaBreakpoints =
  (matchingBreakpointIds: string[]) =>
  <T extends [breakpointId: string, value: unknown]>(
    values: T[] | undefined
  ): T[1] | undefined => {
    let lastValue: T[1] | undefined = undefined;

    if (values === undefined) {
      return lastValue;
    }

    const valuesMap = new Map<string, T[1]>(values);

    for (const matchingBreakpointId of matchingBreakpointIds) {
      lastValue = valuesMap.get(matchingBreakpointId) ?? lastValue;
    }

    return lastValue;
  };
