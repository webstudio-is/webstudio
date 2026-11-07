import { webstudioFragment } from "@webstudio-is/sdk";
import { z } from "zod";
import { parseDataEnvelope } from "./data-envelope";

export const tokenTransferDataVersion = "@webstudio/token/v0.1";

export const tokenTransferData = z.object({
  tokenId: z.string(),
  fragment: webstudioFragment,
  sourceOrigin: z.string().url().optional(),
});

export type TokenTransferData = z.infer<typeof tokenTransferData>;

export const parseTokenTransferData = (serializedData: string) =>
  parseDataEnvelope({
    serializedData,
    schemas: [[tokenTransferDataVersion, tokenTransferData]] as const,
  });
