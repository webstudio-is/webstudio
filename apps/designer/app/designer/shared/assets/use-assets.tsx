import {
  useEffect,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
  useRef,
} from "react";
import {
  AssetType,
  idsFormDataFieldName,
  MAX_UPLOAD_SIZE,
  toBytes,
  type Asset,
} from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { restAssetsPath } from "~/shared/router-utils";
import { useAssetsContainer, useProject } from "../nano-states";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import type {
  AssetContainer,
  DeletingAssetContainer,
  UploadedAssetContainer,
  UploadingAssetContainer,
} from "./types";
import { usePersistentFetcher } from "~/shared/fetcher";
import type { ActionData } from "~/designer/shared/assets";
import {
  FetcherData,
  normalizeErrors,
  toastUnknownFieldErrors,
} from "~/shared/form-utils";
import { Publish } from "~/shared/pubsub";
import { useFetcher } from "@remix-run/react";
import warnOnce from "warn-once";
import { updateStateAssets } from "./update-asset-containers";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateAssets: Array<Asset>;
  }
}

export const usePublishAssets = (publish: Publish) => {
  const [assetContainers] = useAssetsContainer();
  useEffect(() => {
    publish({
      type: "updateAssets",
      payload: assetContainers
        .filter((assetContainer) => assetContainer.status === "uploaded")
        .map((assetContainer) => {
          //  This check is only to fix that ts can't detect type based on the filter above
          if (assetContainer.status !== "uploaded") {
            throw new Error(
              `Impossible, asset must have status "uploaded" see filter above`
            );
          }

          return assetContainer.asset;
        }),
    });
  }, [assetContainers, publish]);
};

export type UploadData = FetcherData<ActionData>;

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

const getFilesFromInput = (type: AssetType, input: HTMLInputElement) => {
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

export const AssetsProvider = ({ children }: { children: ReactNode }) => {
  const [project] = useProject();
  const [assetContainers, setAssetContainers] = useAssetsContainer();
  const { submit: load, data: serverAssets } = useFetcher<Asset[]>();
  const submit = usePersistentFetcher();
  const assetContainersRef = useRef(assetContainers);

  const action = project && restAssetsPath({ projectId: project.id });
  assetContainersRef.current = assetContainers;

  useEffect(() => {
    if (action && assetContainers.length === 0) {
      /**
       * To prevent the AssetsProvider from being redrawn every time an action is requested, we use PUT instead of GET
       * to load assets. The only reason PUT is chosen is that it is idempotent and has not been used before.
       */
      load({}, { action, method: "put" });
    }
  }, [action, assetContainers.length, load]);

  useEffect(() => {
    if (serverAssets !== undefined) {
      const nextAssetContainers = updateStateAssets(
        assetContainers,
        serverAssets
      );

      if (nextAssetContainers !== assetContainers) {
        setAssetContainers(nextAssetContainers);
      }
    }
  }, [serverAssets, assetContainers, setAssetContainers]);

  const handleDeleteAfterSubmit = (data: UploadData) => {
    // We need to remove assets only at updateStateAssets.
    // We can't remove it here optimistically because the previous load
    // can return it as "updated" because of the async operation nature
    if (action) {
      load({}, { action, method: "put" });
    }

    if (data.status === "error") {
      // We don't know what's wrong, remove the "deleting" status from assets and wait for the load to fix it
      const assetContainers = assetContainersRef.current;
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

      setAssetContainers(nextAssetContainers);

      return toastUnknownFieldErrors(normalizeErrors(data.errors), []);
    }
  };

  const handleAfterSubmit = (assetId: string) => (data: UploadData) => {
    const assetContainers = assetContainersRef.current;

    if (action) {
      load({}, { action, method: "put" });
    }

    if (data.status === "error" || data.errors !== undefined) {
      // We don't know what's wrong, remove uploading asset and wait for the load to fix it
      setAssetContainers(
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
      setAssetContainers(
        assetContainers.filter(
          (assetContainer) =>
            assetContainer.status !== "uploading" ||
            assetContainer.asset.id !== assetId
        )
      );
      return;
    }

    setAssetContainers(
      assetContainers.map((assetContainer) => {
        if (
          assetContainer.status === "uploading" &&
          assetContainer.asset.id === assetId
        ) {
          // We can start using the uploaded asset for image previews etc
          return { ...assetContainer, asset: uploadedAsset };
        }
        return assetContainer;
      })
    );
  };

  const handleDelete = (ids: Array<string>) => {
    const formData = new FormData();
    const assetContainer = assetContainersRef.current;

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

    setAssetContainers(nextAssetContainers);

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

      const assets = assetContainersRef.current;
      setAssetContainers([
        ...uploadingAssetsAndFormData.map(([previewAsset]) => previewAsset),
        ...assets,
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
          handleAfterSubmit(uploadingAssetContainer.asset.id)
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <Context.Provider
      value={{ handleSubmit, assetContainers: assetContainers, handleDelete }}
    >
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
