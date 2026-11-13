import { getAssetUrl, type WebstudioFragment } from "@webstudio-is/sdk";
import { importFragmentAssets } from "@webstudio-is/project-build/runtime";
import type { builderApi } from "../builder-api";

const assetTransferError =
  "Could not transfer assets from the source Webstudio deployment. Make sure it is reachable and try again.";

export const transferFragmentAssets = async ({
  sourceOrigin,
  projectId,
  fragments,
  importAssets,
}: {
  sourceOrigin: string | undefined;
  projectId: string;
  fragments: WebstudioFragment[];
  importAssets: typeof builderApi.importAssets;
}) => {
  try {
    const result = await importFragmentAssets(fragments, (assets) =>
      importAssets(
        projectId,
        assets.map((asset) => ({
          asset,
          url:
            sourceOrigin === undefined
              ? undefined
              : getAssetUrl(asset, sourceOrigin).href,
        }))
      )
    );
    return { success: true, ...result } as const;
  } catch {
    return { success: false, error: assetTransferError } as const;
  }
};
