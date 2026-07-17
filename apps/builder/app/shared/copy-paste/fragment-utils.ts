import type { WebstudioFragment } from "@webstudio-is/sdk";
import { breakpointPasteLimitWarning } from "@webstudio-is/project-build/runtime";
import {
  insertWebstudioFragmentAt,
  type Insertable,
} from "../instance-utils/insert";
import { builderApi } from "../builder-api";
import { resolveFragmentTokenConflicts } from "../resolve-token-conflicts";

export const hasFragmentData = (fragment: WebstudioFragment) =>
  fragment.children.length > 0 || fragment.styleSources.length > 0;

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
