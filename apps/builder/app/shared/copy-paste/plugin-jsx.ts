import { nativeClient } from "../trpc/trpc-client";
import { insertWebstudioFragmentAt } from "../instance-utils/insert";
import { builderApi } from "../builder-api";
import { $project } from "../sync/data-stores";
import { breakpointPasteLimitWarning } from "@webstudio-is/project-build/runtime/breakpoints";
import { isLikelyWebstudioJsxFragment } from "@webstudio-is/project-build/runtime/jsx/utils";
import type { Plugin } from "./copy-paste";

export const isLikelyWebstudioJsx = isLikelyWebstudioJsxFragment;

const handlePasteJsx = async (source: string) => {
  if (isLikelyWebstudioJsx(source) === false) {
    return false;
  }
  const project = $project.get();
  if (project === undefined) {
    return false;
  }
  try {
    const fragment = await nativeClient.build.createJsxFragment.query({
      projectId: project.id,
      source,
    });
    return await insertWebstudioFragmentAt(fragment, undefined, undefined, {
      onBreakpointLimitMerge: () => {
        builderApi.toast.warn(breakpointPasteLimitWarning);
      },
    });
  } catch (error) {
    builderApi.toast.error(
      error instanceof Error
        ? error.message
        : "Could not paste Webstudio JSX fragment."
    );
    return true;
  }
};

export const jsx: Plugin = {
  name: "jsx",
  mimeType: "text/plain",
  onPaste: handlePasteJsx,
};

export const __testing__ = {
  handlePasteJsx,
};
