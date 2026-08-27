import type { AssetContentSessionState } from "@webstudio-is/content-engine/asset-content-session";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import type { BuilderState } from "@webstudio-is/project-build/state";
import {
  builderRuntimeContext,
  createContentBlockApplication,
} from "@webstudio-is/project-build/runtime";
import {
  getContentBlockSource,
  isEqualContentBlockSource,
  type ContentBlockDiagnostic,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { $variableValuesByInstanceSelector } from "~/shared/nano-states";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { readBuilderStateStores } from "~/shared/sync/data-stores";
import {
  flushExternalContentAsset,
  openExternalContentAsset,
  reloadExternalContentAsset,
  updateExternalContentAssetSource,
} from "~/shared/external-content-roots";
import {
  parseContentBlockRenderScope,
  resolveContentBlockOccurrenceAssetId,
} from "~/shared/content-block-source-utils";

type MutationResult =
  | Readonly<{ status: "applied"; state?: AssetContentSessionState }>
  | Readonly<{ status: "blocked"; message: string }>;

export type ContentBlockSourceControllerResult =
  | MutationResult
  | Readonly<{
      status: "requires-confirmation";
      diagnostics: readonly ContentBlockDiagnostic[];
    }>;

export const createContentBlockSourceController = ({
  blockInstanceId,
  renderScope,
  projectId,
  getState,
  openAsset,
  reloadAsset,
  resolveExpressionAssetId,
  flushAsset,
  updateAssetSource,
  commitProjectPayload,
  createId,
}: {
  blockInstanceId: string;
  renderScope: string;
  projectId: string;
  getState: () => BuilderState;
  openAsset: (assetId: string) => Promise<AssetContentSessionState>;
  reloadAsset: (
    assetId: string,
    expectedName: string
  ) => Promise<AssetContentSessionState>;
  resolveExpressionAssetId: (
    expression: string,
    renderScope: string
  ) => string | undefined;
  flushAsset: (assetId: string) => Promise<unknown>;
  updateAssetSource: (
    assetId: string,
    update: (source: string) => string | Promise<string>
  ) => Promise<unknown>;
  commitProjectPayload: (payload: readonly BuilderPatchChange[]) => void;
  createId: () => string;
}) => {
  const stagedSources = new Map<string, string>();
  const application = createContentBlockApplication({
    projectId,
    metas: componentMetas,
    createId,
    resolveSourceAssetId: ({ source }) =>
      source.type === "asset"
        ? source.assetId
        : resolveExpressionAssetId(source.value, renderScope),
    session: {
      open: openAsset,
      reload: (assetId, options) => {
        if (options?.expectedName === undefined) {
          throw new Error("The expected Asset name is required for reload");
        }
        return reloadAsset(assetId, options.expectedName);
      },
      save: (assetId, source) => {
        stagedSources.set(assetId, source);
      },
      flush: async (assetId) => {
        const source = stagedSources.get(assetId);
        if (source !== undefined) {
          await updateAssetSource(assetId, () => source);
          stagedSources.delete(assetId);
        }
        await flushAsset(assetId);
        return openAsset(assetId);
      },
    },
  });
  let pending:
    | Readonly<{
        source: ContentBlockSource;
        assetId: string;
        expectedName: string;
        instances: BuilderState["instances"];
        props: BuilderState["props"];
      }>
    | undefined;

  const requestSource = async ({
    source,
    confirmed = false,
  }: {
    source: ContentBlockSource;
    confirmed?: boolean;
  }): Promise<ContentBlockSourceControllerResult> => {
    const state = getState();
    const configured = getContentBlockSource({
      blockInstanceId,
      props: state.props?.values() ?? [],
    });
    if (configured !== undefined) {
      pending = undefined;
      if (isEqualContentBlockSource(configured, source)) {
        const inspection = await application.inspect({
          state,
          blockInstanceId,
          renderScope,
          source,
        });
        return { status: "applied", state: inspection.sessionState };
      }
      const prepared = await application.switchSource({
        state,
        blockInstanceId,
        renderScope,
        source,
      });
      const current = getState();
      if (
        current.instances !== state.instances ||
        current.props !== state.props
      ) {
        return {
          status: "blocked",
          message: "The Content Block changed while the source was loading.",
        };
      }
      commitProjectPayload(prepared.projectPayload);
      return { status: "applied", state: prepared.inspection.sessionState };
    }
    if (confirmed) {
      if (
        pending === undefined ||
        isEqualContentBlockSource(pending.source, source) === false ||
        pending.instances !== state.instances ||
        pending.props !== state.props
      ) {
        pending = undefined;
        return {
          status: "blocked",
          message: "The Content Block changed before connection was confirmed.",
        };
      }
      await reloadAsset(pending.assetId, pending.expectedName);
    }
    const prepared = await application.connect({
      state,
      blockInstanceId,
      renderScope,
      source,
    });
    const current = getState();
    if (
      current.instances !== state.instances ||
      current.props !== state.props
    ) {
      pending = undefined;
      return {
        status: "blocked",
        message: "The Content Block changed while the source was loading.",
      };
    }
    if (prepared.requiresConfirmation && confirmed === false) {
      pending = {
        source,
        assetId: prepared.inspection.identity.assetId,
        expectedName: prepared.inspection.sessionState.asset.name,
        instances: state.instances,
        props: state.props,
      };
      return {
        status: "requires-confirmation",
        diagnostics: prepared.inspection.diagnostics,
      };
    }
    pending = undefined;
    commitProjectPayload(prepared.projectPayload);
    return { status: "applied", state: prepared.inspection.sessionState };
  };

  const disconnect = async (): Promise<MutationResult> => {
    const state = getState();
    const prepared = await application.disconnect({
      state,
      blockInstanceId,
    });
    const current = getState();
    if (
      current.instances !== state.instances ||
      current.props !== state.props
    ) {
      return {
        status: "blocked",
        message: "The Content Block changed while it was disconnecting.",
      };
    }
    commitProjectPayload(prepared.projectPayload);
    return { status: "applied" };
  };

  return {
    requestSource,
    disconnect,
    open: async (source: ContentBlockSource) =>
      (
        await application.inspect({
          state: getState(),
          blockInstanceId,
          renderScope,
          source,
        })
      ).sessionState,
  };
};

export const createBuilderContentBlockSourceController = ({
  blockInstanceId,
  renderScope,
  projectId,
}: {
  blockInstanceId: string;
  renderScope: string;
  projectId: string;
}) =>
  createContentBlockSourceController({
    blockInstanceId,
    renderScope,
    projectId,
    getState: readBuilderStateStores,
    openAsset: (assetId) => openExternalContentAsset({ projectId, assetId }),
    reloadAsset: (assetId, expectedName) =>
      reloadExternalContentAsset({ projectId, assetId, expectedName }),
    resolveExpressionAssetId: (expression, scope) => {
      const instanceSelector = parseContentBlockRenderScope(scope);
      return instanceSelector === undefined
        ? undefined
        : resolveContentBlockOccurrenceAssetId({
            source: { type: "expression", value: expression },
            instanceSelector,
            variableValuesByRenderScope:
              $variableValuesByInstanceSelector.get(),
          });
    },
    flushAsset: (assetId) => flushExternalContentAsset({ projectId, assetId }),
    updateAssetSource: (assetId, update) =>
      updateExternalContentAssetSource({ projectId, assetId, update }),
    commitProjectPayload: (payload) =>
      createTransactionFromBuilderPatchPayload({
        data: getWebstudioData(),
        payload: [...payload],
      }),
    createId: builderRuntimeContext.createId,
  });
