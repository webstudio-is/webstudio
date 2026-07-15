import { nativeClient } from "../trpc/trpc-client";
import { $project } from "../sync/data-stores";
import { isLikelyWebstudioJsxFragment } from "@webstudio-is/project-build/transfer";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import { insertFragmentWithBreakpointWarning } from "./fragment-utils";

export const isLikelyWebstudioJsx = isLikelyWebstudioJsxFragment;

const handlePasteJsx = async (source: string) => {
  if (isLikelyWebstudioJsx(source) === false) {
    return pasteIgnored;
  }
  const project = $project.get();
  if (project === undefined) {
    return pasteIgnored;
  }
  try {
    const fragment = await nativeClient.build.createJsxFragment.query({
      projectId: project.id,
      source,
    });
    insertFragmentWithBreakpointWarning(fragment);
    return pasteHandled;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not paste Webstudio JSX fragment.",
    } as const;
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
