import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import warnOnce from "warn-once";
import store from "immerhin";
import { type AssetType, type Asset } from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { restAssetsUploadPath, restAssetsPath } from "~/shared/router-utils";
import type { AssetContainer, PreviewAsset } from "./types";
import { usePersistentFetcher } from "~/shared/fetcher";
import type { ActionData } from "~/builder/shared/assets";
import { normalizeErrors, toastUnknownFieldErrors } from "~/shared/form-utils";
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

export const useUploadAsset = () => {
  const submitAsset = usePersistentFetcher();
  const submitUpload = usePersistentFetcher();

  const handleAfterSubmit = (assetId: string, data: UploadData) => {
    // remove uploaded or failed asset
    deleteUploadingFileData(assetId);

    if (data.errors !== undefined) {
      deleteAssets([assetId]);
      return toastUnknownFieldErrors(
        normalizeErrors(data.errors ?? "Could not upload an asset"),
        []
      );
    }

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

  const uploadAsset = (type: AssetType, files: File[]) => {
    const projectId = projectContainer.get()?.id;
    const authToken = authTokenStore.get();
    if (projectId === undefined) {
      return;
    }

    try {
      const filesData = getFilesData(type, files);

      addUploadingFilesData(filesData);
      stubAssets(filesData.map((fileData) => fileData.id));

      for (const fileData of filesData) {
        const { id, type, file } = fileData;
        // should be removed after fix
        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("assetId", id);
        // sanitizeS3Key here is just because of https://github.com/remix-run/remix/issues/4443
        // should be removed after fix
        formData.append("filename", sanitizeS3Key(file.name));
        submitAsset<{ name: string }>(
          formData,
          {
            method: "post",
            action: restAssetsPath({ authToken }),
            encType: "multipart/form-data",
          },
          (data) => {
            const formData = new FormData();
            formData.append(type, file, data.name);
            submitUpload<UploadData>(
              formData,
              {
                method: "post",
                action: restAssetsUploadPath({ name: data.name }),
                encType: "multipart/form-data",
              },
              (data) => {
                URL.revokeObjectURL(fileData.objectURL);
                handleAfterSubmit(fileData.id, data);
              }
            );
          }
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  return uploadAsset;
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
