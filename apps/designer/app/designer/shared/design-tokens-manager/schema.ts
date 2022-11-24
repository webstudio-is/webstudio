import { z } from "zod";
import { groups } from "./groups";

// Example data
// {
//   "Sizing": {
//     "Token 1 name": {
//       "$type": "sizing",
//       "$value": "Token 1 value",
//       "$description": "Token 1 description"
//     },
//     "Toke, 2 name": {
//       "$type": "sizing",
//       "$value": "Token 2 value",
//       "$description": "Token 2 description"
//     },
//   },
// }

type Type = typeof groups[number]["type"];

const types: Array<Type> = groups.map((group) => group.type);

export const TokenName = z.string();
export type TokenName = z.infer<typeof TokenName>;

export const GroupName = z.string();
export type GroupName = z.infer<typeof GroupName>;

export const DesignToken = z.object({
  // @todo help
  $type: z.enum(types as any),
  $value: z.string(),
  $description: z.string(),
});
export type DesignToken = z.infer<typeof DesignToken>;

export const DesignTokens = z.record(TokenName, DesignToken);

export type DesignTokens = z.infer<typeof DesignTokens>;

export const DesignTokensGroup = z.record(GroupName, DesignTokens);

export type DesignTokensGroup = z.infer<typeof DesignTokensGroup>;
