import { z } from "zod";

const BreakpointId = z.string();

export const Breakpoint = z
  .object({
    id: BreakpointId,
    label: z.string(),
    minWidth: z.number().optional(),
    maxWidth: z.number().optional(),
    condition: z.string().optional(),
  })
  .transform((data) => {
    // Normalize empty condition strings to undefined
    if (data.condition !== undefined && data.condition.trim() === "") {
      return { ...data, condition: undefined };
    }
    return data;
  })
  .refine(({ minWidth, maxWidth, condition }) => {
    // If condition is set, minWidth and maxWidth should not be set
    if (condition !== undefined) {
      return minWidth === undefined && maxWidth === undefined;
    }
    return (
      // Either min or max width have to be defined
      (minWidth !== undefined && maxWidth === undefined) ||
      (minWidth === undefined && maxWidth !== undefined) ||
      // This is a base breakpoint
      (minWidth === undefined && maxWidth === undefined)
    );
  }, "Either minWidth, maxWidth, or condition should be defined, but not both");

export type Breakpoint = z.infer<typeof Breakpoint>;

export const Breakpoints = z.map(BreakpointId, Breakpoint);

export type Breakpoints = z.infer<typeof Breakpoints>;

export const initialBreakpoints: Array<Breakpoint> = [
  { id: "placeholder", label: "Base" },
  { id: "placeholder", label: "Tablet", maxWidth: 991 },
  { id: "placeholder", label: "Mobile landscape", maxWidth: 767 },
  { id: "placeholder", label: "Mobile portrait", maxWidth: 479 },
];
