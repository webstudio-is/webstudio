export type MarkdownAssetReference = {
  start: number;
  end: number;
  assetId: string;
  suffix?: string;
};

export type MarkdownAssetReferences = Readonly<
  Record<string, readonly MarkdownAssetReference[]>
>;

const appendMarkdownReferenceSuffix = (
  assetUrl: string,
  suffix: string | undefined
) => {
  if (suffix === undefined || suffix.length === 0) {
    return assetUrl;
  }
  const base = new URL("https://content.webstudio.invalid/__assets__/");
  const target = new URL(assetUrl, base);
  const reference = new URL(suffix, base);
  for (const [name, value] of reference.searchParams) {
    target.searchParams.append(name, value);
  }
  if (reference.hash !== "") {
    target.hash = reference.hash;
  }
  if (URL.canParse(assetUrl)) {
    return target.href;
  }
  if (assetUrl.startsWith("//")) {
    return `//${target.host}${target.pathname}${target.search}${target.hash}`;
  }
  if (assetUrl.startsWith("/")) {
    return `${target.pathname}${target.search}${target.hash}`;
  }
  const basePath = base.pathname;
  const pathname = target.pathname.startsWith(basePath)
    ? target.pathname.slice(basePath.length)
    : target.pathname;
  return `${pathname}${target.search}${target.hash}`;
};

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
    const resolvedUrl = appendMarkdownReferenceSuffix(
      assetUrl,
      reference.suffix
    );
    result = `${result.slice(0, reference.start)}${resolvedUrl}${result.slice(reference.end)}`;
  }
  return result;
};
