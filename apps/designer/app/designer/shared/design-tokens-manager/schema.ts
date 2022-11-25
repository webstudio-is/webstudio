import { z } from "zod";
import { groups } from "./groups";

type UnionToIntersection<U> = (
  U extends never ? never : (arg: U) => never
) extends (arg: infer I) => void
  ? I
  : never;

type UnionToTuple<T> = UnionToIntersection<
  T extends never ? never : (t: T) => T
> extends (_: never) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];

type Type = typeof groups[number]["type"];
type Group = typeof groups[number]["group"];

// zod is super restrictive on enum type https://github.com/colinhacks/zod/issues/1118
// so we convert union to tuple here its seriously safer than any as it will break on things like
// ['a', 'b'] as UnionToTuple<Type> etc
const types = groups.map((group) => group.type) as UnionToTuple<Type>;
const groupNames = groups.map((group) => group.group) as UnionToTuple<Group>;

export const DesignToken = z.object({
  name: z.string(),
  // @todo if https://github.com/colinhacks/zod/issues/1118
  type: z.enum(types),
  value: z.string(),
  description: z.optional(z.string()),
  // @todo if https://github.com/colinhacks/zod/issues/1118
  group: z.enum(groupNames),
});

export type DesignToken = z.infer<typeof DesignToken>;
