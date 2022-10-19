import { useFetcher } from "@remix-run/react";
import {
  AssetType,
  filterByType,
  MAX_UPLOAD_SIZE,
  toBytes,
} from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import ObjectID from "bson-objectid";
import { useMemo } from "react";
import { useAssets as useAssetsState, useProject } from "../nano-states";
import { PreviewAsset } from "./types";

const toPreviewAssets = (formData: FormData): Promise<PreviewAsset[]> => {
  const assets: Array<Promise<PreviewAsset>> = [];

  for (const entry of formData) {
    const file = entry[1] as File;
    const promise: Promise<PreviewAsset> = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        const dataUri = event?.target?.result;
        if (dataUri === undefined) {
          return reject(new Error(`Could not read file "${file.name}"`));
        }

        resolve({
          format: file.type.split("/")[1],
          path: String(dataUri),
          name: file.name,
          id: ObjectID().toString(),
          status: "uploading",
        });
      });
      reader.readAsDataURL(file);
    });
    assets.push(promise);
  }

  return Promise.all(assets);
};

const maxSize = toBytes(MAX_UPLOAD_SIZE);

const toFormData = (type: AssetType, input: HTMLInputElement) => {
  const files = Array.from(input?.files ?? []);
  const formData = new FormData();
  if (files.length === 0) return formData;
  for (const file of files) {
    if (file.size > maxSize) {
      toast.error(
        `Asset "${file.name}" cannot be bigger than ${MAX_UPLOAD_SIZE}MB`
      );
      continue;
    }
    formData.append(type, file, file.name);
  }
  return formData;
};

export const useAssets = (type: AssetType) => {
  const { submit, Form } = useFetcher();
  const [assets, setAssets] = useAssetsState();
  const [project] = useProject();
  const action = `/rest/assets/${project?.id}`;

  const handleDelete = (ids: Array<string>) => {
    const formData = new FormData();
    for (const id of ids) {
      formData.append("assetId", id);
    }
    submit(formData, { method: "delete", action });
  };

  const handleSubmit = (input: HTMLInputElement) => {
    const formData = toFormData(type, input);
    submit(formData, {
      method: "post",
      action,
      encType: "multipart/form-data",
    });
    toPreviewAssets(formData)
      .then((previewAssets) => {
        setAssets([...previewAssets, ...assets]);
      })
      .catch((error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        }
      });
  };

  const assetsByType = useMemo(
    () => filterByType(assets, type),
    [assets, type]
  );

  return { handleSubmit, Form, assets: assetsByType, handleDelete };
};
