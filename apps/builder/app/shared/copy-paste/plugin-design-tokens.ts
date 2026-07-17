import { detectDesignTokenSource } from "@webstudio-is/project-build/runtime";
import { executeRuntimeMutation } from "../instance-utils/data";
import { builderApi } from "../builder-api";
import {
  pasteHandled,
  pasteIgnored,
  type PasteResult,
  type Plugin,
} from "./copy-paste";

const parseJson = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return;
  }
};

const handlePasteDesignTokens = (value: string): PasteResult => {
  const source = detectDesignTokenSource(parseJson(value));
  if (source === undefined) {
    return pasteIgnored;
  }
  try {
    const mutation = executeRuntimeMutation({
      id: "designTokens.import",
      input: { source, collision: "skip" },
    });
    if (mutation === undefined) {
      return {
        success: false,
        error: "Design tokens cannot be pasted in the current context.",
      };
    }
    const { create, overwrite, skip } = mutation.result.counts;
    const imported = create + overwrite;
    builderApi.toast.success(
      `Imported ${imported} design ${imported === 1 ? "token" : "tokens"}${skip === 0 ? "" : `; skipped ${skip} existing`}.`
    );
    return pasteHandled;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not import design tokens.",
    };
  }
};

export const designTokens: Plugin = {
  name: "design-tokens",
  mimeType: "text/plain",
  onPaste: handlePasteDesignTokens,
};
