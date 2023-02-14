import type { Breakpoint } from "@webstudio-is/project-build";

export type BaseBreakpoint = Pick<Breakpoint, "label" | "minWidth">;

export const initialBreakpoints: Array<BaseBreakpoint> = [
  { label: "Mobile", minWidth: 0 },
  { label: "Tablet", minWidth: 768 },
  { label: "Laptop", minWidth: 1024 },
  { label: "Desktop", minWidth: 1280 },
];
