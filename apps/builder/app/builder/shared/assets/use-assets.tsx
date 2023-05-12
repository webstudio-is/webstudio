import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import warnOnce from "warn-once";
import store from "immerhin";
import { type AssetType, type Asset } from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { restAssetsUploadPath, restAssetsPath } from "~/shared/router-utils";
import type { AssetContainer, PreviewAsset } from "./types";
import type { ActionData } from "~/builder/shared/assets";
import { assetsStore, authTokenStore } from "~/shared/nano-states";
import { atom, computed } from "nanostores";
import { projectContainer } from "../nano-states";

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
  id: string;
  type: AssetType;
  file: File;
  objectURL: string;
};

const getFilesData = (type: AssetType, files: File[]): FileData[] => {
  return files.map((file) => {
    return {
      id: crypto.randomUUID(),
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

const deleteUploadingFileData = (id: FileData["id"]) => {
  const uploadingFilesData = uploadingFilesDataStore.get();
  uploadingFilesDataStore.set(
    uploadingFilesData.filter((fileData) => fileData.id !== id)
  );
};

const assetContainersStore = computed(
  [assetsStore, uploadingFilesDataStore],
  (assets, uploadingFilesData) => {
    const uploadingAssets = new Map<PreviewAsset["id"], AssetContainer>();
    for (const { id, type, file, objectURL } of uploadingFilesData) {
      uploadingAssets.set(id, {
        status: "uploading",
        objectURL: objectURL,
        asset: {
          id,
          type,
          format: file.type.split("/")[1],
          name: file.name,
          description: file.name,
        },
      });
    }
    const assetContainers: Array<AssetContainer> = [];
    for (const [assetId, asset] of assets) {
      const uploadingAsset = uploadingAssets.get(assetId);
      if (uploadingAsset) {
        assetContainers.push(uploadingAsset);
        continue;
      }
      if (asset) {
        assetContainers.push({
          status: "uploaded",
          asset,
        });
      }
    }
    return assetContainers;
  }
);

export type UploadData = ActionData;

const uploadAsset = async ({
  authToken,
  projectId,
  assetId,
  file,
  onCompleted,
  onError,
}: {
  authToken: undefined | string;
  projectId: string;
  assetId: string;
  file: File;
  onCompleted: (data: UploadData) => void;
  onError: (error: string) => void;
}) => {
  try {
    const metaFormData = new FormData();
    metaFormData.append("projectId", projectId);
    metaFormData.append("assetId", assetId);
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

    const uploadFormData = new FormData();
    uploadFormData.append("file", file, metaData.name);
    const uploadResponse = await fetch(
      restAssetsUploadPath({ name: metaData.name }),
      {
        method: "POST",
        body: uploadFormData,
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

    // update store with new asset
    setAsset(uploadedAsset);
  };

  const uploadAssets = (type: AssetType, files: File[]) => {
    const projectId = projectContainer.get()?.id;
    const authToken = authTokenStore.get();
    if (projectId === undefined) {
      return;
    }

    const filesData = getFilesData(type, files);

    addUploadingFilesData(filesData);
    stubAssets(filesData.map((fileData) => fileData.id));

    for (const fileData of filesData) {
      const assetId = fileData.id;
      uploadAsset({
        authToken,
        projectId,
        assetId,
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
