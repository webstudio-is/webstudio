import { compilerSettings, projectMeta, type Pages } from "@webstudio-is/sdk";
import { z } from "zod";

export const projectSettings = z.object({
  meta: projectMeta,
  compiler: compilerSettings,
});

export type ProjectSettings = z.infer<typeof projectSettings>;

export const createProjectSettingsFromPages = (
  pages: Pick<Pages, "meta" | "compiler">
): ProjectSettings => ({
  meta: structuredClone(pages.meta ?? {}),
  compiler: structuredClone(pages.compiler ?? {}),
});

export const removeLegacyProjectSettingsFromPages = (pages: Pages) => {
  pages.meta = undefined;
  pages.compiler = undefined;
  return pages;
};

export const removeAgentInstructionsFromProjectSettings = (
  settings: ProjectSettings
): ProjectSettings => {
  const { agentInstructions: _agentInstructions, ...meta } = settings.meta;
  return {
    ...settings,
    meta,
  };
};
