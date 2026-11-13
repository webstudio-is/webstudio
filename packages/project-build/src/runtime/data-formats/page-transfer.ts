import {
  type Folder,
  type Page,
  type PageTemplate,
  type WebstudioFragment,
  webstudioFragment,
} from "@webstudio-is/sdk";
import { z } from "zod";
import { parseDataEnvelope } from "./data-envelope";
import {
  ambiguousFormClipboardMessage,
  hasAmbiguousFormInstance,
} from "../fragment-identity";

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

export const collectPageTransferItems = (
  item: PageTransferItem
): Array<PageTransferData | TemplateTransferData> => {
  if (item.type === "page" || item.type === "template") {
    return [item];
  }
  return item.children.flatMap(collectPageTransferItems);
};

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

const pageClipboardTransferItemInput = pageTransferItemInput.and(
  z.object({
    sourceOrigin: z.string().url().optional(),
    assetPaths: z.record(z.string(), z.string()).optional(),
  })
);
export const pageTransferDataVersion = "@webstudio/page/v0.1";

export const parsePageTransferData = (serializedData: string) => {
  const transferData = parseDataEnvelope({
    serializedData,
    schemas: [
      [pageTransferDataVersion, pageClipboardTransferItemInput],
    ] as const,
  });
  if (transferData.valid === false) {
    return transferData;
  }
  if (
    collectPageTransferItems(transferData.data).some(
      (item) =>
        hasAmbiguousFormInstance(item.rootFragment) ||
        hasAmbiguousFormInstance(item.bodyFragment)
    )
  ) {
    return {
      owned: true,
      valid: false,
      error: ambiguousFormClipboardMessage,
    } as const;
  }
  return {
    owned: true,
    valid: true,
    data: transferData.data,
  } as const;
};
