import type { Prop } from "./schema/props";

/** Collect every Resource reference, including legacy single-action props. */
export const getPropResourceIds = (prop: Prop): string[] => {
  if (prop.type !== "resource") {
    return [];
  }
  return typeof prop.value === "string" ? [prop.value] : prop.value.resourceIds;
};
