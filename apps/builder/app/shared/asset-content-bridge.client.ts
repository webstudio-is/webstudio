import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import type { AssetContentSession } from "@webstudio-is/content-engine/asset-content-session";

type AssetContentAuthorization = Readonly<{
  projectId: string;
  assetId: string;
  operation: "read" | "write";
}>;

export type AssetContentBridge = Readonly<{
  request: (input: string, init?: RequestInit) => Promise<Response>;
  authorize: (input: AssetContentAuthorization) => boolean;
  requireReload: (error: string) => void;
  getContentSession?: (projectId: string) => AssetContentSession;
}>;

const namespace = "__webstudio__$__assetContentBridge";

export const createAssetContentBridge = ({
  origin,
  request,
  authorize,
  requireReload,
  getContentSession,
}: {
  origin: string;
  request: (input: string, init?: RequestInit) => Promise<Response>;
  authorize: (input: AssetContentAuthorization) => boolean;
  requireReload: (error: string) => void;
  getContentSession?: (projectId: string) => AssetContentSession;
}): AssetContentBridge => ({
  authorize,
  requireReload,
  getContentSession,
  request: async (input, init) => {
    const url = new URL(input, origin);
    const method = init?.method?.toUpperCase() ?? "GET";
    const [, rest, assets, encodedAssetId, content, ...extraPath] =
      url.pathname.split("/");
    if (
      url.origin !== origin ||
      rest !== "rest" ||
      assets !== "assets" ||
      encodedAssetId === undefined ||
      encodedAssetId === "" ||
      content !== "content" ||
      extraPath.length !== 0 ||
      (method !== "GET" && method !== "PUT")
    ) {
      throw new Error("Only same-origin Asset content requests are allowed");
    }
    let assetId: string;
    try {
      assetId = decodeURIComponent(encodedAssetId);
    } catch {
      throw new Error("Asset content request has an invalid Asset id");
    }
    const projectIds = url.searchParams.getAll("projectId");
    const expectedNames = url.searchParams.getAll("expectedName");
    const allowedQueryNames =
      method === "GET"
        ? new Set(["projectId"])
        : new Set(["projectId", "expectedName"]);
    if (
      projectIds.length !== 1 ||
      projectIds[0] === "" ||
      expectedNames.length !== (method === "PUT" ? 1 : 0) ||
      (method === "PUT" && expectedNames[0] === "") ||
      [...url.searchParams.keys()].some(
        (name) => allowedQueryNames.has(name) === false
      )
    ) {
      throw new Error("Asset content request has invalid parameters");
    }
    const operation = method === "PUT" ? "write" : "read";
    if (
      authorize({
        projectId: projectIds[0],
        assetId,
        operation,
      }) === false
    ) {
      throw new Error("Asset content request is not authorized");
    }
    if (method === "GET") {
      if (init?.body != null) {
        throw new Error("Asset content reads cannot include a body");
      }
      return await request(url.href, init);
    }
    const headers = new Headers(init?.headers);
    if (headers.get("content-type") !== "application/octet-stream") {
      throw new Error("Asset content writes require binary content");
    }
    const body = init?.body;
    const byteLength =
      typeof body === "string"
        ? new TextEncoder().encode(body).byteLength
        : body instanceof Blob
          ? body.size
          : body instanceof ArrayBuffer
            ? body.byteLength
            : ArrayBuffer.isView(body)
              ? body.byteLength
              : undefined;
    if (byteLength === undefined) {
      throw new Error("Asset content writes require a bounded body");
    }
    if (byteLength > contentEngineLimits.hydratedFileBytes) {
      throw new Error("Asset content write exceeds the MDX editing limit");
    }
    return await request(url.href, init);
  },
});

declare global {
  interface Window {
    [namespace]?: AssetContentBridge;
  }
}

export const initAssetContentBridge = (bridge: AssetContentBridge) => {
  window[namespace] = bridge;
};

export const getAssetContentBridge = () => {
  const owner = window[namespace] === undefined ? window.top : window;
  const bridge = owner?.[namespace];
  if (bridge === undefined) {
    throw new Error("Builder Asset content bridge is not available");
  }
  return bridge;
};
