import { z } from "zod";
import { designTokensGroups } from "./groups";

// @todo this doesn't belong here https://github.com/webstudio-is/webstudio-designer/issues/544
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

type Type = typeof designTokensGroups[number]["type"];
type Group = typeof designTokensGroups[number]["group"];

// zod is super restrictive on enum type https://github.com/colinhacks/zod/issues/1118
// so we convert union to tuple here its seriously safer than any as it will break on things like
// ['a', 'b'] as UnionToTuple<Type> etc
const types = designTokensGroups.map(
  (group) => group.type
) as UnionToTuple<Type>;
const groupNames = designTokensGroups.map(
  (group) => group.group
) as UnionToTuple<Group>;

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
