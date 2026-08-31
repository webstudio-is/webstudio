import {
  createMdxSourceDiagnostics,
  parseMdxDocumentRecovering,
  replaceMdxFrontmatter,
} from "@webstudio-is/content-engine/mdx";
import type { AssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import {
  getContentBlockSource,
  getContentBlockSources,
  createAssetContentRevision,
  createContentBlockExternalContentIdentity,
  isMdxFileAsset,
  type ContentBlockDiagnostic,
  type ContentBlockSource,
  type WebstudioData,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import {
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
} from "./content-block-source-lifecycle";
import {
  componentInsertReadNamespaces,
  getRequiredComponentInsertData,
} from "./components";
import { resolveContentBlockSourceAssetId } from "./block";
import { materializeMdxSource } from "./mdx-source";
import {
  planMdxTemplateMigration,
  validateMdxTemplateMigrationConfirmation,
  type MdxTemplateMigration,
} from "./mdx-template-migration";

const getData = (state: BuilderState): Omit<WebstudioData, "pages"> => ({
  ...getRequiredComponentInsertData(state),
  ...(state.assetFolders === undefined
    ? {}
    : { assetFolders: state.assetFolders }),
});

export const mdxAssetInspectionNamespaces = componentInsertReadNamespaces;

export const inspectMdxAssetSource = async ({
  source,
  assetId,
  state,
  metas,
  projectId,
}: {
  source: string;
  assetId: string;
  state: BuilderState;
  metas: Map<string, WsComponentMeta>;
  projectId: string;
}) => {
  const parsed = await parseMdxDocumentRecovering({ source });
  const sourceDiagnostics = createMdxSourceDiagnostics(parsed.diagnostics);
  const diagnostics: Array<
    | ReturnType<typeof createMdxSourceDiagnostics>[number]
    | ContentBlockDiagnostic
  > = [...sourceDiagnostics];
  const sourceDiagnosticKeys = new Set(
    sourceDiagnostics.map((diagnostic) =>
      JSON.stringify([
        diagnostic.code,
        diagnostic.message,
        diagnostic.sourceRange,
      ])
    )
  );
  const asset = state.assets?.get(assetId);
  if (asset === undefined || isMdxFileAsset(asset) === false) {
    return diagnostics;
  }
  const data = getData(state);
  const values = new Map<string, unknown>();
  for (const dataSource of state.dataSources?.values() ?? []) {
    if (dataSource.type === "variable") {
      values.set(dataSource.name, dataSource.value.value);
    }
  }
  for (const [blockInstanceId, contentSource] of getContentBlockSources({
    instances: state.instances?.values() ?? [],
    props: state.props?.values() ?? [],
  })) {
    if (
      resolveContentBlockSourceAssetId({ source: contentSource, values }) !==
      assetId
    ) {
      continue;
    }
    const identity = createContentBlockExternalContentIdentity({
      blockInstanceId,
      asset,
      renderScope: `asset:${assetId}:block:${blockInstanceId}`,
    });
    const materialized = await materializeMdxSource({
      source,
      identity,
      data,
      metas,
      projectId,
      parsed: { source, result: parsed },
    });
    diagnostics.push(
      ...materialized.diagnostics.filter((diagnostic) => {
        if (
          diagnostic.code !== "invalid-mdx" &&
          diagnostic.code !== "unsafe-mdx"
        ) {
          return true;
        }
        const message =
          diagnostic.code === "invalid-mdx"
            ? diagnostic.message
            : diagnostic.reason;
        return (
          sourceDiagnosticKeys.has(
            JSON.stringify([diagnostic.code, message, diagnostic.sourceRange])
          ) === false
        );
      })
    );
  }
  return diagnostics;
};

export const createContentBlockApplication = ({
  projectId,
  session,
  metas,
  resolveSourceAssetId,
}: {
  projectId: string;
  session: Pick<AssetContentSession, "open" | "reload" | "save" | "flush">;
  metas: Map<string, WsComponentMeta>;
  resolveSourceAssetId?: (input: {
    source: ContentBlockSource;
    state: BuilderState;
    variables?: Readonly<Record<string, unknown>>;
  }) => string | undefined;
}) => {
  const resolveSource = ({
    source,
    state,
    variables,
  }: {
    source: ContentBlockSource;
    state: BuilderState;
    variables?: Readonly<Record<string, unknown>>;
  }) => {
    const resolved = resolveSourceAssetId?.({ source, state, variables });
    if (resolveSourceAssetId !== undefined) {
      if (resolved === undefined || resolved === "") {
        throw new Error("Content source does not resolve to an MDX Asset");
      }
      return resolved;
    }
    const values = new Map<string, unknown>();
    for (const dataSource of state.dataSources?.values() ?? []) {
      if (dataSource.type === "variable") {
        values.set(dataSource.name, dataSource.value.value);
      }
    }
    for (const [name, value] of Object.entries(variables ?? {})) {
      values.set(name, value);
    }
    const assetId = resolveContentBlockSourceAssetId({ source, values });
    if (assetId === undefined || assetId === "") {
      throw new Error("Content source does not resolve to an MDX Asset");
    }
    return assetId;
  };

  const open = async ({
    source,
    state,
    blockInstanceId,
    renderScope,
    variables,
  }: {
    source: ContentBlockSource;
    state: BuilderState;
    blockInstanceId: string;
    renderScope: string;
    variables?: Readonly<Record<string, unknown>>;
  }) => {
    const assetId = resolveSource({
      source,
      state,
      variables,
    });
    const sessionState = await session.open(assetId);
    if (
      sessionState.asset.id !== assetId ||
      sessionState.asset.projectId !== projectId ||
      isMdxFileAsset(sessionState.asset) === false
    ) {
      throw new Error("Content source must resolve to an MDX Asset");
    }
    const identity = createContentBlockExternalContentIdentity({
      blockInstanceId,
      asset: sessionState.asset,
      renderScope,
    });
    return { state: sessionState, identity };
  };

  const requireConfiguredSource = ({
    state,
    blockInstanceId,
  }: {
    state: BuilderState;
    blockInstanceId: string;
  }) => {
    const source = getContentBlockSource({
      blockInstanceId,
      props: state.props?.values() ?? [],
    });
    if (source === undefined) {
      throw new Error("Content Block is not connected to an MDX Asset");
    }
    return source;
  };

  const inspect = async ({
    state,
    blockInstanceId,
    renderScope,
    source = requireConfiguredSource({ state, blockInstanceId }),
    variables,
  }: {
    state: BuilderState;
    blockInstanceId: string;
    renderScope: string;
    source?: ContentBlockSource;
    variables?: Readonly<Record<string, unknown>>;
  }) => {
    const opened = await open({
      source,
      state,
      blockInstanceId,
      renderScope,
      variables,
    });
    const materialized = await materializeMdxSource({
      source: opened.state.source,
      identity: opened.identity,
      data: getData(state),
      metas,
      projectId,
    });
    return {
      sessionState: opened.state,
      source: opened.state.source,
      sessionStatus: opened.state.status,
      identity: opened.identity,
      diagnostics: materialized.diagnostics,
      fragment: materialized.root.fragment,
    };
  };

  const connect = async ({
    state,
    blockInstanceId,
    renderScope,
    source,
    variables,
  }: {
    state: BuilderState;
    blockInstanceId: string;
    renderScope: string;
    source: ContentBlockSource;
    variables?: Readonly<Record<string, unknown>>;
  }) => {
    const inspection = await inspect({
      state,
      blockInstanceId,
      renderScope,
      source,
      variables,
    });
    return {
      ...prepareContentBlockConnect({
        state,
        blockInstanceId,
        source,
      }),
      inspection,
    };
  };

  const switchSource = async ({
    state,
    blockInstanceId,
    renderScope,
    source,
    variables,
  }: Parameters<typeof connect>[0]) => {
    const inspection = await inspect({
      state,
      blockInstanceId,
      renderScope,
      source,
      variables,
    });
    return {
      ...prepareContentBlockSwitch({
        state,
        blockInstanceId,
        source,
      }),
      inspection,
    };
  };

  const disconnect = ({
    state,
    blockInstanceId,
  }: {
    state: BuilderState;
    blockInstanceId: string;
  }) =>
    prepareContentBlockDisconnect({
      state,
      blockInstanceId,
    });

  const prepareSourceUpdate = async ({
    state,
    blockInstanceId,
    renderScope,
    variables,
    update,
  }: {
    state: BuilderState;
    blockInstanceId: string;
    renderScope: string;
    variables?: Readonly<Record<string, unknown>>;
    update: (source: string) => string | Promise<string>;
  }) => {
    const configured = requireConfiguredSource({ state, blockInstanceId });
    const { state: opened, identity } = await open({
      source: configured,
      state,
      blockInstanceId,
      renderScope,
      variables,
    });
    const nextSource = await update(opened.source);
    const materialized = await materializeMdxSource({
      source: nextSource,
      identity,
      data: getData(state),
      metas,
      projectId,
    });
    return {
      state: opened,
      identity,
      source: nextSource,
      diagnostics: materialized.diagnostics,
    };
  };

  const updateSource = async (
    input: Parameters<typeof prepareSourceUpdate>[0]
  ) => {
    const prepared = await prepareSourceUpdate(input);
    session.save(prepared.identity.assetId, prepared.source);
    const saved = await session.flush(prepared.identity.assetId);
    return {
      state: saved,
      source: saved.source,
      diagnostics: prepared.diagnostics,
    };
  };

  const reload = async ({
    state,
    blockInstanceId,
    renderScope,
    variables,
  }: Omit<Parameters<typeof updateSource>[0], "update">) => {
    const source = requireConfiguredSource({ state, blockInstanceId });
    const opened = await open({
      source,
      state,
      blockInstanceId,
      renderScope,
      variables,
    });
    return session.reload(opened.identity.assetId);
  };

  const migrateTemplateReferences = async ({
    assetIds,
    migration,
    confirmationToken,
    dryRun = false,
  }: {
    assetIds: readonly string[];
    migration: MdxTemplateMigration;
    confirmationToken?: string;
    dryRun?: boolean;
  }) => {
    const files = await Promise.all(
      assetIds.map(async (assetId) => {
        const opened = await session.open(assetId);
        if (
          opened.asset.projectId !== projectId ||
          isMdxFileAsset(opened.asset) === false
        ) {
          throw new Error(`Asset "${assetId}" is not an MDX Asset`);
        }
        return {
          assetId,
          revision: createAssetContentRevision({
            storageName: opened.asset.name,
            updatedAt: opened.asset.updatedAt ?? opened.asset.createdAt,
            size: opened.asset.size,
          }),
          contentRef: opened.asset.name,
          source: opened.source,
        };
      })
    );
    const plan = await planMdxTemplateMigration({
      projectId,
      migration,
      files,
      selectionAssetIds: assetIds,
    });
    if (
      dryRun ||
      (await validateMdxTemplateMigrationConfirmation({
        projectId,
        plan,
        confirmationToken,
      })) === false
    ) {
      return plan;
    }
    const results = [];
    for (const file of plan.files) {
      if (file.changed === false) {
        results.push({ ...file, status: "unchanged" as const });
        continue;
      }
      try {
        session.save(file.assetId, file.source);
        await session.flush(file.assetId);
        results.push({ ...file, status: "updated" as const });
      } catch (error) {
        results.push({
          ...file,
          status: "failed" as const,
          diagnostics: [
            ...file.diagnostics,
            {
              code: "asset-write-failed" as const,
              assetId: file.assetId,
              contentRef: file.contentRef,
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to update MDX Asset",
            },
          ],
        });
      }
    }
    return {
      status: results.some(({ status }) => status === "failed")
        ? ("partial" as const)
        : ("complete" as const),
      migration,
      files: results,
      updateCount: results.reduce((sum, file) => sum + file.updateCount, 0),
      omissionCount: results.reduce((sum, file) => sum + file.omissionCount, 0),
      changedFileCount: results.filter(({ status }) => status === "updated")
        .length,
    };
  };

  return {
    inspect,
    connect,
    switchSource,
    disconnect,
    editSource: (
      input: Omit<Parameters<typeof updateSource>[0], "update"> & {
        source: string;
      }
    ) => updateSource({ ...input, update: () => input.source }),
    previewSource: (
      input: Omit<Parameters<typeof prepareSourceUpdate>[0], "update"> & {
        source: string;
      }
    ) => prepareSourceUpdate({ ...input, update: () => input.source }),
    updateFrontmatter: (
      input: Omit<Parameters<typeof updateSource>[0], "update"> & {
        properties: Readonly<Record<string, unknown>>;
      }
    ) =>
      updateSource({
        ...input,
        update: (source) =>
          replaceMdxFrontmatter({ source, properties: input.properties }),
      }),
    previewFrontmatter: (
      input: Omit<Parameters<typeof prepareSourceUpdate>[0], "update"> & {
        properties: Readonly<Record<string, unknown>>;
      }
    ) =>
      prepareSourceUpdate({
        ...input,
        update: (source) =>
          replaceMdxFrontmatter({ source, properties: input.properties }),
      }),
    reload,
    migrateTemplateReferences,
  };
};

export type ContentBlockApplication = ReturnType<
  typeof createContentBlockApplication
>;
