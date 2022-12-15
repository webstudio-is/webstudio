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
import { type FontFormat, FONT_FORMATS } from "@webstudio-is/fonts";
import { toast } from "@webstudio-is/design-system";
import { restAssetsPath } from "~/shared/router-utils";
import { useClientAssets, useProject } from "../nano-states";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { ClientAsset, UploadingClientAsset } from "./types";
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
import { updateStateAssets } from "./update-state-assets";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateAssets: Array<Asset>;
  }
}

export const usePublishAssets = (publish: Publish) => {
  const [clientAssets] = useClientAssets();
  useEffect(() => {
    publish({
      type: "updateAssets",
      payload: clientAssets
        .filter((clientAsset) => clientAsset.status === "uploaded")
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- for "status" === "uploaded" asset is defined
        .map((clientAsset) => clientAsset.asset!),
    });
  }, [clientAssets, publish]);
};

export type UploadData = FetcherData<ActionData>;

const toUploadingAssetsAndFormData = (
  type: AssetType,
  files: File[]
): Promise<[UploadingClientAsset, FormData][]> => {
  const assets: Array<Promise<[UploadingClientAsset, FormData]>> = [];

  for (const file of files) {
    const promise = new Promise<[UploadingClientAsset, FormData]>(
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
          formData.append(idsFormDataFieldName, crypto.randomUUID());

          resolve([
            {
              status: "uploading",
              asset: undefined,
              preview: {
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
  assets: Array<ClientAsset>;
  handleDelete: (ids: Array<string>) => void;
};

const Context = createContext<AssetsContext | undefined>(undefined);

export const AssetsProvider = ({ children }: { children: ReactNode }) => {
  const [project] = useProject();
  const [clientAssets, setClientAssets] = useClientAssets();
  const { load, data: serverAssets } = useFetcher<Asset[]>();
  const submit = usePersistentFetcher();
  const assetsRef = useRef(clientAssets);

  const action = project && restAssetsPath({ projectId: project.id });
  assetsRef.current = clientAssets;

  useEffect(() => {
    if (action && clientAssets.length === 0) {
      load(action);
    }
  }, [action, clientAssets.length, load]);

  useEffect(() => {
    if (serverAssets !== undefined) {
      const nextAssets = updateStateAssets(clientAssets, serverAssets);

      if (nextAssets !== clientAssets) {
        setClientAssets(nextAssets);
      }
    }
  }, [serverAssets, clientAssets, setClientAssets]);

  const handleDeleteAfterSubmit = (data: UploadData) => {
    // We need to remove assets only at updateStateAssets.
    // We can't remove it here optimistically because the previous load
    // can return it as "updated" because of the async operation nature
    if (action) {
      load(action);
    }

    if (data.status === "error") {
      // We don't know what's wrong, remove the "deleting" status from assets and wait for the load to fix it
      const assets = assetsRef.current;
      const nextAssets = assets.map((asset) => {
        if (asset.status === "deleting") {
          const newAsset: ClientAsset = { ...asset, status: "uploaded" };
          return newAsset;
        }

        return asset;
      });

      setClientAssets(nextAssets);

      return toastUnknownFieldErrors(normalizeErrors(data.errors), []);
    }
  };

  const handleAfterSubmit = (assetId: string) => (data: UploadData) => {
    const assets = assetsRef.current;

    if (action) {
      load(action);
    }

    if (data.status === "error") {
      // We don't know what's wrong, remove uploading asset and wait for the load to fix it
      setClientAssets(
        assets.filter(
          (asset) =>
            asset.status !== "uploading" || asset.preview.id !== assetId
        )
      );

      return toastUnknownFieldErrors(normalizeErrors(data.errors), []);
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
      setClientAssets(
        assets.filter(
          (asset) =>
            asset.status !== "uploading" || asset.preview.id !== assetId
        )
      );
      return;
    }

    setClientAssets(
      assets.map((asset) => {
        if (asset.status === "uploading" && asset.preview.id === assetId) {
          // We can start using the uploaded asset for image previews etc
          return { ...asset, asset: uploadedAsset };
        }
        return asset;
      })
    );
  };

  const handleDelete = (ids: Array<string>) => {
    const formData = new FormData();
    const assets = assetsRef.current;

    const nextAssets = [...assets];

    for (const id of ids) {
      formData.append("assetId", id);
      // Mark assets as deleting
      const index = nextAssets.findIndex(
        (nextAsset) => nextAsset.asset?.id === id
      );

      if (index !== -1) {
        const asset = nextAssets[index];

        if (asset.status === "uploaded") {
          const newAsset: ClientAsset = {
            ...asset,
            status: "deleting",
          };

          nextAssets[index] = newAsset;
          continue;
        }

        warnOnce(true, "Trying to delete an asset that is not uploaded");
      }
    }

    setClientAssets(nextAssets);

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

      const assets = assetsRef.current;
      setClientAssets([
        ...uploadingAssetsAndFormData.map(([previewAsset]) => previewAsset),
        ...assets,
      ]);

      for (const [uploadingAsset, formData] of uploadingAssetsAndFormData) {
        submit<UploadData>(
          formData,
          {
            method: "post",
            action,
            encType: "multipart/form-data",
          },
          handleAfterSubmit(uploadingAsset.preview.id)
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
      value={{ handleSubmit, assets: clientAssets, handleDelete }}
    >
      {children}
    </Context.Provider>
  );
};

const filterByType = (clientAssets: Array<ClientAsset>, type: AssetType) => {
  return clientAssets.filter((clientAsset) => {
    const format = clientAsset.asset?.format ?? clientAsset.preview?.format;

    const isFont = FONT_FORMATS.has(format as FontFormat);
    if (type === "font") {
      return isFont;
    }

    return isFont === false;
  });
};

export const useAssets = (type: AssetType) => {
  const assetsContext = useContext(Context);
  if (!assetsContext) {
    throw new Error("useAssets is used without AssetsProvider");
  }

  const assetsByType = useMemo(
    () => filterByType(assetsContext.assets, type),
    [assetsContext.assets, type]
  );

  const handleSubmit = (input: HTMLInputElement) => {
    const formsData = getFilesFromInput(type, input);
    assetsContext.handleSubmit(type, formsData);
  };

  return {
    handleSubmit,
    assets: assetsByType,
    handleDelete: assetsContext.handleDelete,
  };
};
