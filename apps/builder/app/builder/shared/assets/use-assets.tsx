import {
  useMemo,
  createContext,
  useContext,
  type ReactNode,
  useState,
} from "react";
import warnOnce from "warn-once";
import type { Project } from "@webstudio-is/project";
import {
  type AssetType,
  idsFormDataFieldName,
  MAX_UPLOAD_SIZE,
  toBytes,
  Asset,
} from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { restAssetsPath } from "~/shared/router-utils";
import type {
  AssetContainer,
  PreviewAsset,
  UploadingAssetContainer,
} from "./types";
import { usePersistentFetcher } from "~/shared/fetcher";
import type { ActionData } from "~/builder/shared/assets";
import { normalizeErrors, toastUnknownFieldErrors } from "~/shared/form-utils";
import { assetsStore } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";

// stubbed asset is necessary to preserve position of asset
// while uploading and after it is uploaded
// undefined is not stored in db and only persisted in current session
const stubAssets = (ids: Asset["id"][]) => {
  const assets = new Map(assetsStore.get());
  for (const assetId of ids) {
    assets.set(assetId, undefined);
  }
  assetsStore.set(assets);
};

const setAsset = (asset: Asset) => {
  const assets = new Map(assetsStore.get());
  assets.set(asset.id, asset);
  assetsStore.set(assets);
};

const cleanAsset = (assetId: Asset["id"]) => {
  const assets = new Map(assetsStore.get());
  assets.delete(assetId);
  assetsStore.set(assets);
};

export type UploadData = ActionData;

const toUploadingAssetsAndFormData = (
  type: AssetType,
  files: File[]
): Promise<[UploadingAssetContainer, FormData][]> => {
  const assets: Array<Promise<[UploadingAssetContainer, FormData]>> = [];

  for (const file of files) {
    const promise = new Promise<[UploadingAssetContainer, FormData]>(
      (resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", (event) => {
          const dataUri = event?.target?.result;
          if (dataUri === undefined) {
            return reject(new Error(`Could not read file "${file.name}"`));
          }

          const id = crypto.randomUUID();

          // sanitizeS3Key here is just because of https://github.com/remix-run/remix/issues/4443
          // should be removed after fix
          const formData = new FormData();
          formData.append(type, file, sanitizeS3Key(file.name));
          formData.append(idsFormDataFieldName, id);

          resolve([
            {
              status: "uploading",
              asset: {
                type,
                format: file.type.split("/")[1],
                path: String(dataUri),
                name: file.name,
                description: file.name,
                id,
              },
            },
            formData,
          ]);
        });

        reader.readAsDataURL(file);
      }
    );

    assets.push(promise);
  }

  return Promise.all(assets);
};

const maxSize = toBytes(MAX_UPLOAD_SIZE);

const getFilesFromInput = (_type: AssetType, input: HTMLInputElement) => {
  const files = Array.from(input?.files ?? []);

  const exceedSizeFiles = files.filter((file) => file.size > maxSize);

  for (const file of exceedSizeFiles) {
    toast.error(
      `Asset "${file.name}" cannot be bigger than ${MAX_UPLOAD_SIZE}MB`
    );
  }

  return files.filter((file) => file.size <= maxSize);
};

type AssetsContext = {
  handleSubmit: (type: AssetType, files: File[]) => Promise<void>;
  assetContainers: AssetContainer[];
  handleDelete: (ids: Array<string>) => void;
};

const Context = createContext<AssetsContext | undefined>(undefined);

