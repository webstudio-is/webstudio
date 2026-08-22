import { parseMarkdownDocumentSource } from "@webstudio-is/content-engine";
import {
  previewMarkdownToMdxConversion,
  type MarkdownToMdxConversionPreview,
} from "@webstudio-is/content-engine/mdx-conversion";
import { getAssetDisplayNameParts, type Asset } from "@webstudio-is/sdk";
import type { AssetRepository } from "./asset-repository";

export type MarkdownAssetConversionRepository = Pick<
  AssetRepository,
  "readContent" | "createUploadTicket" | "completeUpload"
>;

export type MarkdownAssetConversionResult = Readonly<{
  sourceAsset: Asset;
  asset: Asset;
  preview: MarkdownToMdxConversionPreview;
}>;

/** Validates and converts a Markdown Asset before reserving a separate MDX Asset. */
export const convertMarkdownAssetToMdx = async ({
  repository,
  sourceAssetId,
}: {
  repository: MarkdownAssetConversionRepository;
  sourceAssetId: Asset["id"];
}): Promise<MarkdownAssetConversionResult> => {
  const { asset: sourceAsset, data } = await repository.readContent({
    assetId: sourceAssetId,
  });
  const { basename, ext } = getAssetDisplayNameParts(sourceAsset);
  if (sourceAsset.type !== "file" || ext.toLowerCase() !== "md") {
    throw new Error("Only Markdown Assets can be converted to MDX");
  }

  const markdown = await parseMarkdownDocumentSource({ source: data });
  const preview = await previewMarkdownToMdxConversion({
    source: markdown.source,
  });
  const ticket = await repository.createUploadTicket({
    type: "text/mdx",
    filename: `${basename}.mdx`,
    displayFilename: basename,
    description: sourceAsset.description ?? undefined,
    folderId: sourceAsset.folderId,
  });
  if (ticket.deduplicated) {
    throw new Error("MDX conversion must create a separate Asset");
  }

  const asset = await repository.completeUpload({
    name: ticket.name,
    data: new Blob([preview.source]).stream(),
    assetInfoFallback: undefined,
    assetId: ticket.assetId,
  });
  return { sourceAsset, asset, preview };
};
