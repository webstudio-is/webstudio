import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import warnOnce from "warn-once";
import store from "immerhin";
import { type AssetType, type Asset } from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { restAssetsUploadPath, restAssetsPath } from "~/shared/router-utils";
import type {
  AssetContainer,
  PreviewAsset,
  UploadedAssetContainer,
  UploadingAssetContainer,
} from "./types";
import type { ActionData } from "~/builder/shared/assets";
import {
  assetsStore,
  authTokenStore,
  projectStore,
} from "~/shared/nano-states";
import { atom, computed } from "nanostores";

export const deleteAssets = (assetIds: Asset["id"][]) => {
  store.createTransaction([assetsStore], (assets) => {
    for (const assetId of assetIds) {
      assets.delete(assetId);
    }
  });
};

// stubbed asset is necessary to preserve position of asset
// while uploading and after it is uploaded
// undefined is not stored in db and only persisted in current session
const stubAssets = (ids: Asset["id"][]) => {
  store.createTransaction([assetsStore], (assets) => {
    for (const assetId of ids) {
      assets.set(assetId, undefined);
    }
  });
};

const setAsset = (asset: Asset) => {
  store.createTransaction([assetsStore], (assets) => {
    assets.set(asset.id, asset);
  });
};

type FileData = {
  assetId: string;
  type: AssetType;
  file: File;
  objectURL: string;
};

const getFilesData = (type: AssetType, files: File[]): FileData[] => {
  return files.map((file) => {
    return {
      assetId: crypto.randomUUID(),
      type,
      file,
      objectURL: URL.createObjectURL(file),
    };
  });
};

const uploadingFilesDataStore = atom<FileData[]>([]);

const addUploadingFilesData = (filesData: FileData[]) => {
  const uploadingFilesData = uploadingFilesDataStore.get();
  uploadingFilesDataStore.set([...uploadingFilesData, ...filesData]);
};

const deleteUploadingFileData = (id: FileData["assetId"]) => {
  const uploadingFilesData = uploadingFilesDataStore.get();
  uploadingFilesDataStore.set(
    uploadingFilesData.filter((fileData) => fileData.assetId !== id)
  );
};

const assetContainersStore = computed(
  [assetsStore, uploadingFilesDataStore],
  (assets, uploadingFilesData) => {
    const uploadingAssets = new Map<
      PreviewAsset["id"],
      UploadingAssetContainer
    >();
    for (const { assetId, type, file, objectURL } of uploadingFilesData) {
      uploadingAssets.set(assetId, {
        status: "uploading",
        objectURL: objectURL,
        asset: {
          id: assetId,
          type,
          format: file.type.split("/")[1],
          name: file.name,
          description: file.name,
        },
      });
    }
    const uploadingContainers: UploadingAssetContainer[] = [];
    const uploadedContainers: UploadedAssetContainer[] = [];
    for (const [assetId, asset] of assets) {
      const uploadingAsset = uploadingAssets.get(assetId);
      if (uploadingAsset) {
        uploadingContainers.push(uploadingAsset);
        continue;
      }
      if (asset) {
        uploadedContainers.push({
          status: "uploaded",
          asset,
        });
      }
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
  file,
  onCompleted,
  onError,
}: {
  authToken: undefined | string;
  projectId: string;
  file: File;
  onCompleted: (data: UploadData) => void;
  onError: (error: string) => void;
}) => {
  try {
    const metaFormData = new FormData();
    metaFormData.append("projectId", projectId);
    metaFormData.append("type", file.type);
    // sanitizeS3Key here is just because of https://github.com/remix-run/remix/issues/4443
    // should be removed after fix
    metaFormData.append("filename", sanitizeS3Key(file.name));
    const metaResponse = await fetch(restAssetsPath({ authToken }), {
      method: "POST",
      body: metaFormData,
    });
    const metaData: { name: string } | { errors: string } =
      await metaResponse.json();
    if ("errors" in metaData) {
      throw Error(metaData.errors);
    }

    const uploadResponse = await fetch(
      restAssetsUploadPath({ name: metaData.name }),
      {
        method: "POST",
        body: file,
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

export const useUploadAsset = () => {
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

  const uploadAssets = (type: AssetType, files: File[]) => {
    const projectId = projectStore.get()?.id;
    const authToken = authTokenStore.get();
    if (projectId === undefined) {
      return;
    }

    const filesData = getFilesData(type, files);

    addUploadingFilesData(filesData);
    stubAssets(filesData.map((fileData) => fileData.assetId));

    for (const fileData of filesData) {
      const assetId = fileData.assetId;
      uploadAsset({
        authToken,
        projectId,
        file: fileData.file,
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

  return uploadAssets;
};

const filterByType = (assetContainers: AssetContainer[], type: AssetType) => {
  return assetContainers.filter((assetContainer) => {
    return assetContainer.asset.type === type;
  });
};

export const useAssets = (type: AssetType) => {
  const assetContainers = useStore(assetContainersStore);

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
