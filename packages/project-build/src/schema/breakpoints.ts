import { z } from "zod";

const BreakpointId = z.string();

export const Breakpoint = z.object({
  id: BreakpointId,
  label: z.string(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
});

export type Breakpoint = z.infer<typeof Breakpoint>;

export const BreakpointsList = z.array(Breakpoint);

export type BreakpointsList = z.infer<typeof BreakpointsList>;

export const Breakpoints = z.map(BreakpointId, Breakpoint);

export type Breakpoints = z.infer<typeof Breakpoints>;

type BaseBreakpoint = Pick<Breakpoint, "label" | "minWidth">;

export const initialBreakpoints: BaseBreakpoint[] = [
  { label: "Base", minWidth: 0 },
  { label: "Tablet", minWidth: 768 },
  { label: "Laptop", minWidth: 1024 },
  { label: "Desktop", minWidth: 1280 },
];
