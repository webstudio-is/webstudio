import { createPublishedAssetResourceFetch } from "@webstudio-is/asset-resource";

type AssetBinding = {
  fetch: (request: Request) => Promise<Response>;
};

const getAssetBinding = (context: unknown): AssetBinding | undefined => {
  if (typeof context !== "object" || context === null) {
    return;
  }
  const cloudflare = Reflect.get(context, "cloudflare");
  if (typeof cloudflare !== "object" || cloudflare === null) {
    return;
  }
  const env = Reflect.get(cloudflare, "env");
  if (typeof env !== "object" || env === null) {
    return;
  }
  const assets = Reflect.get(env, "ASSETS");
  if (
    typeof assets === "object" &&
    assets !== null &&
    typeof Reflect.get(assets, "fetch") === "function"
  ) {
    return assets as AssetBinding;
  }
};

export const createGeneratedAssetResourceFetch = async ({
  request,
  context,
  deploymentId,
  manifest,
  fallback,
}: {
  request: Request;
  context: unknown;
  deploymentId: string;
  manifest: Parameters<
    typeof createPublishedAssetResourceFetch
  >[0]["manifest"];
  fallback: typeof fetch;
}): Promise<typeof fetch> => {
  const binding = getAssetBinding(context);
  const fetchAsset = (path: string, init?: RequestInit) => {
    const assetRequest = new Request(new URL(path, request.url), init);
    return binding?.fetch(assetRequest) ?? fetch(assetRequest);
  };
  const cache = globalThis.caches
    ? await caches.open(`webstudio-assets-${deploymentId}`)
    : undefined;
  const fetchResource = createPublishedAssetResourceFetch({
    deploymentId,
    manifest,
    fetchAsset,
    cache,
  });
  return async (input, init) =>
    (await fetchResource(input, init)) ?? fallback(input, init);
};
