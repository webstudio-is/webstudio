import {
  ContentBlockSourceAuthorityRequiredError,
  builderRuntimeContext,
  computeExpression,
  createMdxAssetEditingSession,
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
  type ContentBlockSourceAuthority,
  type ContentStorageChange,
  type MdxAssetEditingSessionState,
} from "@webstudio-is/project-build/runtime";
import {
  contentBlockSourceProp,
  parseContentBlockSourceProp,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import {
  createBuilderHttpAssetContentRepository,
  getMdxContentPersistencePlan,
} from "~/builder/shared/assets/mdx-content-repository";
import {
  $authPermit,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import {
  $assets,
  $project,
  readBuilderStateStores,
} from "~/shared/sync/data-stores";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";

export type ContentBlockSourceControllerResult =
  | Readonly<{
      status: "applied";
      state?: MdxAssetEditingSessionState;
    }>
  | Readonly<{ status: "requires-authority" }>
  | Readonly<{ status: "blocked"; message: string }>;

type ContentBlockSourceControllerDependencies = Readonly<{
  blockInstanceId: string;
  renderScope: string;
  projectId: string;
  session: ReturnType<typeof createMdxAssetEditingSession>;
  getState: typeof readBuilderStateStores;
  commitProjectPayload: (
    payload: Parameters<
      typeof createTransactionFromBuilderPatchPayload
    >[0]["payload"]
  ) => void;
  invalidateAssets: () => void;
}>;

const getConfiguredSource = ({
  state,
  blockInstanceId,
}: {
  state: ReturnType<typeof readBuilderStateStores>;
  blockInstanceId: string;
}) => {
  const sourceProps = Array.from(state.props.values()).filter(
    (prop) =>
      prop.instanceId === blockInstanceId &&
      prop.name === contentBlockSourceProp
  );
  return sourceProps.length === 1
    ? parseContentBlockSourceProp(sourceProps[0])
    : undefined;
};

const blockedMessage = {
  "atomic-project-and-asset-unavailable":
    "Replacing file content while changing the Content Block source requires atomic project and Asset persistence, which is not available yet.",
  "atomic-multiple-assets-unavailable":
    "This change requires atomic updates to multiple Assets, which are not available yet.",
} as const;

const getStorageSaveError = (state: MdxAssetEditingSessionState) =>
  state.status === "conflicting"
    ? "The MDX file changed remotely. Reload it before saving."
    : "The MDX file could not be saved.";

const hasSameBuilderState = (
  left: ReturnType<typeof readBuilderStateStores>,
  right: ReturnType<typeof readBuilderStateStores>
) =>
  Object.keys(left).every(
    (namespace) =>
      left[namespace as keyof typeof left] ===
      right[namespace as keyof typeof right]
  );

export const createContentBlockSourceController = ({
  blockInstanceId,
  renderScope,
  projectId,
  session,
  getState,
  commitProjectPayload,
  invalidateAssets: invalidate,
}: ContentBlockSourceControllerDependencies) => {
  let currentSessionKey: string | undefined;
  let openVersion = 0;
  let disposed = false;

  const open = async (source: ContentBlockSource) => {
    const version = ++openVersion;
    const state = await session.open({
      blockInstanceId,
      source,
      renderScope,
      state: getState(),
      projectId,
    });
    if (
      disposed === false &&
      version === openVersion &&
      "key" in state &&
      "root" in state
    ) {
      currentSessionKey = state.key;
    }
    return state;
  };

  const discardBlockedPreparation = (
    state: MdxAssetEditingSessionState | undefined
  ) => {
    if (state?.status === "pending") {
      session.cancel(state.key);
    }
  };

  const applyPrepared = async (
    prepared: Awaited<
      ReturnType<
        | typeof prepareContentBlockConnect
        | typeof prepareContentBlockDisconnect
        | typeof prepareContentBlockSwitch
      >
    >,
    expectedState: ReturnType<typeof readBuilderStateStores>
  ): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      discardBlockedPreparation(prepared.sourceState);
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const plan = getMdxContentPersistencePlan(prepared);
    if (plan.status === "blocked") {
      discardBlockedPreparation(prepared.sourceState);
      return { status: "blocked", message: blockedMessage[plan.reason] };
    }
    if (plan.mode === "single-asset") {
      const sourceState = prepared.sourceState;
      if (sourceState === undefined || !("key" in sourceState)) {
        return { status: "blocked", message: "The MDX Asset is not loaded." };
      }
      const saved = await session.flush(sourceState.key);
      if (saved.status !== "saved") {
        return {
          status: "blocked",
          message: getStorageSaveError(saved),
        };
      }
      currentSessionKey = saved.key;
      invalidate();
      return { status: "applied", state: saved };
    }
    if (plan.mode === "project") {
      if (hasSameBuilderState(expectedState, getState()) === false) {
        return {
          status: "blocked",
          message: "The project changed while preparing this source update.",
        };
      }
      commitProjectPayload([...prepared.projectPayload]);
    }
    if (prepared.action === "disconnect") {
      currentSessionKey = undefined;
    } else if (
      prepared.sourceState !== undefined &&
      "key" in prepared.sourceState
    ) {
      currentSessionKey = prepared.sourceState.key;
    }
    return { status: "applied", state: prepared.sourceState };
  };

  const requestSource = async ({
    source,
    authority,
  }: {
    source: ContentBlockSource;
    authority?: ContentBlockSourceAuthority;
  }): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const state = getState();
    const configuredSource = getConfiguredSource({ state, blockInstanceId });
    try {
      if (configuredSource === undefined) {
        return await applyPrepared(
          await prepareContentBlockConnect({
            state,
            blockInstanceId,
            source,
            renderScope,
            projectId,
            authority,
            session,
            context: builderRuntimeContext,
          }),
          state
        );
      }
      if (currentSessionKey === undefined) {
        const current = await open(configuredSource);
        if (!("key" in current) || !("root" in current)) {
          return {
            status: "blocked",
            message: "The current MDX file could not be loaded.",
          };
        }
      }
      const currentKey = currentSessionKey;
      if (currentKey === undefined) {
        return { status: "blocked", message: "The MDX Asset is not loaded." };
      }
      return await applyPrepared(
        await prepareContentBlockSwitch({
          state,
          blockInstanceId,
          currentSessionKey: currentKey,
          source,
          renderScope,
          projectId,
          authority,
          session,
          context: builderRuntimeContext,
        }),
        state
      );
    } catch (error) {
      if (error instanceof ContentBlockSourceAuthorityRequiredError) {
        return { status: "requires-authority" };
      }
      throw error;
    }
  };

  const disconnect = async (): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const state = getState();
    const source = getConfiguredSource({ state, blockInstanceId });
    if (source !== undefined && currentSessionKey === undefined) {
      const current = await open(source);
      if (!("key" in current) || !("root" in current)) {
        return {
          status: "blocked",
          message: "The current MDX file could not be loaded.",
        };
      }
    }
    return await applyPrepared(
      await prepareContentBlockDisconnect({
        state,
        blockInstanceId,
        currentSessionKey,
        renderScope,
        session,
        context: builderRuntimeContext,
      }),
      state
    );
  };

  const saveStorageChanges = async (
    changes: readonly ContentStorageChange[]
  ): Promise<ContentBlockSourceControllerResult> => {
    if (disposed || currentSessionKey === undefined) {
      return { status: "blocked", message: "The MDX Asset is not loaded." };
    }
    const key = currentSessionKey;
    const pending = await session.queueSave({
      key,
      changes,
    });
    if (pending.status !== "pending" && pending.status !== "saved") {
      return {
        status: "blocked",
        message: getStorageSaveError(pending),
      };
    }
    const saved =
      pending.status === "pending" ? await session.flush(key) : pending;
    if (saved.status !== "saved") {
      return {
        status: "blocked",
        message: getStorageSaveError(saved),
      };
    }
    if (disposed === false && currentSessionKey === key) {
      currentSessionKey = saved.key;
    }
    invalidate();
    return { status: "applied", state: saved };
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    openVersion += 1;
    currentSessionKey = undefined;
    for (const state of session.list()) {
      if (state.status === "pending") {
        session.cancel(state.key);
      }
    }
  };

  return { open, requestSource, disconnect, saveStorageChanges, dispose };
};

