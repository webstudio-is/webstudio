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

export const initialBreakpoints: Array<Breakpoint> = [
  { id: "placeholder", label: "Base" },
  { id: "placeholder", label: "Tablet", maxWidth: 991 },
  { id: "placeholder", label: "Mobile landscape", maxWidth: 767 },
  { id: "placeholder", label: "Mobile portrait", maxWidth: 479 },
];
