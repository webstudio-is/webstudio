import { importFragmentAssets } from "@webstudio-is/project-build/runtime";
import {
  parseReusableStyleSourceTransferData,
  parseTokenTransferData,
} from "@webstudio-is/project-build/transfer";
import { getAssetUrl, type Asset } from "@webstudio-is/sdk";

export const prepareMcpStyleSourcePasteData = async ({
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
  upload: (
    asset: Asset,
    data: ArrayBuffer,
    detectMetadata: boolean
  ) => Promise<Asset[]>;
  refreshAssets: () => Promise<unknown>;
}) => {
  const token = parseTokenTransferData(data);
  const parsed = token.owned
    ? token
    : parseReusableStyleSourceTransferData(data);
  const isToken = token.owned;
  if (parsed.valid === false || parsed.data.fragment.assets.length === 0) {
    return [];
  }
  if (dryRun) {
    throw new Error("Asset transfer is unavailable in dry-run mode");
  }
  if (parsed.data.sourceOrigin !== projectOrigin) {
    throw new Error(
      isToken
        ? "Token assets must come from this Webstudio origin"
        : "Style source assets must come from this Webstudio origin"
    );
  }
  const transfer = await importFragmentAssets(
    [parsed.data.fragment],
    async (assets) => {
      const importedAssets = new Map<Asset["id"], Asset>();
      for (const asset of assets) {
        const response = await download(getAssetUrl(asset, projectOrigin));
        if (
          response.ok === false ||
          new URL(response.url).origin !== projectOrigin
        ) {
          throw new Error(
            isToken
              ? "Token asset could not be downloaded"
              : "Style source asset could not be downloaded"
          );
        }
        const uploaded = await upload(
          asset,
          await response.arrayBuffer(),
          true
        );
        const imported = uploaded.find((item) => item.type === asset.type);
        if (imported === undefined) {
          throw new Error(
            isToken
              ? "Token asset could not be uploaded"
              : "Style source asset could not be uploaded"
          );
        }
        importedAssets.set(asset.id, imported);
      }
      return importedAssets;
    }
  );
  await refreshAssets();
  return [...transfer.assetIds];
};
