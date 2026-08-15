import {
  AssetRevisionConflictError,
  type AssetContentRepository,
} from "@webstudio-is/asset-uploader/content-repository";
import {
  parseMdxDocument,
  serializeMdxDocument,
  type MdxAuthoredNode,
  type MdxDocumentError,
  type MdxSourceRange,
} from "@webstudio-is/content-engine/mdx";
import {
  createConfirmationToken,
  validateConfirmationToken,
} from "../confirmation-token";

export type MdxTemplateMigration = Readonly<
  | { type: "rename"; from: string; to: string }
  | { type: "remove"; name: string }
>;

export type MdxTemplateMigrationFile = Readonly<{
  assetId: string;
  revision: string;
  contentRef: string;
  source: string;
}>;

export type MdxTemplateMigrationDiagnostic = Readonly<{
  code:
    | "invalid-mdx"
    | "unsafe-mdx"
    | "asset-revision-conflict"
    | "asset-authorization-failed"
    | "asset-write-failed";
  assetId: string;
  contentRef: string;
  message: string;
  sourceRange?: MdxSourceRange;
}>;

export type MdxTemplateMigrationFilePlan = Readonly<{
  assetId: string;
  revision: string;
  contentRef: string;
  source: string;
  changed: boolean;
  updateCount: number;
  omissionCount: number;
  diagnostics: readonly MdxTemplateMigrationDiagnostic[];
}>;

export type MdxTemplateMigrationPlan = Readonly<{
  status: "confirmation-required";
  migration: MdxTemplateMigration;
  files: readonly MdxTemplateMigrationFilePlan[];
  updateCount: number;
  omissionCount: number;
  changedFileCount: number;
  selectionAssetIds: readonly string[];
  confirmationScope?: Readonly<Record<string, unknown>>;
  confirmationToken: string;
  confirmationExpiresAt: string;
}>;

const updateNodes = (
  nodes: readonly MdxAuthoredNode[],
  migration: MdxTemplateMigration
): {
  nodes: readonly MdxAuthoredNode[];
  updateCount: number;
  omissionCount: number;
} => {
  let updateCount = 0;
  let omissionCount = 0;
  let changed = false;
  const nextNodes: MdxAuthoredNode[] = [];
  for (const node of nodes) {
    if (node.type === "template") {
      const matches =
        migration.type === "rename"
          ? node.name === migration.from
          : node.name === migration.name;
      if (matches && migration.type === "remove") {
        omissionCount += 1;
        changed = true;
        continue;
      }
      const children = updateNodes(node.children, migration);
      updateCount += children.updateCount;
      omissionCount += children.omissionCount;
      if (matches && migration.type === "rename") {
        updateCount += 1;
        changed = true;
        nextNodes.push({
          ...node,
          name: migration.to,
          children: children.nodes,
        });
        continue;
      }
      if (children.nodes !== node.children) {
        changed = true;
        nextNodes.push({ ...node, children: children.nodes });
      } else {
        nextNodes.push(node);
      }
      continue;
    }
    if (node.type === "element") {
      const children = updateNodes(node.children, migration);
      updateCount += children.updateCount;
      omissionCount += children.omissionCount;
      if (children.nodes !== node.children) {
        changed = true;
        nextNodes.push({ ...node, children: children.nodes });
      } else {
        nextNodes.push(node);
      }
      continue;
    }
    nextNodes.push(node);
  }
  return {
    nodes: changed ? nextNodes : nodes,
    updateCount,
    omissionCount,
  };
};

const toParseDiagnostic = (
  file: MdxTemplateMigrationFile,
  error: unknown
): MdxTemplateMigrationDiagnostic => ({
  code:
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "unsafe-mdx"
      ? "unsafe-mdx"
      : "invalid-mdx",
  assetId: file.assetId,
  contentRef: file.contentRef,
  message: error instanceof Error ? error.message : "Unable to parse MDX",
  sourceRange: (error as MdxDocumentError | undefined)?.sourceRange,
});

