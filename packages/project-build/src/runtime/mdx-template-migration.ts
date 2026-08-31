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

export const mdxTemplateMigrationFileLimit = 100;
const mdxTemplateMigrationByteLimit = 10 * 1024 * 1024;

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
    const matches =
      node.type === "template" &&
      (migration.type === "rename"
        ? node.name === migration.from
        : node.name === migration.name);
    if (node.type === "template" && matches && migration.type === "remove") {
      omissionCount += 1;
      changed = true;
      continue;
    }
    if (
      node.type === "text" ||
      node.type === "comment" ||
      node.type === "opaque"
    ) {
      nextNodes.push(node);
      continue;
    }
    const children = updateNodes(node.children, migration);
    updateCount += children.updateCount;
    omissionCount += children.omissionCount;
    if (node.type === "template" && matches && migration.type === "rename") {
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
  if (files.length > mdxTemplateMigrationFileLimit) {
    throw new Error("MDX template migration is limited to 100 files");
  }
  const selected = selectionAssetIds ?? files.map(({ assetId }) => assetId);
  if (
    selected.length > mdxTemplateMigrationFileLimit ||
    (selectionAssetIds !== undefined &&
      new Set(selected).size !== selected.length)
  ) {
    throw new Error("MDX template migration selection is invalid");
  }
  const seenAssetIds = new Set<string>();
  let totalBytes = 0;
  const encoder = new TextEncoder();
  const plannedFiles: MdxTemplateMigrationFilePlan[] = [];
  for (const file of files) {
    if (seenAssetIds.has(file.assetId)) {
      throw new Error(`Duplicate MDX Asset "${file.assetId}"`);
    }
    seenAssetIds.add(file.assetId);
    totalBytes += encoder.encode(file.source).byteLength;
    if (totalBytes > mdxTemplateMigrationByteLimit) {
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
