import type { Asset } from "@webstudio-is/sdk";
import type { AssetRepository } from "./asset-repository";

const searchableFormats = new Set([
  "md",
  "mdx",
  "markdown",
  "json",
  "txt",
  "csv",
  "yaml",
  "yml",
]);

type ContentRepository = Pick<
  AssetRepository,
  "list" | "readContent" | "updateContent"
>;

type MatchLocation = {
  assetId: string;
  lineIndex: number;
  column: number;
};

const encodeMatchId = ({ assetId, lineIndex, column }: MatchLocation) =>
  `document-match:${encodeURIComponent(
    JSON.stringify([assetId, lineIndex, column])
  )}`;

const decodeMatchId = (matchId: string): MatchLocation => {
  const prefix = "document-match:";
  if (matchId.startsWith(prefix) === false) {
    throw new Error("Invalid document match id");
  }
  try {
    const value: unknown = JSON.parse(
      decodeURIComponent(matchId.slice(prefix.length))
    );
    if (
      Array.isArray(value) === false ||
      value.length !== 3 ||
      typeof value[0] !== "string" ||
      Number.isInteger(value[1]) === false ||
      Number.isInteger(value[2]) === false ||
      value[1] < 0 ||
      value[2] < 0
    ) {
      throw new Error("Invalid document match location");
    }
    return { assetId: value[0], lineIndex: value[1], column: value[2] };
  } catch {
    throw new Error("Invalid document match id");
  }
};

const readText = async (data: AsyncIterable<Uint8Array>) => {
  const decoder = new TextDecoder();
  let content = "";
  for await (const chunk of data) {
    content += decoder.decode(chunk, { stream: true });
  }
  return content + decoder.decode();
};

const isSearchableAsset = (asset: Asset) =>
  asset.type === "file" &&
  searchableFormats.has(asset.format.toLocaleLowerCase());

export const searchAssetContentMatches = async ({
  repository,
  query,
  limit = 20,
  maxDurationMs,
  now = Date.now,
}: {
  repository: ContentRepository;
  query: string;
  limit?: number;
  maxDurationMs?: number;
  now?: () => number;
}) => {
  const startedAt = now();
  const normalizedQuery = query.toLocaleLowerCase();
  const matches: Array<Record<string, unknown>> = [];
  let total = 0;
  const assertWithinBudget = () => {
    if (maxDurationMs !== undefined && now() - startedAt >= maxDurationMs) {
      throw Object.assign(
        new Error(
          `Document search exceeded the ${maxDurationMs}ms time budget.`
        ),
        { code: "TIME_BUDGET_EXCEEDED" }
      );
    }
  };

  for (const asset of await repository.list()) {
    if (isSearchableAsset(asset) === false) {
      continue;
    }
    assertWithinBudget();
    const { data } = await repository.readContent({
      assetId: asset.id,
      asset,
    });
    const content = await readText(data);
    assertWithinBudget();
    for (const [lineIndex, line] of content.split(/\r?\n/).entries()) {
      let from = 0;
      const normalizedLine = line.toLocaleLowerCase();
      while (from <= normalizedLine.length) {
        const column = normalizedLine.indexOf(normalizedQuery, from);
        if (column === -1) {
          break;
        }
        total += 1;
        if (matches.length < limit) {
          matches.push({
            matchId: encodeMatchId({ assetId: asset.id, lineIndex, column }),
            kind: "document",
            entityType: "document",
            entityId: asset.id,
            assetId: asset.id,
            format: asset.format,
            currentValue: line.slice(column, column + query.length),
            editable: true,
            editCommand: "update-document-matches",
            location: {
              namespace: "assets",
              path: [asset.id, "content", lineIndex, column],
              source: asset.name,
              line: lineIndex + 1,
              column: column + 1,
            },
            affectedRoutes: [],
            reference: {
              targetType: "asset",
              targetId: asset.id,
              resolved: true,
              valid: true,
            },
          });
        }
        from = column + Math.max(1, query.length);
      }
    }
  }
  return { matches, total, elapsedMs: now() - startedAt };
};

export const updateAssetContentMatches = async ({
  repository,
  updates,
}: {
  repository: ContentRepository;
  updates: Array<{ matchId: string; expectedValue: string; value: string }>;
}) => {
  const locations = updates.map((update) => ({
    ...update,
    ...decodeMatchId(update.matchId),
  }));
  const assetIds = new Set(locations.map(({ assetId }) => assetId));
  if (assetIds.size !== 1) {
    throw new Error(
      "Document match updates must target one asset to preserve atomicity"
    );
  }
  if (new Set(updates.map(({ matchId }) => matchId)).size !== updates.length) {
    throw new Error("Document match updates must use unique match ids");
  }
  const assetId = locations[0].assetId;
  const { asset, data } = await repository.readContent({ assetId });
  const lines = (await readText(data)).split(/(\r?\n)/);
  const contentLines = lines.filter((_, index) => index % 2 === 0);
  const replacements = locations.map((location) => {
    const line = contentLines[location.lineIndex];
    if (
      line === undefined ||
      line.slice(
        location.column,
        location.column + location.expectedValue.length
      ) !== location.expectedValue
    ) {
      throw new Error(
        `Document content changed since search for ${location.matchId}`
      );
    }
    return location;
  });
  replacements.sort(
    (left, right) =>
      right.lineIndex - left.lineIndex || right.column - left.column
  );
  for (const replacement of replacements) {
    const line = contentLines[replacement.lineIndex];
    contentLines[replacement.lineIndex] =
      line.slice(0, replacement.column) +
      replacement.value +
      line.slice(replacement.column + replacement.expectedValue.length);
  }
  let contentLineIndex = 0;
  const content = lines
    .map((value, index) =>
      index % 2 === 0 ? contentLines[contentLineIndex++] : value
    )
    .join("");
  await repository.updateContent({
    assetId,
    expectedName: asset.name,
    data: new Blob([content]).stream(),
  });
  return {
    changedCount: updates.length,
    affectedEntities: [{ entityType: "document", entityId: assetId }],
    affectedRoutes: [] as string[],
    generatedValues: [] as unknown[],
    validation: { status: "passed" as const },
    uncertainty: [
      "Route impact is unknown until the asset's Builder references are inspected.",
    ],
    next: "Run route.verify for the route that renders this document.",
    slowOperationConsentRequired: false,
  };
};