export const AssetsProvider = ({
  projectId,
  authToken,
  children,
}: {
  projectId: Project["id"];
  authToken: string | undefined;
  children: ReactNode;
}) => {
  const [deletingAssetIds, setDeletingAssetIds] = useState<Asset["id"][]>([]);
  const [uploadingAssets, setUploadingAssets] = useState<
    Array<Asset | PreviewAsset>
  >([]);
  const submit = usePersistentFetcher();

  const action = restAssetsPath({ projectId: projectId, authToken });

  const handleDeleteAfterSubmit = (ids: Asset["id"][], data: UploadData) => {
    setDeletingAssetIds((prev) =>
      prev.filter((assetId) => ids.includes(assetId) === false)
    );

    const { errors, deletedAssets } = data;
    if (errors !== undefined) {
      return toastUnknownFieldErrors(normalizeErrors(errors), []);
    }

    if (deletedAssets === undefined) {
      warnOnce(true, "Deleted assets is undefined");
      toast.error("Could not delete assets");
      return;
    }

    for (const deletedId of ids) {
      cleanAsset(deletedId);
    }
  };

  const handleAfterSubmit = (assetId: string, data: UploadData) => {
    // remove uploaded or failed asset
    setUploadingAssets((prev) => prev.filter((asset) => asset.id !== assetId));

    if (data.errors !== undefined) {
      cleanAsset(assetId);
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
      cleanAsset(assetId);
      return;
    }

    // update store with new asset
    setAsset(uploadedAsset);
  };

  const handleDelete = (ids: Array<string>) => {
    setDeletingAssetIds((prev) => [...prev, ...ids]);

    const formData = new FormData();
    for (const id of ids) {
      formData.append("assetId", id);
    }

    submit<UploadData>(formData, { method: "delete", action }, (data) =>
      handleDeleteAfterSubmit(ids, data)
    );
  };

  const handleSubmit = async (type: AssetType, files: File[]) => {
    try {
      const uploadingAssetsAndFormData = await toUploadingAssetsAndFormData(
        type,
        files
      );
      const uploadingAssets = uploadingAssetsAndFormData.map(
        ([previewAsset]) => previewAsset.asset
      );

      setUploadingAssets((prev) => [...uploadingAssets, ...prev]);

      stubAssets(uploadingAssets.map((asset) => asset.id));

      for (const [
        uploadingAssetContainer,
        formData,
      ] of uploadingAssetsAndFormData) {
        submit<UploadData>(
          formData,
          {
            method: "post",
            action,
            encType: "multipart/form-data",
          },
          (data) => handleAfterSubmit(uploadingAssetContainer.asset.id, data)
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const uploadingAssetsMap = new Map();
  for (const asset of uploadingAssets) {
    uploadingAssetsMap.set(asset.id, asset);
  }
  const assetContainers: Array<AssetContainer> = [];
  const assets = useStore(assetsStore);
  for (const [assetId, asset] of assets) {
    if (deletingAssetIds.includes(assetId)) {
      continue;
    }
    const uploadingAsset = uploadingAssetsMap.get(assetId);
    if (uploadingAsset) {
      assetContainers.push({
        status: "uploading",
        asset: uploadingAsset,
      });
      continue;
    }
    if (asset) {
      assetContainers.push({
        status: "uploaded",
        asset,
      });
    }
  }

  return (
    <Context.Provider value={{ assetContainers, handleSubmit, handleDelete }}>
      {children}
    </Context.Provider>
  );
};

const filterByType = (assetContainers: AssetContainer[], type: AssetType) => {
  return assetContainers.filter((assetContainer) => {
    return assetContainer.asset.type === type;
  });
};

export const useAssets = (type: AssetType) => {
  const assetContainersContext = useContext(Context);
  if (!assetContainersContext) {
    throw new Error("useAssets is used without AssetsProvider");
  }

  const assetsByType = useMemo(() => {
    const assetContainers = assetContainersContext.assetContainers;
    return filterByType(assetContainers, type);
  }, [assetContainersContext.assetContainers, type]);

  const handleSubmit = (input: HTMLInputElement) => {
    const formsData = getFilesFromInput(type, input);
    assetContainersContext.handleSubmit(type, formsData);
  };

  return {
    /**
     * Already loaded assets or assets that are being uploaded
     */
    assetContainers: assetsByType,
    handleSubmit,
    handleDelete: assetContainersContext.handleDelete,
  };
};
