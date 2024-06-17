import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import warnOnce from "warn-once";
import type { Asset } from "@webstudio-is/sdk";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { Box, Grid, toast, Text } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { restAssetsUploadPath, restAssetsPath } from "~/shared/router-utils";
import type {
  AssetContainer,
  UploadedAssetContainer,
  UploadingAssetContainer,
} from "./types";
import type { ActionData } from "~/builder/shared/assets";
import {
  $assets,
  $authToken,
  $project,
  $uploadingFilesDataStore,
  type UploadingFileData,
} from "~/shared/nano-states";
import { computed } from "nanostores";
import { serverSyncStore } from "~/shared/sync";

import {
  getFileName,
  getMimeType,
  getSha256Hash,
  getSha256HashOfFile,
  uploadingFileDataToAsset,
} from "./asset-utils";
import { Image } from "../image-manager/image";
import invariant from "tiny-invariant";

export const deleteAssets = (assetIds: Asset["id"][]) => {
  serverSyncStore.createTransaction([$assets], (assets) => {
    for (const assetId of assetIds) {
      assets.delete(assetId);
    }
  });
};

const safeDeleteAssets = (assetIds: Asset["id"][], projectId: string) => {
  const currentProjectId = $project.get()?.id;

  if (currentProjectId !== projectId) {
    toast.error("Project has been changed, files will not be uploaded");
    // Can cause data corruption
    return;
  }

  deleteAssets(assetIds);
};

const safeSetAsset = (asset: Asset, projectId: string) => {
  const currentProjectId = $project.get()?.id;

  if (currentProjectId !== projectId) {
    toast.error("Project has been changed, files will not be uploaded");
    // Can cause data corrupiton
    return;
  }

  serverSyncStore.createTransaction([$assets], (assets) => {
    assets.set(asset.id, asset);
  });
};

const getFilesData = async (
  type: AssetType,
  filesOrUrls: File[] | URL[]
): Promise<UploadingFileData[]> => {
  const filesData: UploadingFileData[] = [];
  for (const fileOrUrl of filesOrUrls) {
    if (fileOrUrl instanceof File) {
      const assetId = await getSha256HashOfFile(fileOrUrl);
      filesData.push({
        source: "file" as const,
        assetId: assetId,
        type,
        file: fileOrUrl,
        objectURL: URL.createObjectURL(fileOrUrl),
      });
      continue;
    }

    const assetId = await getSha256Hash(fileOrUrl.href);
    filesData.push({
      source: "url" as const,
      assetId,
      type,
      url: fileOrUrl.href,
      objectURL: fileOrUrl.href,
    });
  }

  return filesData;
};

const addUploadingFilesData = (filesData: UploadingFileData[]) => {
  const uploadingFilesData = $uploadingFilesDataStore.get();
  $uploadingFilesDataStore.set([...uploadingFilesData, ...filesData]);
};

const deleteUploadingFileData = (id: UploadingFileData["assetId"]) => {
  const uploadingFilesData = $uploadingFilesDataStore.get();
  $uploadingFilesDataStore.set(
    uploadingFilesData.filter((fileData) => fileData.assetId !== id)
  );
};

