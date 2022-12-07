import {
  AssetType,
  filterByType,
  MAX_UPLOAD_SIZE,
  toBytes,
} from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import ObjectID from "bson-objectid";
import { useMemo } from "react";
import { restAssetsPath } from "~/shared/router-utils";
import { useAssets as useAssetsState, useProject } from "../nano-states";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { PreviewAsset } from "./types";
import { usePersistentFetcher } from "~/shared/fetcher";
import type { ActionData } from "~/designer/shared/assets";
import {
  FetcherData,
  normalizeErrors,
  toastUnknownFieldErrors,
} from "~/shared/form-utils";

export type UploadData = FetcherData<ActionData>;

const toPreviewAssets = (
  formsData: Array<FormData>
): Promise<PreviewAsset[]> => {
  const assets: Array<Promise<PreviewAsset>> = [];
  for (const formData of formsData) {
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
  }

  return Promise.all(assets);
};

const maxSize = toBytes(MAX_UPLOAD_SIZE);

const toFormsData = (type: AssetType, input: HTMLInputElement) => {
  const files = Array.from(input?.files ?? []);
  const formsData: Array<FormData> = [];
  if (files.length === 0) return formsData;
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

export const useAssets = (type: AssetType) => {
  const submit = usePersistentFetcher();
  const [assets, setAssets] = useAssetsState();
  const [project] = useProject();
  const action = project && restAssetsPath({ projectId: project.id });

  const handleDelete = (ids: Array<string>) => {
    const formData = new FormData();
    for (const id of ids) {
      formData.append("assetId", id);
    }
    submit(formData, { method: "delete", action });
  };

  const handleSubmit = (input: HTMLInputElement) => {
    const formsData = toFormsData(type, input);
    toPreviewAssets(formsData)
      .then((previewAssets) => {
        setAssets([...previewAssets, ...assets]);
      })
      .catch((error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        }
      });

    for (const formData of formsData) {
      submit<UploadData>(
        formData,
        {
          method: "post",
          action,
          encType: "multipart/form-data",
        },
        (data) => {
          if (data.status === "error") {
            toastUnknownFieldErrors(normalizeErrors(data.errors), []);
          }
        }
      );
    }
  };

  const assetsByType = useMemo(
    () => filterByType(assets, type),
    [assets, type]
  );

  return { handleSubmit, assets: assetsByType, handleDelete };
};
