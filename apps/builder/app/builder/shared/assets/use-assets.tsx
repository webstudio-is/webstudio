import { useMemo, createContext, useContext, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import warnOnce from "warn-once";
import type { Project } from "@webstudio-is/project";
import {
  type AssetType,
  idsFormDataFieldName,
  MAX_UPLOAD_SIZE,
  toBytes,
} from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { assetContainersStore } from "~/shared/nano-states";
import { restAssetsPath } from "~/shared/router-utils";
import type {
  AssetContainer,
  DeletingAssetContainer,
  UploadedAssetContainer,
  UploadingAssetContainer,
} from "./types";
import { usePersistentFetcher } from "~/shared/fetcher";
import type { ActionData } from "~/builder/shared/assets";
import { normalizeErrors, toastUnknownFieldErrors } from "~/shared/form-utils";

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
  assetContainers: Array<AssetContainer | DeletingAssetContainer>;
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
  const assetContainers = useStore(assetContainersStore);
  const submit = usePersistentFetcher();

  const action = restAssetsPath({ projectId: projectId, authToken });

  const handleDeleteAfterSubmit = (data: UploadData) => {
    const { errors, deletedAssets } = data;
    const assetContainers = assetContainersStore.get();
    if (errors !== undefined) {
      const nextAssetContainers = assetContainers.map((assetContainer) => {
        if (assetContainer.status === "deleting") {
          const uploadedAssetContainer: UploadedAssetContainer = {
            ...assetContainer,
            status: "uploaded",
          };
          return uploadedAssetContainer;
        }

        return assetContainer;
      });
      assetContainersStore.set(nextAssetContainers);
      return toastUnknownFieldErrors(normalizeErrors(errors), []);
    }

    if (deletedAssets) {
      const deletedIds = new Set(deletedAssets.map((asset) => asset.id));
      assetContainersStore.set(
        assetContainers.filter(
          (assetContainer) => deletedIds.has(assetContainer.asset.id) === false
        )
      );
    }
  };

  const handleAfterSubmit = (assetId: string, data: UploadData) => {
    const assetContainers = assetContainersStore.get();

    if (data.errors !== undefined) {
      assetContainersStore.set(
        assetContainers.filter(
          (assetContainer) =>
            assetContainer.status !== "uploading" ||
            assetContainer.asset.id !== assetId
        )
      );

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

      // remove uploading asset and wait for the load to fix it
      assetContainersStore.set(
        assetContainers.filter(
          (assetContainer) =>
            assetContainer.status !== "uploading" ||
            assetContainer.asset.id !== assetId
        )
      );
      return;
    }

    assetContainersStore.set(
      assetContainers.map((assetContainer) => {
        if (
          assetContainer.status === "uploading" &&
          assetContainer.asset.id === assetId
        ) {
          // We can start using the uploaded asset for image previews etc
          return { status: "uploaded", asset: uploadedAsset };
        }
        return assetContainer;
      })
    );
  };

  const handleDelete = (ids: Array<string>) => {
    const formData = new FormData();
    const assetContainer = assetContainersStore.get();

    const nextAssetContainers = [...assetContainer];

    for (const id of ids) {
      formData.append("assetId", id);
      // Mark assets as deleting
      const index = nextAssetContainers.findIndex(
        (nextAssetContainer) => nextAssetContainer.asset.id === id
      );

      if (index !== -1) {
        const asset = nextAssetContainers[index];

        if (asset.status === "uploaded") {
          const newAsset: DeletingAssetContainer = {
            ...asset,
            status: "deleting",
          };

          nextAssetContainers[index] = newAsset;
          continue;
        }

        warnOnce(true, "Trying to delete an asset that is not uploaded");
      }
    }

    assetContainersStore.set(nextAssetContainers);

    submit<UploadData>(
      formData,
      { method: "delete", action },
      handleDeleteAfterSubmit
    );
  };

  const handleSubmit = async (type: AssetType, files: File[]) => {
    try {
      const uploadingAssetsAndFormData = await toUploadingAssetsAndFormData(
        type,
        files
      );

      assetContainersStore.set([
        ...uploadingAssetsAndFormData.map(([previewAsset]) => previewAsset),
        ...assetContainersStore.get(),
      ]);

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
    // In no case we need to have access to deleting assets
    // But we need them for optiistic updates, filter out here
    const assetContainers: AssetContainer[] = [];

    for (const asset of assetContainersContext.assetContainers) {
      if (asset.status !== "deleting") {
        assetContainers.push(asset);
      }
    }

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
