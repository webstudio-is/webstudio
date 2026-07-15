import type { WebstudioFragment } from "@webstudio-is/sdk";
import { breakpointPasteLimitWarning } from "@webstudio-is/project-build/runtime";
import {
  insertWebstudioFragmentAt,
  type Insertable,
} from "../instance-utils/insert";
import { builderApi } from "../builder-api";

export const hasFragmentData = (fragment: WebstudioFragment) =>
  fragment.children.length > 0 || fragment.styleSources.length > 0;

export const insertFragmentWithBreakpointWarning = (
  fragment: WebstudioFragment,
  insertable?: Insertable
) =>
  insertWebstudioFragmentAt(fragment, insertable, undefined, {
    onBreakpointLimitMerge: () => {
      builderApi.toast.warn(breakpointPasteLimitWarning);
    },
  });
