import {
  detectDesignTokenSource,
  planDesignTokenImport,
} from "@webstudio-is/project-build/runtime";
import {
  executeRuntimeMutation,
  getWebstudioData,
} from "../instance-utils/data";
import { builderApi } from "../builder-api";
import { resolveTokenConflicts } from "../resolve-token-conflicts";
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

const collisionByResolution = {
  ours: "skip",
  theirs: "rename",
  merge: "overwrite",
} as const;

const handlePasteDesignTokens = async (value: string): Promise<PasteResult> => {
  const source = detectDesignTokenSource(parseJson(value));
  if (source === undefined) {
    return pasteIgnored;
  }
  try {
    const plan = planDesignTokenImport(getWebstudioData(), {
      source,
      collision: "skip",
    });
    const conflicts = plan
      .filter((entry) => entry.conflict)
      .map((entry) => ({ tokenName: entry.outputName }));
    const resolution = await resolveTokenConflicts(conflicts);
    if (resolution === "cancel") {
      return pasteHandled;
    }
    const collision = collisionByResolution[resolution];
    const mutation = executeRuntimeMutation({
      id: "designTokens.import",
      input: { source, collision },
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
