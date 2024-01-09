// DEPRECATED: use parseData and serializeData from build.ts
import { nanoid } from "nanoid";
import {
  type Breakpoint,
  type Breakpoints,
  initialBreakpoints,
} from "@webstudio-is/sdk";

export const parseBreakpoints = (breakpointsString: string): Breakpoints => {
  const breakpointssList = JSON.parse(breakpointsString) as Breakpoint[];
  return new Map(breakpointssList.map((item) => [item.id, item]));
};

export const serializeBreakpoints = (breakpointssMap: Breakpoints) => {
  const breakpointssList: Breakpoint[] = Array.from(breakpointssMap.values());
  return JSON.stringify(breakpointssList);
};

export const createInitialBreakpoints = (): [
  Breakpoint["id"],
  Breakpoint,
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
