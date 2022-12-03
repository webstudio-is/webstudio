import {
  type DesignTokens as DbDesignTokens,
  prisma,
} from "@webstudio-is/prisma-client";
import { applyPatches, Patch } from "immer";
import { DesignToken } from "./schema";

export const load = async (buildId: DbDesignTokens["buildId"]) => {
  const data = await prisma.designTokens.findUnique({
    where: { buildId },
  });

  if (data === null) {
    return [];
  }

  const designTokens: Array<DesignToken> = JSON.parse(data.value);

  return designTokens.map((token) => DesignToken.parse(token));
};

export const patch = async (
  buildId: DbDesignTokens["buildId"],
  patches: Array<Patch>
) => {
  const designTokens = await load(buildId);
  const nextDesignTokens = applyPatches(designTokens, patches);
  const parsedNextDesignTokens = nextDesignTokens.map((token) =>
    DesignToken.parse(token)
  );
  await prisma.designTokens.upsert({
    where: { buildId },
    update: { value: JSON.stringify(parsedNextDesignTokens) },
    create: { buildId, value: JSON.stringify(parsedNextDesignTokens) },
  });
};
