import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import warnOnce from "warn-once";
import type { Asset } from "@webstudio-is/sdk";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { restAssetsUploadPath, restAssetsPath } from "~/shared/router-utils";
import type {
  AssetContainer,
  UploadedAssetContainer,
  UploadingAssetContainer,
} from "./types";
import type { ActionData } from "~/builder/shared/assets";
import { $assets, $authToken, $project } from "~/shared/nano-states";
import { atom, computed } from "nanostores";
import { serverSyncStore } from "~/shared/sync";
import type { Simplify } from "type-fest";
import { extractImageNameAndMimeTypeFromUrl } from "./image-formats";

export const deleteAssets = (assetIds: Asset["id"][]) => {
  serverSyncStore.createTransaction([$assets], (assets) => {
    for (const assetId of assetIds) {
      assets.delete(assetId);
    }
  });
};

const setAsset = (asset: Asset) => {
  serverSyncStore.createTransaction([$assets], (assets) => {
    assets.set(asset.id, asset);
  });
};

type UploadingFileData = Simplify<
  {
    // common props
    assetId: string;
    type: AssetType;
    objectURL: string;
  } & (
    | {
        source: "file";
        file: File;
      }
    | {
        source: "url";
        url: URL;
      }
  )
>;

const getFilesData = (
  type: AssetType,
  files: File[],
  urls: URL[]
): UploadingFileData[] => {
  return [
    ...files.map((file) => ({
      source: "file" as const,
      assetId: crypto.randomUUID(),
      type,
      file,
      objectURL: URL.createObjectURL(file),
    })),
    ...urls.map((url) => ({
      source: "url" as const,
      assetId: crypto.randomUUID(),
      type,
      url,
      objectURL: url.href,
    })),
  ];
};

const $uploadingFilesDataStore = atom<UploadingFileData[]>([]);

const addUploadingFilesData = (filesData: UploadingFileData[]) => {
  const uploadingFilesData = $uploadingFilesDataStore.get();
  $uploadingFilesDataStore.set([...uploadingFilesData, ...filesData]);
};

const deleteUploadingFileData = (id: UploadingFileData["assetId"]) => {
  const uploadingFilesData = $uploadingFilesDataStore.get();
  $uploadingFilesDataStore.set(
    uploadingFilesData.filter((fileData) => fileData.assetId !== id)
  );
};

const $assetContainers = computed(
  [$assets, $uploadingFilesDataStore],
  (assets, uploadingFilesData) => {
    const uploadingContainers: UploadingAssetContainer[] = [];

    for (const uploadingFile of uploadingFilesData) {
      const name =
        uploadingFile.source === "file"
          ? uploadingFile.file.name
          : uploadingFile.url.href;

      const format =
        uploadingFile.source === "file"
          ? uploadingFile.file.type.split("/")[1]
          : extractImageNameAndMimeTypeFromUrl(uploadingFile.url)[0];

      uploadingContainers.push({
        status: "uploading",
        objectURL: uploadingFile.objectURL,
        asset: {
          id: uploadingFile.assetId,
          type: uploadingFile.type,

          format,

          name: name,
          description: name,
        },
      });
    }

    const uploadedContainers: UploadedAssetContainer[] = [];

    for (const asset of assets.values()) {
      uploadedContainers.push({
        status: "uploaded",
        asset,
      });
    }

    // sort newest uploaded assets first
    uploadedContainers.sort(
      (leftContainer, rightContainer) =>
        new Date(rightContainer.asset.createdAt).getTime() -
        new Date(leftContainer.asset.createdAt).getTime()
    );

    // put uploading assets first
    return [...uploadingContainers, ...uploadedContainers];
  }
);

export type UploadData = ActionData;

const uploadAsset = async ({
  authToken,
  projectId,
  fileOrUrl,
  onCompleted,
  onError,
}: {
  authToken: undefined | string;
  projectId: string;
  fileOrUrl: File | URL;
  onCompleted: (data: UploadData) => void;
  onError: (error: string) => void;
}) => {
  try {
    const mimeType =
      fileOrUrl instanceof File
        ? fileOrUrl.type
        : extractImageNameAndMimeTypeFromUrl(fileOrUrl)[0];

    const fileName =
      fileOrUrl instanceof File
        ? fileOrUrl.name
        : extractImageNameAndMimeTypeFromUrl(fileOrUrl)[1];

    const metaFormData = new FormData();
    metaFormData.append("projectId", projectId);
    metaFormData.append("type", mimeType);
    // sanitizeS3Key here is just because of https://github.com/remix-run/remix/issues/4443
    // should be removed after fix
    metaFormData.append("filename", sanitizeS3Key(fileName));
    const metaResponse = await fetch(restAssetsPath({ authToken }), {
      method: "POST",
      body: metaFormData,
    });
    const metaData: { name: string } | { errors: string } =
      await metaResponse.json();
    if ("errors" in metaData) {
      throw Error(metaData.errors);
    }

    const body =
      fileOrUrl instanceof File
        ? fileOrUrl
        : JSON.stringify({ url: fileOrUrl.href });

    const headers = new Headers();

    if (fileOrUrl instanceof URL) {
      headers.set("Content-Type", "application/json");
    }

    const uploadResponse = await fetch(
      restAssetsUploadPath({ name: metaData.name }),
      {
        method: "POST",
        body,
        headers,
      }
    );

    const uploadData: UploadData = await uploadResponse.json();
    if ("errors" in uploadData) {
      throw Error(uploadData.errors);
    }
    onCompleted(uploadData);
  } catch (error) {
    if (error instanceof Error) {
      onError(error.message);
    }
  }
};

const handleAfterSubmit = (assetId: string, data: UploadData) => {
  warnOnce(
    data.uploadedAssets?.length !== 1,
    "Expected exactly 1 uploaded asset"
  );

  const uploadedAsset = data.uploadedAssets?.[0];

  if (uploadedAsset === undefined) {
    warnOnce(true, "An uploaded asset is undefined");
    toast.error("Could not upload an asset");
    deleteAssets([assetId]);
    return;
  }

  // update store with new asset and set current id
  setAsset({ ...uploadedAsset, id: assetId });
};

export const uploadAssets = async (
  type: AssetType,
  files: File[],
  urls: URL[] = []
) => {
  const projectId = $project.get()?.id;
  const authToken = $authToken.get();
  if (projectId === undefined) {
    return;
  }

  const filesData = getFilesData(type, files, urls);

  addUploadingFilesData(filesData);

  for (const fileData of filesData) {
    const assetId = fileData.assetId;

    await uploadAsset({
      authToken,
      projectId,
      fileOrUrl: fileData.source === "file" ? fileData.file : fileData.url,
      onCompleted: (data) => {
        URL.revokeObjectURL(fileData.objectURL);
        deleteUploadingFileData(assetId);
        handleAfterSubmit(assetId, data);
      },
      onError: (error) => {
        deleteAssets([assetId]);
        deleteUploadingFileData(assetId);
        toast.error(error);
      },
    });
  }
};

const filterByType = (assetContainers: AssetContainer[], type: AssetType) => {
  return assetContainers.filter((assetContainer) => {
    return assetContainer.asset.type === type;
  });
};

export const useAssets = (type: AssetType) => {
  const assetContainers = useStore($assetContainers);

  const assetsByType = useMemo(() => {
    return filterByType(assetContainers, type);
  }, [assetContainers, type]);

  return {
    /**
     * Already loaded assets or assets that are being uploaded
     */
    assetContainers: assetsByType,
  };
};
