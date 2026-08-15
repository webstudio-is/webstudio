import { createAssetContentRevision } from "@webstudio-is/asset-uploader/content-revision";
import type { AssetRepository } from "@webstudio-is/asset-uploader/server";
import {
  decodeUtf8,
  readBoundedBytes,
} from "@webstudio-is/content-engine/compiler";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import {
  MdxDocumentError,
  parseMdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  getAssetContentHash,
  getAssetDisplayNameParts,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import type { BuilderState } from "../state/builder-state";
import { getRequiredComponentInsertData } from "./components";
import { getContentStorageIdentityKey } from "./content-storage";
import { materializeMdxAuthoredContent } from "./mdx-authored-content";
import { materializeMdxTemplates } from "./mdx-materialization";
import {
  prepareMdxContentStorageWrites,
  type PendingMdxContentStorageWrite,
} from "./mdx-storage-adapter";
import { resolveMdxTemplates } from "./mdx-template-resolution";
import type { ContentStorageChange } from "./mutation";

type SessionBase = Readonly<{
  key: string;
  identity: ContentBlockExternalContentIdentity;
  diagnostics: readonly ContentBlockDiagnostic[];
}>;

type LoadedSessionBase = SessionBase &
  Readonly<{
    root: ReturnType<typeof materializeMdxAuthoredContent>;
  }>;

export type MdxAssetEditingSessionState =
  | (LoadedSessionBase & Readonly<{ status: "saved" }>)
  | (LoadedSessionBase &
      Readonly<{
        status: "pending";
        writes: readonly PendingMdxContentStorageWrite[];
      }>)
  | (SessionBase & Readonly<{ status: "conflicting" }>)
  | (SessionBase & Readonly<{ status: "cancelled" }>)
  | (SessionBase & Readonly<{ status: "recoverable"; error: Error }>)
  | Readonly<{
      status: "failed";
      blockInstanceId: string;
      renderScope: string;
      diagnostics: readonly ContentBlockDiagnostic[];
      error: Error;
    }>;

export type MdxAssetSessionAuthorization = (input: {
  assetId: string;
  operation: "read" | "write";
  identity?: ContentBlockExternalContentIdentity;
}) => boolean | Promise<boolean>;

export type MdxAssetSessionOpenInput = Readonly<{
  blockInstanceId: string;
  source: ContentBlockSource;
  renderScope: string;
  expectedRevision?: string;
  state: BuilderState;
  projectId: string;
}>;

const toParserDiagnostic = ({
  error,
  identity,
}: {
  error: unknown;
  identity: ContentBlockExternalContentIdentity;
}): ContentBlockDiagnostic => {
  if (error instanceof MdxDocumentError && error.code === "unsafe-mdx") {
    return {
      code: "unsafe-mdx",
      severity: "error",
      blockInstanceId: identity.blockInstanceId,
      assetId: identity.assetId,
      contentRef: identity.contentRef,
      renderScope: identity.renderScope,
      nodeType: error.nodeType ?? "unknown",
      reason: error.reason ?? error.message,
      sourceRange: error.sourceRange,
    };
  }
  return {
    code: "invalid-mdx",
    severity: "error",
    blockInstanceId: identity.blockInstanceId,
    assetId: identity.assetId,
    contentRef: identity.contentRef,
    renderScope: identity.renderScope,
    message: error instanceof Error ? error.message : "Unable to parse MDX",
    sourceRange:
      error instanceof MdxDocumentError ? error.sourceRange : undefined,
  };
};

export const createMdxAssetEditingSession = ({
  repository,
  authorizeAsset,
  resolveExpressionAssetId,
}: {
  repository: Pick<AssetRepository, "readContent">;
  authorizeAsset: MdxAssetSessionAuthorization;
  resolveExpressionAssetId?: (input: {
    expression: string;
    blockInstanceId: string;
    renderScope: string;
  }) => string | undefined | Promise<string | undefined>;
}) => {
  const states = new Map<string, MdxAssetEditingSessionState>();

  const open = async (
    input: MdxAssetSessionOpenInput
  ): Promise<MdxAssetEditingSessionState> => {
    let assetId: string | undefined;
    try {
      assetId =
        input.source.type === "asset"
          ? input.source.assetId
          : await resolveExpressionAssetId?.({
              expression: input.source.value,
              blockInstanceId: input.blockInstanceId,
              renderScope: input.renderScope,
            });
    } catch (error) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error:
          error instanceof Error
            ? error
            : new Error("Content Block source resolution failed"),
      };
    }
    if (assetId === undefined || assetId.length === 0) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error: new Error("Content Block source did not resolve to an Asset"),
      };
    }
    const pending = Array.from(states.values()).find(
      (state) =>
        state.status === "pending" &&
        state.identity.blockInstanceId === input.blockInstanceId &&
        state.identity.assetId === assetId &&
        state.identity.renderScope === input.renderScope
    );
    if (pending !== undefined) {
      return pending;
    }
    let readAuthorized = false;
    try {
      readAuthorized =
        (await authorizeAsset({ assetId, operation: "read" })) === true;
    } catch (error) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error:
          error instanceof Error
            ? error
            : new Error("MDX Asset read authorization failed"),
      };
    }
    if (readAuthorized === false) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [
          {
            code: "authorization-failed",
            severity: "error",
            blockInstanceId: input.blockInstanceId,
            assetId,
            renderScope: input.renderScope,
            operation: "read",
          },
        ],
        error: new Error("MDX Asset is not authorized for reading"),
      };
    }

    let read: Awaited<ReturnType<AssetRepository["readContent"]>>;
    let bytes: Uint8Array;
    try {
      read = await repository.readContent({ assetId });
      bytes = await readBoundedBytes(
        read.data,
        contentEngineLimits.hydratedFileBytes
      );
    } catch (error) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error: error instanceof Error ? error : new Error("Asset read failed"),
      };
    }

    const contentHash = await getAssetContentHash(new Uint8Array(bytes).buffer);
    const revisionInput = {
      storageName: read.asset.name,
      updatedAt: read.asset.updatedAt ?? read.asset.createdAt,
      size: read.asset.size,
    };
    const contentRevision = createAssetContentRevision({
      ...revisionInput,
      contentHash,
    });
    const legacyRevision = createAssetContentRevision(revisionInput);
    const revision =
      input.expectedRevision === legacyRevision
        ? legacyRevision
        : contentRevision;
    const identity: ContentBlockExternalContentIdentity = {
      blockInstanceId: input.blockInstanceId,
      assetId: read.asset.id,
      revision,
      contentRef: read.asset.name,
      format: "mdx",
      renderScope: input.renderScope,
    };
    const key = getContentStorageIdentityKey(identity);
    if (read.asset.id !== assetId) {
      const conflicting = {
        status: "conflicting" as const,
        key,
        identity,
        diagnostics: [
          {
            code: "changed-binding" as const,
            severity: "error" as const,
            blockInstanceId: input.blockInstanceId,
            assetId,
            contentRef: identity.contentRef,
            renderScope: input.renderScope,
            loadedAssetId: read.asset.id,
            resolvedAssetId: assetId,
          },
        ],
      };
      states.set(key, conflicting);
      return conflicting;
    }
    if (
      read.asset.type !== "file" ||
      getAssetDisplayNameParts(read.asset).ext.toLowerCase() !== "mdx"
    ) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error: new Error("Content Block source Asset must be an MDX file"),
      };
    }
    if (
      input.expectedRevision !== undefined &&
      input.expectedRevision !== contentRevision &&
      input.expectedRevision !== legacyRevision
    ) {
      const conflicting = {
        status: "conflicting" as const,
        key,
        identity,
        diagnostics: [
          {
            code: "stale-revision" as const,
            severity: "error" as const,
            blockInstanceId: input.blockInstanceId,
            assetId,
            contentRef: identity.contentRef,
            renderScope: input.renderScope,
            expectedRevision: input.expectedRevision,
            actualRevision: revision,
          },
        ],
      };
      states.set(key, conflicting);
      return conflicting;
    }
    const existing = states.get(key);
    if (existing?.status === "pending") {
      return existing;
    }

    let document;
    try {
      document = await parseMdxDocument({ source: decodeUtf8(bytes) });
    } catch (error) {
      const recoverable = {
        status: "recoverable" as const,
        key,
        identity,
        diagnostics: [toParserDiagnostic({ error, identity })],
        error:
          error instanceof Error ? error : new Error("Unable to parse MDX"),
      };
      states.set(key, recoverable);
      return recoverable;
    }

    try {
      const data = getRequiredComponentInsertData(input.state);
      const resolution = resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas: componentMetas,
      });
      const templateMaterialization = await materializeMdxTemplates({
        identity,
        resolution,
        data,
        metas: componentMetas,
        projectId: input.projectId,
      });
      const root = materializeMdxAuthoredContent({
        identity,
        document,
        templateMaterialization,
      });
      const saved = {
        status: "saved" as const,
        key,
        identity,
        root,
        diagnostics: templateMaterialization.diagnostics,
      };
      states.set(key, saved);
      return saved;
    } catch (error) {
      const failed = {
        status: "failed" as const,
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [] as const,
        error:
          error instanceof Error
            ? error
            : new Error("MDX materialization failed"),
      };
      return failed;
    }
  };

  const prepareSave = async ({
    key,
    changes,
  }: {
    key: string;
    changes: readonly ContentStorageChange[];
  }): Promise<MdxAssetEditingSessionState> => {
    const current = states.get(key);
    if (
      current === undefined ||
      (current.status !== "saved" && current.status !== "pending")
    ) {
      throw new Error("MDX Asset editing session is not ready to save");
    }
    try {
      const writes = await prepareMdxContentStorageWrites({
        loadedRoots: [current.root],
        changes,
        authorizeAssetWrite: async (identity) =>
          identity.assetId === current.identity.assetId &&
          getContentStorageIdentityKey(identity) === current.key &&
          (await authorizeAsset({
            assetId: current.identity.assetId,
            operation: "write",
            identity: current.identity,
          })),
      });
      if (writes.length === 0) {
        return current;
      }
      const pending = { ...current, status: "pending" as const, writes };
      states.set(key, pending);
      return pending;
    } catch (error) {
      const failed = {
        status: "failed" as const,
        blockInstanceId: current.identity.blockInstanceId,
        renderScope: current.identity.renderScope,
        diagnostics: [] as const,
        error:
          error instanceof Error
            ? error
            : new Error("Unable to prepare MDX Asset save"),
      };
      return failed;
    }
  };

  const cancel = (key: string): MdxAssetEditingSessionState => {
    const current = states.get(key);
    if (current === undefined || current.status === "failed") {
      throw new Error("MDX Asset editing session does not exist");
    }
    const cancelled = {
      status: "cancelled" as const,
      key: current.key,
      identity: current.identity,
      diagnostics: current.diagnostics,
    };
    states.set(key, cancelled);
    return cancelled;
  };

  return {
    open,
    prepareSave,
    cancel,
    get: (key: string) => states.get(key),
    list: () => Array.from(states.values()),
  };
};