const getConfirmationPayload = ({
  projectId,
  migration,
  files,
  selectionAssetIds,
  confirmationScope,
}: {
  projectId: string;
  migration: MdxTemplateMigration;
  files: readonly MdxTemplateMigrationFilePlan[];
  selectionAssetIds?: readonly string[];
  confirmationScope?: Readonly<Record<string, unknown>>;
}) => ({
  operation: "mdx-template-migration",
  projectId,
  migration,
  confirmationScope,
  selectionAssetIds:
    selectionAssetIds === undefined
      ? files.map(({ assetId }) => assetId).sort()
      : [...selectionAssetIds].sort(),
  files: files.map(({ assetId, revision, contentRef, source, changed }) => ({
    assetId,
    revision,
    contentRef,
    source,
    changed,
  })),
});

export const validateMdxTemplateMigrationConfirmation = ({
  projectId,
  plan,
  confirmationToken,
}: {
  projectId: string;
  plan: MdxTemplateMigrationPlan;
  confirmationToken?: string;
}) =>
  validateConfirmationToken(
    confirmationToken,
    getConfirmationPayload({
      projectId,
      migration: plan.migration,
      files: plan.files,
      selectionAssetIds: plan.selectionAssetIds,
      confirmationScope: plan.confirmationScope,
    })
  );

export const planMdxTemplateMigration = async ({
  projectId,
  migration,
  files,
  selectionAssetIds,
  confirmationScope,
  confirmationTtlMs = 5 * 60_000,
}: {
  projectId: string;
  migration: MdxTemplateMigration;
  files: readonly MdxTemplateMigrationFile[];
  selectionAssetIds?: readonly string[];
  confirmationScope?: Readonly<Record<string, unknown>>;
  confirmationTtlMs?: number;
}): Promise<MdxTemplateMigrationPlan> => {
  if (files.length > 100) {
    throw new Error("MDX template migration is limited to 100 files");
  }
  const selected = selectionAssetIds ?? files.map(({ assetId }) => assetId);
  if (
    selected.length > 100 ||
    (selectionAssetIds !== undefined &&
      new Set(selected).size !== selected.length)
  ) {
    throw new Error("MDX template migration selection is invalid");
  }
  const seenAssetIds = new Set<string>();
  let totalBytes = 0;
  const plannedFiles: MdxTemplateMigrationFilePlan[] = [];
  for (const file of files) {
    if (seenAssetIds.has(file.assetId)) {
      throw new Error(`Duplicate MDX Asset "${file.assetId}"`);
    }
    seenAssetIds.add(file.assetId);
    totalBytes += new TextEncoder().encode(file.source).byteLength;
    if (totalBytes > 10 * 1024 * 1024) {
      throw new Error("MDX template migration exceeds the 10 MiB limit");
    }
    try {
      const document = await parseMdxDocument({ source: file.source });
      const result = updateNodes(document.children, migration);
      plannedFiles.push({
        assetId: file.assetId,
        revision: file.revision,
        contentRef: file.contentRef,
        source:
          result.nodes === document.children
            ? file.source
            : serializeMdxDocument({ ...document, children: result.nodes }),
        changed: result.nodes !== document.children,
        updateCount: result.updateCount,
        omissionCount: result.omissionCount,
        diagnostics: [],
      });
    } catch (error) {
      plannedFiles.push({
        ...file,
        changed: false,
        updateCount: 0,
        omissionCount: 0,
        diagnostics: [toParseDiagnostic(file, error)],
      });
    }
  }
  const confirmation = await createConfirmationToken(
    getConfirmationPayload({
      projectId,
      migration,
      files: plannedFiles,
      selectionAssetIds: selected,
      confirmationScope,
    }),
    confirmationTtlMs
  );
  return {
    status: "confirmation-required",
    migration,
    files: plannedFiles,
    updateCount: plannedFiles.reduce((sum, file) => sum + file.updateCount, 0),
    omissionCount: plannedFiles.reduce(
      (sum, file) => sum + file.omissionCount,
      0
    ),
    changedFileCount: plannedFiles.filter((file) => file.changed).length,
    selectionAssetIds: [...selected].sort(),
    confirmationScope,
    confirmationToken: confirmation.token,
    confirmationExpiresAt: new Date(confirmation.expiresAt).toISOString(),
  };
};

