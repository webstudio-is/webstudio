import type { Asset } from "./schema/assets";
import { getAssetTextEditorLanguage, toRuntimeAsset } from "./assets";

export const maxAssetResourceContentBytes = 256 * 1024;
export const maxAssetResourceContentItems = 20;

export type AssetResourceItem = ReturnType<typeof toAssetResourceItem> & {
  content?: unknown;
  contentError?: string;
};

export const toAssetResourceItem = (asset: Asset, origin: string) => ({
  ...toRuntimeAsset(asset, origin),
  name: asset.name,
  filename: asset.filename ?? asset.name,
  description: asset.description ?? undefined,
  folderId: asset.folderId,
  type: asset.type,
  format: asset.format,
  size: asset.size,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
});

const getValues = (searchParams: URLSearchParams, name: string) =>
  searchParams
    .getAll(name)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

const matchesAssetResourceQuery = (
  asset: AssetResourceItem,
  searchParams: URLSearchParams
) => {
  const filenames = getValues(searchParams, "filename");
  const extensions = getValues(searchParams, "extension").map((extension) =>
    extension.startsWith(".") ? extension.slice(1) : extension
  );
  const normalizedName = asset.filename.toLowerCase();
  return (
    (filenames.length === 0 ||
      filenames.some((filename) => normalizedName.includes(filename))) &&
    (extensions.length === 0 || extensions.includes(asset.format.toLowerCase()))
  );
};

export const filterAssetResource = (
  assets: Record<string, AssetResourceItem>,
  searchParams: URLSearchParams
) =>
  Object.fromEntries(
    Object.entries(assets).filter(([, asset]) =>
      matchesAssetResourceQuery(asset, searchParams)
    )
  );

const getAssetContent = async ({
  asset,
  fetchAsset,
}: {
  asset: AssetResourceItem;
  fetchAsset: (url: string) => Promise<Response>;
}) => {
  if (getAssetTextEditorLanguage(asset) === undefined) {
    return { contentError: "Asset format is not editable text." };
  }
  if (asset.size > maxAssetResourceContentBytes) {
    return {
      contentError: `Asset content exceeds ${maxAssetResourceContentBytes} bytes.`,
    };
  }
  try {
    const response = await fetchAsset(asset.url);
    if (response.ok === false) {
      return { contentError: `Asset request failed with ${response.status}.` };
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maxAssetResourceContentBytes) {
      return {
        contentError: `Asset content exceeds ${maxAssetResourceContentBytes} bytes.`,
      };
    }
    const content = new TextDecoder().decode(bytes);
    if (asset.format.toLowerCase() !== "json") {
      return { content };
    }
    try {
      return { content: JSON.parse(content) as unknown };
    } catch {
      return { content, contentError: "Asset contains invalid JSON." };
    }
  } catch (error) {
    return {
      contentError:
        error instanceof Error ? error.message : "Asset request failed.",
    };
  }
};

export const loadAssetResource = async ({
  assets,
  requestUrl,
  fetchAsset,
}: {
  assets: Record<string, AssetResourceItem>;
  requestUrl: string;
  fetchAsset: (url: string) => Promise<Response>;
}) => {
  const searchParams = new URL(requestUrl, "https://webstudio.local")
    .searchParams;
  const filtered = filterAssetResource(assets, searchParams);
  if (searchParams.get("include") !== "content") {
    return filtered;
  }
  const entries = Object.entries(filtered);
  if (entries.length > maxAssetResourceContentItems) {
    throw new Error(
      `Asset content queries support at most ${maxAssetResourceContentItems} matching assets.`
    );
  }
  return Object.fromEntries(
    await Promise.all(
      entries.map(async ([id, asset]) => [
        id,
        { ...asset, ...(await getAssetContent({ asset, fetchAsset })) },
      ])
    )
  );
};