const $assetContainers = computed(
  [$assets, $uploadingFilesDataStore],
  (assets, uploadingFilesData) => {
    const uploadingContainers: UploadingAssetContainer[] = [];

    for (const uploadingFile of uploadingFilesData) {
      uploadingContainers.push({
        status: "uploading",
        objectURL: uploadingFile.objectURL,
        asset: uploadingFileDataToAsset(uploadingFile),
      });
    }

    const uploadedContainers: UploadedAssetContainer[] = [];

    for (const asset of assets.values()) {
      uploadedContainers.push({
        status: "uploaded",
        asset,
      });
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
  fileOrUrl,
  onCompleted,
  onError,
}: {
  authToken: undefined | string;
  projectId: string;
  fileOrUrl: File | URL;
  onCompleted: (data: UploadData) => void;
  onError: (error: string) => void;
}) => {
  try {
    const mimeType = getMimeType(fileOrUrl);
    const fileName = getFileName(fileOrUrl);

    const metaFormData = new FormData();
    metaFormData.append("projectId", projectId);
    metaFormData.append("type", mimeType);
    // sanitizeS3Key here is just because of https://github.com/remix-run/remix/issues/4443
    // should be removed after fix
    metaFormData.append("filename", sanitizeS3Key(fileName));

    const metaResponse = await fetch(restAssetsPath({ authToken }), {
      method: "POST",
      body: metaFormData,
    });

    const metaData: { name: string } | { errors: string } =
      await metaResponse.json();

    if ("errors" in metaData) {
      throw Error(metaData.errors);
    }

    const body =
      fileOrUrl instanceof File
        ? fileOrUrl
        : JSON.stringify({ url: fileOrUrl.href });

    const headers = new Headers();

    if (fileOrUrl instanceof URL) {
      headers.set("Content-Type", "application/json");
    }

    const uploadResponse = await fetch(
      restAssetsUploadPath({ name: metaData.name }),
      {
        method: "POST",
        body,
        headers,
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

const handleAfterSubmit = (
  assetId: string,
  data: UploadData,
  projectId: string
) => {
  warnOnce(
    data.uploadedAssets?.length !== 1,
    "Expected exactly 1 uploaded asset"
  );

  const uploadedAsset = data.uploadedAssets?.[0];

  if (uploadedAsset === undefined) {
    warnOnce(true, "An uploaded asset is undefined");
    toast.error("Could not upload an asset");
    safeDeleteAssets([assetId], projectId);
    return;
  }

  // update store with new asset and set current id
  safeSetAsset({ ...uploadedAsset, id: assetId }, projectId);
};

const ToastMessage = ({
  assetId,
  objectURL,
  children,
  title,
}: {
  assetId: string;
  objectURL: string;
  children: string;
  title: string;
}) => {
  return (
    <Grid
      css={{
        gridTemplateColumns: "20% 1fr",
      }}
      gap={2}
    >
      <Image
        alt={children}
        objectURL={objectURL}
        name={""}
        assetId={assetId}
        width={64}
      />
      <Grid>
        <Text variant={"titles"}>{title}</Text>
        <Box
          css={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {children}
        </Box>
      </Grid>
    </Grid>
  );
};

const processingQueue: [
  filesData: UploadingFileData[],
  projectId: string,
  authToken: string | undefined,
][] = [];

const processUpload = async (
  filesData: UploadingFileData[],
  projectId: string,
  authToken: string | undefined
) => {
  processingQueue.push([filesData, projectId, authToken]);

  if (processingQueue.length > 1) {
    return;
  }

  while (processingQueue.length > 0) {
    const [filesData, projectId, authToken] = processingQueue.shift()!;

    const currentProjectId = $project.get()?.id;
    if (currentProjectId !== projectId) {
      toast.error("Project has been changed, files will not be uploaded");
      // Can cause data corrupiton
      continue;
    }

    for (const fileData of filesData) {
      const assetId = fileData.assetId;

      if ($assets.get().has(assetId)) {
        toast.warn(
          <ToastMessage
            title="Info"
            assetId={assetId}
            objectURL={fileData.objectURL}
          >
            Asset already exists
          </ToastMessage>
        );

        deleteUploadingFileData(assetId);
        continue;
      }

      await uploadAsset({
        authToken,
        projectId,
        fileOrUrl:
          fileData.source === "file" ? fileData.file : new URL(fileData.url),
        onCompleted: (data) => {
          URL.revokeObjectURL(fileData.objectURL);
          deleteUploadingFileData(assetId);
          handleAfterSubmit(assetId, data, projectId);
        },
        onError: (error) => {
          deleteUploadingFileData(assetId);
          toast.error(
            <ToastMessage
              title="Error"
              assetId={assetId}
              objectURL={fileData.objectURL}
            >
              {error}
            </ToastMessage>
          );

          safeDeleteAssets([assetId], projectId);
        },
      });
    }
  }
};

export async function uploadAssets(
  type: AssetType,
  files: File[]
): Promise<Map<File, string>>;

export async function uploadAssets(
  type: AssetType,
  urls: URL[]
): Promise<Map<URL, string>>;

/**
 * returns a list of asset ids that are being uploaded
 */
// eslint-disable-next-line func-style
export async function uploadAssets(
  type: AssetType,
  filesOrUrls: File[] | URL[]
): Promise<Map<URL | File, string>> {
  const projectId = $project.get()?.id;
  const authToken = $authToken.get();
  if (projectId === undefined) {
    return new Map();
  }

  const filesData = await getFilesData(type, filesOrUrls);

  // Filter out duplicates inside filesData
  const uniqFilesDataMap = new Map(
    filesData.map((fileData) => [fileData.assetId, fileData])
  );

  // Filter out duplicates existing in assets or uploading files
  const existingIds = [
    ...$assets.get().keys(),
    ...$uploadingFilesDataStore.get().map((fileData) => fileData.assetId),
  ];

  for (const existingAssetId of existingIds) {
    if (uniqFilesDataMap.has(existingAssetId)) {
      const fileData = uniqFilesDataMap.get(existingAssetId)!;
      uniqFilesDataMap.delete(existingAssetId);

      toast.warn(
        <ToastMessage
          title="Warning"
          assetId={fileData.assetId}
          objectURL={fileData.objectURL}
        >
          Asset already exists
        </ToastMessage>
      );
    }
  }

  const uniqFilesData = [...uniqFilesDataMap.values()];

  addUploadingFilesData(uniqFilesData);

  processUpload(uniqFilesData, projectId, authToken);

  const res = new Map();

  for (let i = 0; i < filesData.length; ++i) {
    const fileOrUrl = filesOrUrls[i];
    const fileData = filesData[i];

    invariant(
      fileOrUrl instanceof URL ||
        (fileOrUrl instanceof File &&
          fileData.source === "file" &&
          fileData.file === fileOrUrl)
    );
    invariant(
      fileOrUrl instanceof File ||
        (fileOrUrl instanceof URL &&
          fileData.source === "url" &&
          fileData.url === fileOrUrl.href)
    );

    res.set(filesOrUrls[i], filesData[i].assetId);
  }

  return res;
}

const filterByType = (assetContainers: AssetContainer[], type: AssetType) => {
  return assetContainers.filter((assetContainer) => {
    return assetContainer.asset.type === type;
  });
};

export const useAssets = (type: AssetType) => {
  const assetContainers = useStore($assetContainers);

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
