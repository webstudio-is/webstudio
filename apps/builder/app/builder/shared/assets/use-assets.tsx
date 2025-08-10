import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import warnOnce from "warn-once";
import invariant from "tiny-invariant";
import type { Asset, Page } from "@webstudio-is/sdk";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { Box, toast, css, theme } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { Image, wsImageLoader } from "@webstudio-is/image";
import type { ImageValue, StyleValue } from "@webstudio-is/css-engine";
import { restAssetsUploadPath, restAssetsPath } from "~/shared/router-utils";
import { fetch } from "~/shared/fetch.client";
import type { ActionData } from "~/builder/shared/assets";
import {
  $assets,
  $authToken,
  $pages,
  $project,
  $props,
  $styles,
  $uploadingFilesDataStore,
  type UploadingFileData,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import type {
  AssetContainer,
  UploadedAssetContainer,
  UploadingAssetContainer,
} from "./types";
import {
  formatAssetName,
  getFileName,
  getMimeType,
  getSha256Hash,
  getSha256HashOfFile,
  uploadingFileDataToAsset,
} from "./asset-utils";
import { mapGetOrInsert } from "~/shared/shim";

export type AssetUsage =
  | { type: "favicon" }
  | { type: "socialImage"; pageId: Page["id"] }
  | { type: "marketplaceThumbnail"; pageId: Page["id"] }
  | { type: "prop"; propId: string }
  | { type: "style"; styleDeclKey: string };

const traverseStyleValue = (
  styleValue: StyleValue,
  callback: (value: ImageValue) => void
) => {
  if (styleValue.type === "image") {
    callback(styleValue);
  }
  if (styleValue.type === "tuple") {
    for (const item of styleValue.value) {
      traverseStyleValue(item, callback);
    }
  }
  if (styleValue.type === "layers") {
    for (const item of styleValue.value) {
      traverseStyleValue(item, callback);
    }
  }
};

export const $usagesByAssetId = computed(
  [$pages, $props, $styles],
  (pages, props, styles) => {
    const usagesByAsset = new Map<Asset["id"], AssetUsage[]>();
    if (pages?.meta?.faviconAssetId) {
      const usages = mapGetOrInsert(
        usagesByAsset,
        pages.meta.faviconAssetId,
        []
      );
      usages.push({ type: "favicon" });
    }
    if (pages) {
      for (const page of [pages.homePage, ...pages.pages]) {
        if (page.meta.socialImageAssetId) {
          const usages = mapGetOrInsert(
            usagesByAsset,
            page.meta.socialImageAssetId,
            []
          );
          usages.push({ type: "socialImage", pageId: page.id });
        }
        if (page.marketplace?.thumbnailAssetId) {
          const usages = mapGetOrInsert(
            usagesByAsset,
            page.marketplace.thumbnailAssetId,
            []
          );
          usages.push({ type: "marketplaceThumbnail", pageId: page.id });
        }
      }
    }
    for (const prop of props.values()) {
      if (
        prop.type === "asset" &&
        // ignore width and height properties which are specific to size
        prop.name !== "width" &&
        prop.name !== "height"
      ) {
        const usages = mapGetOrInsert(usagesByAsset, prop.value, []);
        usages.push({ type: "prop", propId: prop.id });
      }
    }
    for (const [styleDeclKey, styleDecl] of styles) {
      traverseStyleValue(styleDecl.value, (imageValue) => {
        if (imageValue.value.type === "asset") {
          const usages = mapGetOrInsert(
            usagesByAsset,
            imageValue.value.value,
            []
          );
          usages.push({ type: "style", styleDeclKey });
        }
      });
    }
    return usagesByAsset;
  }
);

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

const getVideoDimensions = async (file: File) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = url;

    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: vid.videoWidth, height: vid.videoHeight });
    };
    vid.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid video file"));
    };
  });
};

const deduplicateAssetName = (name: string) => {
  const existingNames = new Set();
  for (const asset of $assets.get().values()) {
    existingNames.add(formatAssetName(asset));
  }
  // eslint-disable-next-line no-constant-condition
  for (let index = 0; true; index += 1) {
    const suffix = index === 0 ? "" : `_${index}`;
    const lastDotAt = name.lastIndexOf(".");
    if (lastDotAt === -1) {
      return name;
    }
    const basename = name.slice(0, lastDotAt);
    const ext = name.slice(lastDotAt);
    const nameWithSuffix = basename + suffix + ext;
    if (!existingNames.has(nameWithSuffix)) {
      return nameWithSuffix;
    }
  }
};

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
    metaFormData.append(
      "filename",
      deduplicateAssetName(sanitizeS3Key(fileName))
    );

    const authHeaders = new Headers();
    if (authToken !== undefined) {
      authHeaders.set("x-auth-token", authToken);
    }

    const metaResponse = await fetch(restAssetsPath(), {
      method: "POST",
      body: metaFormData,
      headers: authHeaders,
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

    const headers = new Headers(authHeaders);

    if (fileOrUrl instanceof URL) {
      headers.set("Content-Type", "application/json");
    }

    let width = undefined;
    let height = undefined;

    if (mimeType.startsWith("video/") && fileOrUrl instanceof File) {
      const videoSize = await getVideoDimensions(fileOrUrl);
      width = videoSize.width;
      height = videoSize.height;
    }

    const uploadResponse = await fetch(
      restAssetsUploadPath({ name: metaData.name, width, height }),
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

const imageWidth = css({
  maxWidth: "100%",
});

const ToastImageInfo = ({ objectURL }: { objectURL: string }) => {
  return (
    <Box css={{ width: theme.spacing[18] }}>
      <Image
        className={imageWidth()}
        src={objectURL}
        optimize={false}
        width={64}
        loader={wsImageLoader}
      />
    </Box>
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
        toast.info("Asset already exists", {
          icon: <ToastImageInfo objectURL={fileData.objectURL} />,
        });

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
          toast.error(error, {
            icon: <ToastImageInfo objectURL={fileData.objectURL} />,
          });

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
      toast.info("Asset already exists", {
        icon: <ToastImageInfo objectURL={fileData.objectURL} />,
      });
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
