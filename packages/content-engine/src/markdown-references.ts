import { mergeAssetUrlSuffix } from "./asset-value-references";
import type { ResolvedAssetReference } from "./asset-reference-utils";

export type MarkdownAssetReference = ResolvedAssetReference & {
  start: number;
  end: number;
};

export type MarkdownAssetReferences = Readonly<
  Record<string, readonly MarkdownAssetReference[]>
>;

export const rewriteMarkdownAssetReferenceRanges = ({
  markdown,
  references,
  assetUrls,
}: {
  markdown: string;
  references: readonly MarkdownAssetReference[];
  assetUrls: Readonly<Record<string, string>>;
}) => {
  let previousStart = markdown.length;
  let result = markdown;
  for (const reference of [...references].sort(
    (left, right) => right.start - left.start
  )) {
    if (
      reference.start < 0 ||
      reference.end <= reference.start ||
      reference.end > markdown.length ||
      reference.end > previousStart
    ) {
      throw new Error("Markdown asset reference range is invalid");
    }
    previousStart = reference.start;
    const assetUrl = assetUrls[reference.assetId];
    if (assetUrl === undefined) {
      continue;
    }
    const resolvedUrl = mergeAssetUrlSuffix(assetUrl, reference.suffix);
    result = `${result.slice(0, reference.start)}${resolvedUrl}${result.slice(reference.end)}`;
  }
  return result;
};
