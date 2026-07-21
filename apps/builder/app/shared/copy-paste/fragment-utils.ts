import type { WebstudioFragment } from "@webstudio-is/sdk";
import {
  breakpointPasteLimitWarning,
  type FragmentContentModelWarning,
} from "@webstudio-is/project-build/runtime";
import {
  insertWebstudioFragmentAt,
  type Insertable,
} from "../instance-utils/insert";
import { builderApi } from "../builder-api";
import { resolveFragmentTokenConflicts } from "../resolve-token-conflicts";

export const hasFragmentData = (fragment: WebstudioFragment) =>
  fragment.children.length > 0 || fragment.styleSources.length > 0;

export const reportFragmentContentModelWarnings = (
  warnings: FragmentContentModelWarning[]
) => {
  const [firstWarning] = warnings;
  if (firstWarning === undefined) {
    return;
  }
  const remainingCount = warnings.length - 1;
  const suffix =
    remainingCount === 0
      ? ""
      : ` (${remainingCount} more validation ${remainingCount === 1 ? "warning" : "warnings"})`;
  builderApi.toast.warn(
    `Pasted with warning: ${firstWarning.message}${suffix}`
  );
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
    allowContentModelWarnings: true,
    onContentModelWarnings: reportFragmentContentModelWarnings,
    onBreakpointLimitMerge: () => {
      builderApi.toast.warn(breakpointPasteLimitWarning);
    },
  });
};