export const createBuilderContentBlockSourceController = ({
  blockInstanceId,
  renderScope,
  projectId,
}: {
  blockInstanceId: string;
  renderScope: string;
  projectId: string;
}) => {
  const repository = createBuilderHttpAssetContentRepository({ projectId });
  const session = createMdxAssetEditingSession({
    repository,
    authorizeAsset: ({ assetId, operation, identity }) => {
      const project = $project.get();
      const asset = $assets.get().get(assetId);
      return (
        project?.id === projectId &&
        asset?.projectId === projectId &&
        (identity === undefined || identity.assetId === assetId) &&
        (operation === "read" || $authPermit.get() !== "view")
      );
    },
    resolveExpressionAssetId: ({ expression, renderScope: scope }) => {
      const variables = $variableValuesByInstanceSelector.get().get(scope);
      const value = computeExpression(expression, variables ?? new Map());
      return typeof value === "string" && value !== "" ? value : undefined;
    },
  });
  return createContentBlockSourceController({
    blockInstanceId,
    renderScope,
    projectId,
    session,
    getState: readBuilderStateStores,
    commitProjectPayload: (payload) =>
      createTransactionFromBuilderPatchPayload({
        data: getWebstudioData(),
        payload,
      }),
    invalidateAssets,
  });
};
