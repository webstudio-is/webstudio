import type { WebstudioFragment } from "@webstudio-is/sdk";
import {
  breakpointPasteLimitWarning,
  detectFragmentTokenConflicts,
  type ConflictResolution,
} from "@webstudio-is/project-build/runtime";
import {
  insertWebstudioFragmentAt,
  type Insertable,
} from "../instance-utils/insert";
import { getWebstudioData } from "../instance-utils/data";
import { builderApi } from "../builder-api";
import { resolveTokenConflicts } from "../resolve-token-conflicts";

export const hasFragmentData = (fragment: WebstudioFragment) =>
  fragment.children.length > 0 || fragment.styleSources.length > 0;

export const resolveFragmentTokenConflicts = async (
  fragment: WebstudioFragment
): Promise<ConflictResolution | "cancel"> => {
  if (
    fragment.styleSources.some((source) => source.type === "token") === false
  ) {
    return "theirs";
  }
  const conflicts = detectFragmentTokenConflicts({
    fragment,
    targetData: getWebstudioData(),
  });
  return await resolveTokenConflicts(conflicts);
};

export const insertFragmentWithBreakpointWarning = async (
  fragment: WebstudioFragment,
  insertable?: Insertable
) => {
  const conflictResolution = await resolveFragmentTokenConflicts(fragment);
  if (conflictResolution === "cancel") {
    return false;
  }
  return insertWebstudioFragmentAt(fragment, insertable, conflictResolution, {
    onBreakpointLimitMerge: () => {
      builderApi.toast.warn(breakpointPasteLimitWarning);
    },
  });
};
