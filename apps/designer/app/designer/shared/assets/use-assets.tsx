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
  filterByType,
  MAX_UPLOAD_SIZE,
  toBytes,
  type Asset,
} from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import ObjectID from "bson-objectid";
import { restAssetsPath } from "~/shared/router-utils";
import { useAssets as useAssetsState, useProject } from "../nano-states";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { DeletingAsset, PreviewAsset } from "./types";
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
  const [assets] = useAssetsState();
  useEffect(() => {
    publish({
      type: "updateAssets",
      payload: assets.filter(
        (asset) => asset.status === "uploaded"
      ) as Array<Asset>, // TS doesn't understand we filtered out PrevewAssets
    });
  }, [assets, publish]);
};

export type UploadData = FetcherData<ActionData>;

const toPreviewAssets = (
  formsData: Array<FormData>
): Promise<[PreviewAsset, FormData][]> => {
  const assets: Array<Promise<[PreviewAsset, FormData]>> = [];
  for (const formData of formsData) {
    for (const entry of formData) {
      const file = entry[1];
      if (!(file instanceof File)) {
        continue;
      }
      const promise = new Promise<[PreviewAsset, FormData]>(
        (resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener("load", (event) => {
            const dataUri = event?.target?.result;
            if (dataUri === undefined) {
              return reject(new Error(`Could not read file "${file.name}"`));
            }

            resolve([
              {
                format: file.type.split("/")[1],
                path: String(dataUri),
                name: file.name,
                id: ObjectID().toString(),
                status: "uploading",
              },
              formData,
            ]);
          });
          reader.readAsDataURL(file);
        }
      );
      assets.push(promise);
    }
  }

  return Promise.all(assets);
};

const maxSize = toBytes(MAX_UPLOAD_SIZE);

const toFormsData = (type: AssetType, input: HTMLInputElement) => {
  const files = Array.from(input?.files ?? []);
  const formsData: Array<FormData> = [];
  if (files.length === 0) {
    return formsData;
  }
  for (const file of files) {
    const formData = new FormData();
    if (file.size > maxSize) {
      toast.error(
        `Asset "${file.name}" cannot be bigger than ${MAX_UPLOAD_SIZE}MB`
      );
      continue;
    }

    // sanitizeS3Key here is just because of https://github.com/remix-run/remix/issues/4443
    // should be removed after fix
    formData.append(type, file, sanitizeS3Key(file.name));
    formsData.push(formData);
  }
  return formsData;
};

type AssetsContext = {
  handleSubmit: (formsData: FormData[]) => Promise<void>;
  assets: Array<Asset | PreviewAsset | DeletingAsset>;
  handleDelete: (ids: Array<string>) => void;
};

const Context = createContext<AssetsContext | undefined>(undefined);

export const AssetsProvider = ({ children }: { children: ReactNode }) => {
  const [project] = useProject();
  const [stateAssets, setAssets] = useAssetsState();
  const { load, data: serverAssets } = useFetcher<Asset[]>();
  const submit = usePersistentFetcher();
  const assetsRef = useRef(stateAssets);

  const action = project && restAssetsPath({ projectId: project.id });
  assetsRef.current = stateAssets;

  useEffect(() => {
    if (action && stateAssets.length === 0) {
      load(action);
    }
  }, [action, stateAssets.length, load]);

  useEffect(() => {
    if (serverAssets !== undefined) {
      const nextAssets = updateStateAssets(stateAssets, serverAssets);

      if (nextAssets !== stateAssets) {
        setAssets(nextAssets);
      }
    }
  }, [serverAssets, stateAssets, setAssets]);

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
      const nextAssets = [...assets].map((asset) => {
        if (asset.status === "deleting") {
          const newAsset = { ...asset, status: "uploaded" } as Asset;
          return newAsset;
        }

        return asset;
      });

      setAssets(nextAssets);

      return toastUnknownFieldErrors(normalizeErrors(data.errors), []);
    }
  };

  const handleAfterSubmit = (previewAssetId: string) => (data: UploadData) => {
    const assets = assetsRef.current;

    if (action) {
      load(action);
    }

    if (data.status === "error") {
      // We don't know what's wrong, remove preview asset and wait for the load to fix it
      setAssets(assets.filter((asset) => asset.id !== previewAssetId));

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

      // @todo better to create ErrorAsset type and show asset with error
      setAssets(assets.filter((asset) => asset.id !== previewAssetId));
      return;
    }

    // Optimistically update preview asset with the uploaded asset
    const nextAssets = [...assets];

    const index = nextAssets.findIndex(
      (nextAsset) => nextAsset.id === previewAssetId
    );

    if (index !== -1) {
      nextAssets[index] = { ...uploadedAsset, status: "uploading" };
    }

    setAssets(nextAssets);
  };

  const handleDelete = (ids: Array<string>) => {
    const formData = new FormData();
    const assets = assetsRef.current;

    const nextAssets = [...assets];

    for (const id of ids) {
      formData.append("assetId", id);

      // Mark assets as deleting
      const index = nextAssets.findIndex((nextAsset) => nextAsset.id === id);
      if (index !== -1) {
        const newAsset = {
          ...nextAssets[index],
          status: "deleting",
        } as DeletingAsset;

        nextAssets[index] = newAsset;
      }

      setAssets(nextAssets);
    }

    submit<UploadData>(
      formData,
      { method: "delete", action },
      handleDeleteAfterSubmit
    );
  };

  const handleSubmit = async (formsData: FormData[]) => {
    const previewAssets = await toPreviewAssets(formsData)
      .then((previewAssets) => {
        const assets = assetsRef.current;
        setAssets([
          ...previewAssets.map(([previewAsset]) => previewAsset),
          ...assets,
        ]);
        return previewAssets;
      })
      .catch((error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        }
      });

    if (previewAssets === undefined) {
      return;
    }

    for (const [previewAsset, formData] of previewAssets) {
      submit<UploadData>(
        formData,
        {
          method: "post",
          action,
          encType: "multipart/form-data",
        },
        handleAfterSubmit(previewAsset.id)
      );
    }
  };

  return (
    <Context.Provider
      value={{ handleSubmit, assets: stateAssets, handleDelete }}
    >
      {children}
    </Context.Provider>
  );
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
    const formsData = toFormsData(type, input);
    assetsContext.handleSubmit(formsData);
  };

  return {
    handleSubmit,
    assets: assetsByType,
    handleDelete: assetsContext.handleDelete,
  };
};
