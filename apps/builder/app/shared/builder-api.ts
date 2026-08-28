import { createRecursiveProxy } from "@trpc/server/shared";
import invariant from "tiny-invariant";
import { toast } from "@webstudio-is/design-system";
import {
  importAssets,
  uploadAssets,
} from "~/builder/shared/assets/upload-assets";
import { showTokenConflictDialog } from "./token-conflict-dialog";
import { showRootStyleConflictDialog } from "./root-style-conflict-dialog";
import { showDesignTokenImportDialog } from "./design-token-import-dialog";
import { fetch as builderFetch } from "./fetch.client";
import { $assets, $project } from "./sync/data-stores";
import { $authPermit } from "./nano-states";
import {
  createAssetContentBridge,
  initAssetContentBridge,
} from "./asset-content-bridge.client";
import { requireBuilderReload } from "./sync/reload-required";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import { createHttpAssetContentRepository } from "~/builder/shared/assets/mdx-content-repository";
import { $authToken } from "./nano-states";
import { isMdxFileAsset, type Asset } from "@webstudio-is/sdk";
import { createTransactionFromBuilderPatchPayload } from "./sync/builder-patch";
import { getWebstudioData } from "./instance-utils/data";
import { invalidateAssets } from "./resources";
import { onNextTransactionComplete } from "./sync/project-queue";
import { disposeExternalContentProject } from "./external-content-roots";

const apiWindowNamespace = "__webstudio__$__builderApi";

const isContentDocumentAsset = (asset: Pick<Asset, "type" | "format">) =>
  asset.type === "file" &&
  ["md", "mdx", "json"].includes(asset.format.toLowerCase());

const canAccessAssetContent = ({
  asset,
  operation,
  canWrite,
}: {
  asset: Pick<Asset, "type" | "format">;
  operation: "read" | "write";
  canWrite: boolean;
}) =>
  operation === "read"
    ? isContentDocumentAsset(asset)
    : canWrite && isMdxFileAsset(asset);

type ToastHandler = (message: string) => void;

const isSafeMode = (() => {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("safemode") === "true";
})();

const authorizeAssetContent = ({
  projectId,
  assetId,
  operation,
}: {
  projectId: string;
  assetId: string;
  operation: "read" | "write";
}) => {
  const asset = $assets.get().get(assetId);
  return (
    $project.get()?.id === projectId &&
    asset?.projectId === projectId &&
    asset !== undefined &&
    canAccessAssetContent({
      asset,
      operation,
      canWrite: $authPermit.get() !== "view",
    })
  );
};

const _builderApi = {
  isInitialized: () => true,
  isSafeMode: () => isSafeMode,
  toast: {
    info: toast.info as ToastHandler,
    warn: toast.warn as ToastHandler,
    error: toast.error as ToastHandler,
    success: toast.success as ToastHandler,
  },
  uploadImages: async (srcs: string[]) => {
    const urlToIds = await uploadAssets(
      "image",
      srcs.map((src) => new URL(src))
    );

    return new Map([...urlToIds.entries()].map(([url, id]) => [url.href, id]));
  },
  importAssets,
  showDesignTokenImportDialog,
  showTokenConflictDialog,
  showRootStyleConflictDialog,
};

declare global {
  interface Window {
    [apiWindowNamespace]: typeof _builderApi;
  }
}

const isInTop = () => {
  try {
    return window.self === window.top;
  } catch {
    return true;
  }
};

const getTopApi = () => {
  if (isInTop()) {
    // Inside the iframe, use the local window.api
    return _builderApi;
  } else {
    // Find first iframe with the API
    invariant(window.top);
    return window.top[apiWindowNamespace];
  }
};

const isKeyOf = <T>(key: unknown, obj: T): key is keyof T => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return key in obj;
};

/**
 * Forwards the call from the builder to the iframe, invoking the original API in the iframe.
 */
export const builderApi = createRecursiveProxy((options) => {
  const api = getTopApi();

  if (api == null) {
    if (
      options.path.join(".") ===
      ("isInitialized" satisfies keyof typeof _builderApi)
    ) {
      return false;
    }

    console.warn(
      `API not found in the iframe, skipping ${options.path.join(".")} call, iframe probably not loaded yet`
    );
    return null;
  }

  let currentMethod = api as unknown;

  for (const key of options.path) {
    invariant(
      isKeyOf(key, currentMethod),
      `API method ${options.path.join(".")} not found`
    );
    invariant(typeof currentMethod === "object");
    invariant(currentMethod != null);

    currentMethod = currentMethod[key];
  }

  invariant(
    typeof currentMethod === "function",
    `API method ${options.path.join(".")} is not a function`
  );

  return currentMethod.call(null, ...options.args);
}) as typeof _builderApi;

/**
 * Initializes the builder API in the window. Must be called in the builder context.
 */
