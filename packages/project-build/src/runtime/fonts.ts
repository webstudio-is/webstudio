import { SYSTEM_FONTS } from "@webstudio-is/fonts";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import { throwBuilderRuntimeError } from "./errors";

export const fontListInput = z.object({
  includeSystem: z
    .boolean()
    .default(true)
    .describe("Include built-in system font stacks."),
});

export const listFonts = (
  state: Pick<BuilderState, "assets">,
  input: z.infer<typeof fontListInput>
) => {
  if (state.assets === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Assets namespace is missing"
    );
  }
  const uploadedByFamily = new Map<
    string,
    Array<{
      assetId: string;
      format: string;
      style?: string;
      weight?: number;
      variable: boolean;
    }>
  >();
  for (const asset of state.assets.values()) {
    if (asset.type !== "font") {
      continue;
    }
    const entries = uploadedByFamily.get(asset.meta.family) ?? [];
    entries.push({
      assetId: asset.id,
      format: asset.format,
      ...("style" in asset.meta ? { style: asset.meta.style } : {}),
      ...("weight" in asset.meta ? { weight: asset.meta.weight } : {}),
      variable: "variationAxes" in asset.meta,
    });
    uploadedByFamily.set(asset.meta.family, entries);
  }
  const uploaded = Array.from(uploadedByFamily, ([family, assets]) => ({
    family,
    source: "uploaded" as const,
    assets,
  })).sort((left, right) => left.family.localeCompare(right.family));
  const system = input.includeSystem
    ? Array.from(SYSTEM_FONTS, ([family, config]) => ({
        family,
        source: "system" as const,
        stack: config.stack,
        description: config.description,
      }))
    : [];
  return { uploaded, system };
};
