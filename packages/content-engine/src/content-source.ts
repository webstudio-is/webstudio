import type { ContentCompilationPlan } from "./compilation-plan";
import {
  compileContentArtifact,
  type ContentCompilerDiagnostics,
  type ContentCompilerInput,
} from "./asset-index";
import type { ContentArtifactV1 } from "./schema";
import {
  discoverMarkdownAssetReferences,
  type MarkdownAssetReferences,
} from "./markdown-assets";
import { compareStrings } from "./canonical-json";

export type ContentSourceFile = {
  id: string;
  path: string;
  contentType: string;
  contentRef: string;
  revision: string;
  size: number;
  createdAt?: string;
};

export interface ContentSourceSnapshot {
  readonly revision: string;
  readonly files: readonly ContentSourceFile[];
  loadEntries(
    plan?: ContentCompilationPlan
  ): Promise<readonly ContentCompilerInput[]>;
  isCurrent(): Promise<boolean>;
}

export interface ContentSource {
  openSnapshot(): Promise<ContentSourceSnapshot>;
}

export const createContentSourceFile = ({
  assetId,
  revision,
  document,
}: ContentCompilerInput): ContentSourceFile => ({
  id: assetId,
  path: document.path,
  contentType: document.mimeType,
  contentRef: document.contentRef,
  revision,
  size: document.size,
  createdAt: document.createdAt,
});

export class ContentSourceChangedError extends Error {
  constructor() {
    super("Content source changed while the database was being compiled");
    this.name = "ContentSourceChangedError";
  }
}

const validateSnapshot = (snapshot: ContentSourceSnapshot) => {
  if (snapshot.revision.length === 0) {
    throw new Error("Content source snapshot revision cannot be empty");
  }
  const ids = new Set<string>();
  for (const file of snapshot.files) {
    if (file.id.length === 0 || ids.has(file.id)) {
      throw new Error("Content source snapshot file ids must be unique");
    }
    ids.add(file.id);
    if (
      file.path.length === 0 ||
      file.contentType.length === 0 ||
      file.contentRef.length === 0 ||
      file.revision.length === 0 ||
      Number.isSafeInteger(file.size) === false ||
      file.size < 0
    ) {
      throw new Error("Content source snapshot contains an invalid file");
    }
  }
};

const validateEntries = ({
  snapshot,
  entries,
}: {
  snapshot: ContentSourceSnapshot;
  entries: readonly ContentCompilerInput[];
}) => {
  const fileById = new Map(snapshot.files.map((file) => [file.id, file]));
  for (const entry of entries) {
    const file = fileById.get(entry.assetId);
    if (
      file === undefined ||
      entry.revision !== file.revision ||
      entry.document.path !== file.path ||
      entry.document.mimeType !== file.contentType ||
      entry.document.contentRef !== file.contentRef ||
      entry.document.size !== file.size ||
      entry.document.createdAt !== file.createdAt
    ) {
      throw new Error(
        "Content source returned an entry outside the captured snapshot"
      );
    }
  }
};

const discoverSnapshotAssetReferences = ({
  snapshot,
  entries,
}: {
  snapshot: ContentSourceSnapshot;
  entries: readonly ContentCompilerInput[];
}): MarkdownAssetReferences => {
  const ambiguousPaths = new Set<string>();
  const assetIdsByPath = new Map<string, string>();
  for (const file of snapshot.files) {
    if (assetIdsByPath.has(file.path)) {
      ambiguousPaths.add(file.path);
      assetIdsByPath.delete(file.path);
      continue;
    }
    if (ambiguousPaths.has(file.path) === false) {
      assetIdsByPath.set(file.path, file.id);
    }
  }
  const references: Record<string, Readonly<Record<string, string>>> = {};
  for (const entry of [...entries].sort((left, right) =>
    compareStrings(left.document.contentRef, right.document.contentRef)
  )) {
    if (entry.content === undefined || entry.document.extension !== "md") {
      continue;
    }
    const discovered = discoverMarkdownAssetReferences({
      markdown: entry.content,
      sourcePath: entry.document.path,
      assetIdsByPath,
    });
    if (Object.keys(discovered).length > 0) {
      references[entry.document.contentRef] = Object.fromEntries(
        Object.entries(discovered).sort(([left], [right]) =>
          compareStrings(left, right)
        )
      );
    }
  }
  return references;
};

export const materializeContentSnapshot = async ({
  snapshot,
  plan,
}: {
  snapshot: ContentSourceSnapshot;
  plan?: ContentCompilationPlan;
}) => {
  validateSnapshot(snapshot);
  try {
    const entries = await snapshot.loadEntries(plan);
    validateEntries({ snapshot, entries });
    const assetReferences = discoverSnapshotAssetReferences({
      snapshot,
      entries,
    });
    if (await snapshot.isCurrent()) {
      return { sourceRevision: snapshot.revision, entries, assetReferences };
    }
  } catch (error) {
    if (await snapshot.isCurrent()) {
      throw error;
    }
  }
  throw new ContentSourceChangedError();
};

export const compileContentSource = async ({
  source,
  projectId,
  plan,
  maxBytes,
}: {
  source: ContentSource;
  projectId: string;
  plan?: ContentCompilationPlan;
  maxBytes?: number;
}): Promise<{
  sourceRevision: string;
  artifact: ContentArtifactV1;
  diagnostics: ContentCompilerDiagnostics;
}> => {
  const { sourceRevision, entries, assetReferences } =
    await materializeContentSource({
      source,
      plan,
    });
  const compiled = await compileContentArtifact({
    projectId,
    entries,
    assetReferences,
    ...(plan === undefined ? {} : { plan }),
    ...(maxBytes === undefined ? {} : { maxBytes }),
  });
  return { sourceRevision, ...compiled };
};

export const materializeContentSource = async ({
  source,
  plan,
}: {
  source: ContentSource;
  plan?: ContentCompilationPlan;
}): Promise<{
  sourceRevision: string;
  entries: readonly ContentCompilerInput[];
  assetReferences: MarkdownAssetReferences;
}> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const snapshot = await source.openSnapshot();
    try {
      return await materializeContentSnapshot({ snapshot, plan });
    } catch (error) {
      if (error instanceof ContentSourceChangedError === false) {
        throw error;
      }
    }
  }
  throw new ContentSourceChangedError();
};