export const initBuilderApi = () => {
  if (isInTop()) {
    window[apiWindowNamespace] = _builderApi;
    type ContentSessionEntry = {
      projectId: string;
      session: ReturnType<typeof createAssetContentSession>;
      active: boolean;
      retiring?: Promise<void>;
    };
    const contentSessions = new Map<string, ContentSessionEntry>();
    let activeContentSession: ContentSessionEntry | undefined;
    const retireContentSession = (contentSession: ContentSessionEntry) => {
      contentSession.active = false;
      if (activeContentSession === contentSession) {
        activeContentSession = undefined;
      }
      if (contentSession.retiring !== undefined) {
        return;
      }
      const retiring = disposeExternalContentProject({
        projectId: contentSession.projectId,
        session: contentSession.session,
        shouldCleanup: () => contentSession.active === false,
      })
        .then((cleanedUp) => {
          if (cleanedUp === false || contentSession.active) {
            return;
          }
          if (
            contentSessions.get(contentSession.projectId) === contentSession
          ) {
            contentSessions.delete(contentSession.projectId);
          }
          contentSession.session.dispose();
        })
        .catch(() => {
          toast.error(
            "Some MDX changes could not be saved. Return to this project to retry."
          );
        })
        .finally(() => {
          if (contentSession.retiring === retiring) {
            contentSession.retiring = undefined;
          }
        });
      contentSession.retiring = retiring;
    };
    const unlistenProject = $project.listen((project) => {
      if (
        activeContentSession !== undefined &&
        activeContentSession.projectId !== project?.id
      ) {
        retireContentSession(activeContentSession);
      }
    });
    initAssetContentBridge(
      createAssetContentBridge({
        origin: window.location.origin,
        request: (input, init) => builderFetch(input, init),
        authorize: authorizeAssetContent,
        requireReload: (error) => requireBuilderReload({ error }),
        getContentSession: (projectId) => {
          if ($project.get()?.id !== projectId) {
            throw new Error("Asset content session belongs to another project");
          }
          const existing = contentSessions.get(projectId);
          if (existing !== undefined) {
            existing.active = true;
            activeContentSession = existing;
            return existing.session;
          }
          if (activeContentSession !== undefined) {
            retireContentSession(activeContentSession);
          }
          let sessionAuthToken = $authToken.get();
          let canWrite = $authPermit.get() !== "view";
          const authorizedReadAssetIds = new Set(
            Array.from($assets.get().values())
              .filter(
                (asset) =>
                  asset.projectId === projectId &&
                  canAccessAssetContent({
                    asset,
                    operation: "read",
                    canWrite: true,
                  })
              )
              .map((asset) => asset.id)
          );
          const authorizedWriteAssetIds = new Set(
            Array.from($assets.get().values())
              .filter(
                (asset) =>
                  asset.projectId === projectId &&
                  canAccessAssetContent({
                    asset,
                    operation: "write",
                    canWrite: true,
                  })
              )
              .map((asset) => asset.id)
          );
          const session = createAssetContentSession({
            repository: createHttpAssetContentRepository({
              projectId,
              origin: window.location.origin,
              authToken: () => {
                if ($project.get()?.id === projectId) {
                  sessionAuthToken = $authToken.get();
                }
                return sessionAuthToken;
              },
              request: (input, init) => builderFetch(input, init),
            }),
            authorize: ({ assetId, operation }) => {
              if ($project.get()?.id === projectId) {
                canWrite = $authPermit.get() !== "view";
                const asset = $assets.get().get(assetId);
                if (
                  asset?.projectId === projectId &&
                  canAccessAssetContent({
                    asset,
                    operation: "read",
                    canWrite: true,
                  })
                ) {
                  authorizedReadAssetIds.add(assetId);
                }
                if (
                  asset?.projectId === projectId &&
                  canAccessAssetContent({
                    asset,
                    operation: "write",
                    canWrite: true,
                  })
                ) {
                  authorizedWriteAssetIds.add(assetId);
                }
              }
              return (
                (operation === "read"
                  ? authorizedReadAssetIds
                  : authorizedWriteAssetIds
                ).has(assetId) &&
                (operation === "read" || canWrite)
              );
            },
          });
          session.subscribe((_assetId, state) => {
            if (state.status !== "saved" || $project.get()?.id !== projectId) {
              return;
            }
            const current = $assets.get().get(state.asset.id);
            if (current === undefined) {
              return;
            }
            if (
              current.name === state.asset.name &&
              current.size === state.asset.size &&
              current.updatedAt === state.asset.updatedAt
            ) {
              return;
            }
            createTransactionFromBuilderPatchPayload({
              data: getWebstudioData(),
              payload: [
                {
                  namespace: "assets",
                  patches: [
                    {
                      op: "replace",
                      path: [current.id],
                      value: { ...current, ...state.asset },
                    },
                  ],
                },
              ],
            });
            onNextTransactionComplete(invalidateAssets);
          });
          activeContentSession = { projectId, session, active: true };
          contentSessions.set(projectId, activeContentSession);
          return session;
        },
      })
    );
    return () => {
      unlistenProject();
      for (const contentSession of contentSessions.values()) {
        retireContentSession(contentSession);
      }
    };
  }
  return () => {};
};

export const __testing__ = { canAccessAssetContent };
