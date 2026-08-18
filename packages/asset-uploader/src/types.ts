import type { Asset } from "@webstudio-is/sdk";

type UploadTicketBase = {
  assetId: Asset["id"];
  name: string;
};

export type UploadTicket =
  | (UploadTicketBase & { deduplicated: false })
  | (UploadTicketBase & { deduplicated: true; asset: Asset });
