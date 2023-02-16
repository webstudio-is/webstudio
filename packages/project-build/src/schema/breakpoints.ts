import { z } from "zod";

const BreakpointId = z.string();

export const Breakpoint = z.object({
  id: BreakpointId,
  label: z.string(),
  minWidth: z.number(),
});

export type Breakpoint = z.infer<typeof Breakpoint>;

export const BreakpointsList = z.array(Breakpoint);

export type BreakpointsList = z.infer<typeof BreakpointsList>;

export const Breakpoints = z.map(BreakpointId, Breakpoint);

export type Breakpoints = z.infer<typeof Breakpoints>;
