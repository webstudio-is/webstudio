import type { z } from "zod";
import type { buildPatchTransaction } from "@webstudio-is/protocol";

type BuildPatchPayload = z.infer<typeof buildPatchTransaction>["payload"];

export const compactBuildPatchPayload = (
  payload: BuildPatchPayload
): BuildPatchPayload => payload.filter(({ patches }) => patches.length > 0);
