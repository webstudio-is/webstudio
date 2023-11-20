import { z } from "zod";

const BreakpointId = z.string();

export const Breakpoint = z
  .object({
    id: BreakpointId,
    label: z.string(),
    minWidth: z.number().optional(),
    maxWidth: z.number().optional(),
  })
  .refine(({ minWidth, maxWidth }) => {
    return (
      // Either min or max width have to be defined
      (minWidth !== undefined && maxWidth === undefined) ||
      (minWidth === undefined && maxWidth !== undefined) ||
      // This is a base breakpoint
      (minWidth === undefined && maxWidth === undefined)
    );
  }, "Either minWidth or maxWidth should be defined");

export type Breakpoint = z.infer<typeof Breakpoint>;

export const Breakpoints = z.map(BreakpointId, Breakpoint);

export type Breakpoints = z.infer<typeof Breakpoints>;

export const initialBreakpoints: Array<Breakpoint> = [
  { id: "placeholder", label: "Base" },
  { id: "placeholder", label: "Tablet", maxWidth: 991 },
  { id: "placeholder", label: "Mobile landscape", maxWidth: 767 },
  { id: "placeholder", label: "Mobile portrait", maxWidth: 479 },
];
