import { webstudioFragment } from "@webstudio-is/sdk";
import { z } from "zod";
import { parseDataEnvelope } from "./data-envelope";
import {
  ambiguousFormClipboardMessage,
  hasAmbiguousFormInstance,
} from "../fragment-identity";

export const instanceTransferDataVersion = "@webstudio/instance/v0.1";
export const instancesTransferDataVersion = "@webstudio/instances/v0.1";

export const instanceTransferData = webstudioFragment.extend({
  sourceOrigin: z.string().url().optional(),
  assetPaths: z.record(z.string(), z.string()).optional(),
  instanceSelector: z.array(z.string()),
});

export const instancesTransferData = z.object({
  sourceOrigin: z.string().url().optional(),
  assetPaths: z.record(z.string(), z.string()).optional(),
  rootInstanceIds: z.array(z.string()),
  fragment: webstudioFragment,
});

export type InstanceTransferData = z.infer<typeof instanceTransferData>;
export type InstancesTransferData = z.infer<typeof instancesTransferData>;

export const parseInstanceTransferData = (serializedData: string) => {
  const transferData = parseDataEnvelope({
    serializedData,
    schemas: [
      [instanceTransferDataVersion, instanceTransferData],
      [instancesTransferDataVersion, instancesTransferData],
    ] as const,
  });
  if (transferData.valid === false) {
    return transferData;
  }
  const fragment =
    transferData.version === instanceTransferDataVersion
      ? transferData.data
      : transferData.data.fragment;
  if (hasAmbiguousFormInstance(fragment)) {
    return {
      owned: true,
      valid: false,
      error: ambiguousFormClipboardMessage,
    } as const;
  }
  if (transferData.version === instanceTransferDataVersion) {
    return { ...transferData, type: "single-root" } as const;
  }
  return { ...transferData, type: "multi-root" } as const;
};
