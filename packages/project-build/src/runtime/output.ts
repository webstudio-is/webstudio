import { z } from "zod";

export const outputDetailInputSchema = z.object({
  verbose: z
    .boolean()
    .optional()
    .describe(
      "Expand the same result with complete records and diagnostics. Omit for compact output."
    ),
});
const outputLimitSchema = z.number().int().min(1).max(200);
export const paginatedOutputInputSchema = z.object({
  cursor: z.string().optional(),
  limit: outputLimitSchema.optional(),
  ...outputDetailInputSchema.shape,
});

export const paginatedOutputMetadataSchema = z.object({
  detail: z.enum(["compact", "verbose"]),
  total: z.number().int().nonnegative(),
  returnedCount: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
  filters: z.looseObject({}),
});

export type OutputDetailInput = z.input<typeof outputDetailInputSchema>;
export type PaginatedOutputInput = z.input<typeof paginatedOutputInputSchema>;

export const projectOutput = <Compact extends object, Expanded extends object>({
  input,
  compact,
  expanded,
}: {
  input: OutputDetailInput;
  compact: Compact;
  expanded: () => Expanded;
}): Compact | (Compact & Expanded) =>
  input.verbose === true ? { ...compact, ...expanded() } : compact;

const parseCursor = (
  cursor: string | undefined,
  invalidCursorMessage: string
) => {
  if (cursor === undefined) {
    return 0;
  }
  const offset = Number(cursor);
  if (Number.isInteger(offset) === false || offset < 0) {
    throw new Error(invalidCursorMessage);
  }
  return offset;
};

export const paginateOutput = <Item, Filters extends object>({
  items,
  cursor,
  limit = 20,
  filters,
  verbose,
  invalidCursorMessage = "Invalid pagination cursor",
}: {
  items: readonly Item[];
  cursor?: string;
  limit?: number;
  filters: Filters;
  verbose?: boolean;
  invalidCursorMessage?: string;
}) => {
  const offset = parseCursor(cursor, invalidCursorMessage);
  const parsedLimit = outputLimitSchema.parse(limit);
  const page = items.slice(offset, offset + parsedLimit);
  const nextOffset = offset + page.length;
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined)
  ) as Partial<Filters>;
  return {
    detail: verbose === true ? ("verbose" as const) : ("compact" as const),
    items: page,
    total: items.length,
    returnedCount: page.length,
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
    filters: activeFilters,
  };
};