export type MdxTemplateMigrationResult = Readonly<{
  status: "complete" | "partial" | "failed" | "confirmation-required";
  files: readonly Readonly<{
    assetId: string;
    contentRef: string;
    status: "updated" | "unchanged" | "failed";
    updateCount: number;
    omissionCount: number;
    diagnostics: readonly MdxTemplateMigrationDiagnostic[];
  }>[];
  updateCount: number;
  omissionCount: number;
}>;

const toBytes = (source: string) => new Blob([source]).stream();

export const applyMdxTemplateMigration = async ({
  projectId,
  plan,
  confirmationToken,
  repository,
  authorizeAsset,
}: {
  projectId: string;
  plan: MdxTemplateMigrationPlan;
  confirmationToken?: string;
  repository: Pick<AssetContentRepository, "updateContent">;
  authorizeAsset: (input: {
    assetId: string;
    revision: string;
    contentRef: string;
  }) => boolean | Promise<boolean>;
}): Promise<MdxTemplateMigrationResult> => {
  const confirmed = await validateMdxTemplateMigrationConfirmation({
    projectId,
    plan,
    confirmationToken,
  });
  if (confirmed === false) {
    return {
      status: "confirmation-required",
      files: [],
      updateCount: 0,
      omissionCount: 0,
    };
  }
  const results: MdxTemplateMigrationResult["files"][number][] = [];
  for (const file of plan.files) {
    if (file.changed === false || file.diagnostics.length > 0) {
      results.push({
        assetId: file.assetId,
        contentRef: file.contentRef,
        status: file.diagnostics.length > 0 ? "failed" : "unchanged",
        updateCount: 0,
        omissionCount: 0,
        diagnostics: file.diagnostics,
      });
      continue;
    }
    let authorized = false;
    try {
      authorized = await authorizeAsset(file);
    } catch {
      // Report the authorization failure per file without hiding other results.
    }
    if (authorized === false) {
      results.push({
        assetId: file.assetId,
        contentRef: file.contentRef,
        status: "failed",
        updateCount: 0,
        omissionCount: 0,
        diagnostics: [
          {
            code: "asset-authorization-failed",
            assetId: file.assetId,
            contentRef: file.contentRef,
            message: "The MDX Asset is not authorized for writing",
          },
        ],
      });
      continue;
    }
    try {
      await repository.updateContent({
        assetId: file.assetId,
        expectedName: file.contentRef,
        data: toBytes(file.source),
      });
      results.push({
        assetId: file.assetId,
        contentRef: file.contentRef,
        status: "updated",
        updateCount: file.updateCount,
        omissionCount: file.omissionCount,
        diagnostics: [],
      });
    } catch (error) {
      const conflict = error instanceof AssetRevisionConflictError;
      results.push({
        assetId: file.assetId,
        contentRef: file.contentRef,
        status: "failed",
        updateCount: 0,
        omissionCount: 0,
        diagnostics: [
          {
            code: conflict ? "asset-revision-conflict" : "asset-write-failed",
            assetId: file.assetId,
            contentRef: file.contentRef,
            message:
              error instanceof Error ? error.message : "Asset write failed",
          },
        ],
      });
    }
  }
  const updated = results.filter((file) => file.status === "updated");
  const failed = results.filter((file) => file.status === "failed");
  return {
    status:
      failed.length === 0
        ? "complete"
        : updated.length > 0
          ? "partial"
          : "failed",
    files: results,
    updateCount: updated.reduce((sum, file) => sum + file.updateCount, 0),
    omissionCount: updated.reduce((sum, file) => sum + file.omissionCount, 0),
  };
};
