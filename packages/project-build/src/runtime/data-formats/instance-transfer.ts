import { webstudioFragment } from "@webstudio-is/sdk";
import { z } from "zod";
import { parseDataEnvelope } from "./data-envelope";

export const instanceTransferDataVersion = "@webstudio/instance/v0.1";
export const instancesTransferDataVersion = "@webstudio/instances/v0.1";

export const instanceTransferData = webstudioFragment.extend({
  instanceSelector: z.array(z.string()),
});

export const instancesTransferData = z.object({
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
  if (transferData.version === instanceTransferDataVersion) {
    return { ...transferData, type: "single-root" } as const;
  }
  return { ...transferData, type: "multi-root" } as const;
};
