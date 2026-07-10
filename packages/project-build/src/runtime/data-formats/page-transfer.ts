import {
  type Folder,
  type Page,
  type PageTemplate,
  type WebstudioFragment,
  webstudioFragment,
} from "@webstudio-is/sdk";
import { z } from "zod";
import { parseDataEnvelope } from "./data-envelope";

export type PageCopyData = {
  page: Page;
  rootFragment: WebstudioFragment;
  bodyFragment: WebstudioFragment;
};

export type TemplateCopyData = {
  template: PageTemplate;
  rootFragment: WebstudioFragment;
  bodyFragment: WebstudioFragment;
};

export type FolderCopyData = {
  folder: Folder;
  children: Array<PageCopyData | FolderCopyData>;
};

export type PageTransferData = PageCopyData & { type: "page" };

export type TemplateTransferData = TemplateCopyData & { type: "template" };

export type FolderTransferData = Omit<FolderCopyData, "children"> & {
  type: "folder";
  children: Array<PageTransferData | FolderTransferData>;
};

export type PageTransferItem =
  | PageTransferData
  | TemplateTransferData
  | FolderTransferData;

export const pageTransferPageInput: z.ZodType<PageTransferData> = z.object({
  type: z.literal("page"),
  page: z.custom<Page>(),
  rootFragment: webstudioFragment,
  bodyFragment: webstudioFragment,
});

export const pageTransferTemplateInput: z.ZodType<TemplateTransferData> =
  z.object({
    type: z.literal("template"),
    template: z.custom<PageTemplate>(),
    rootFragment: webstudioFragment,
    bodyFragment: webstudioFragment,
  });

export const pageTransferFolderInput: z.ZodType<FolderTransferData> = z.lazy(
  () =>
    z.object({
      type: z.literal("folder"),
      folder: z.custom<Folder>(),
      children: z.array(
        z.union([pageTransferPageInput, pageTransferFolderInput])
      ),
    })
);

export const pageTransferItemInput = z.union([
  pageTransferPageInput,
  pageTransferTemplateInput,
  pageTransferFolderInput,
]);

export const pageTransferDataVersion = "@webstudio/page/v0.1";

export const parsePageTransferData = (serializedData: string) => {
  const transferData = parseDataEnvelope({
    serializedData,
    schemas: [[pageTransferDataVersion, pageTransferItemInput]] as const,
  });
  if (transferData.valid === false) {
    return transferData;
  }
  return {
    owned: true,
    valid: true,
    data: transferData.data,
  } as const;
};
