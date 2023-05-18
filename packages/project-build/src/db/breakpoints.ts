import { nanoid } from "nanoid";
import {
  type Breakpoint,
  Breakpoints,
  BreakpointsList,
  initialBreakpoints,
} from "../schema/breakpoints";

export const parseBreakpoints = (
  breakpointsString: string,
  skipValidation = false
): Breakpoints => {
  const breakpointssList = skipValidation
    ? (JSON.parse(breakpointsString) as BreakpointsList)
    : BreakpointsList.parse(JSON.parse(breakpointsString));
  return new Map(breakpointssList.map((item) => [item.id, item]));
};

export const serializeBreakpoints = (breakpointssMap: Breakpoints) => {
  const breakpointssList: BreakpointsList = Array.from(
    breakpointssMap.values()
  );
  return JSON.stringify(breakpointssList);
};

export const createInitialBreakpoints = (): [
  Breakpoint["id"],
  Breakpoint
][] => {
  return initialBreakpoints.map((breakpoint) => {
    const id = nanoid();
    return [
      id,
      {
        ...breakpoint,
        id,
      },
    ];
  });
};
