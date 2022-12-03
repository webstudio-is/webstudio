import { z } from "zod";
import { groups } from "./groups";

const mapToProp = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ReadonlyArray<any>,
  Prop extends keyof T[number]
>(
  arr: readonly [...T],
  prop: Prop
): {
  [K in keyof T]: T[K][Prop];
} => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((item) => item[prop]) as any;
};

// zod expects readonly tuples for its enums
const types = mapToProp(groups, "type");
const groupNames = mapToProp(groups, "group");

export const DesignToken = z.object({
  name: z.string(),
  type: z.enum(types),
  value: z.string(),
  description: z.optional(z.string()),
  group: z.enum(groupNames),
});

export type DesignToken = z.infer<typeof DesignToken>;
