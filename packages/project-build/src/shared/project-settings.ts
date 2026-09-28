import { compilerSettings, projectMeta, type Pages } from "@webstudio-is/sdk";
import { z } from "zod";

export const projectSettings = z.object({
  meta: projectMeta,
  compiler: compilerSettings,
});

export type ProjectSettings = z.infer<typeof projectSettings>;

/**
 * Reads persisted settings while discarding response-header rows written by
 * older clients with a null value. Writes still use the strict projectSettings
 * schema, so new invalid values are rejected.
 */
export const parseProjectSettings = (value: unknown): ProjectSettings => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const settings = value as Record<string, unknown>;
    const meta = settings.meta;
    if (typeof meta === "object" && meta !== null && !Array.isArray(meta)) {
      const metaRecord = meta as Record<string, unknown>;
      const customHeaders = metaRecord.customHeaders;
      if (Array.isArray(customHeaders)) {
        value = {
          ...settings,
          meta: {
            ...metaRecord,
            customHeaders: customHeaders.filter(
              (header) =>
                typeof header !== "object" ||
                header === null ||
                Array.isArray(header) ||
                !("value" in header) ||
                header.value !== null
            ),
          },
        };
      }
    }
  }
  return projectSettings.parse(value);
};

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
