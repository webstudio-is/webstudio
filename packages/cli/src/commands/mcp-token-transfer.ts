import { remapTokenTransferAssets } from "@webstudio-is/project-build/runtime";
import { parseTokenTransferData } from "@webstudio-is/project-build/transfer";
import { getAssetUrl, type Asset } from "@webstudio-is/sdk";

export const prepareMcpTokenPasteData = async ({
  data,
  projectOrigin,
  dryRun,
  download,
  upload,
  refreshAssets,
}: {
  data: string;
  projectOrigin: string;
  dryRun: boolean;
  download: (url: URL) => Promise<Pick<Response, "ok" | "url" | "arrayBuffer">>;
  upload: (asset: Asset, data: ArrayBuffer) => Promise<Asset[]>;
  refreshAssets: () => Promise<unknown>;
}) => {
  const parsed = parseTokenTransferData(data);
  if (parsed.valid === false || parsed.data.fragment.assets.length === 0) {
    return data;
  }
  if (dryRun) {
    throw new Error("Asset transfer is unavailable in dry-run mode");
  }
  if (parsed.data.sourceOrigin !== projectOrigin) {
    throw new Error("Token assets must come from this Webstudio origin");
  }
  const importedAssets = new Map<Asset["id"], Asset>();
  for (const asset of parsed.data.fragment.assets) {
    const response = await download(getAssetUrl(asset, projectOrigin));
    if (
      response.ok === false ||
      new URL(response.url).origin !== projectOrigin
    ) {
      throw new Error("Token asset could not be downloaded");
    }
    const uploaded = await upload(asset, await response.arrayBuffer());
    const imported = uploaded.find((item) => item.type === asset.type);
    if (imported === undefined) {
      throw new Error("Token asset could not be uploaded");
    }
    importedAssets.set(asset.id, imported);
  }
  await refreshAssets();
  return remapTokenTransferAssets(data, importedAssets);
};
