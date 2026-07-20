import warnOnce from "warn-once";
import invariant from "tiny-invariant";
import { getFileNameParts, type Asset } from "@webstudio-is/sdk";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { Box, toast, css, theme } from "@webstudio-is/design-system";
import { sanitizeS3Key } from "@webstudio-is/asset-uploader";
import { Image, wsImageLoader } from "@webstudio-is/image";
import { restAssetsUploadPath, restAssetsPath } from "~/shared/router-utils";
import { fetch } from "~/shared/fetch.client";
import type { AssetActionResponse } from "~/builder/shared/assets";
import {
  $authToken,
  $uploadingFilesDataStore,
  type UploadingFileData,
} from "~/shared/nano-states";
import { $assetFolders, $assets } from "~/shared/sync/data-stores";
import { $project } from "~/shared/sync/data-stores";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { formatAssetName } from "@webstudio-is/project-build/runtime";
import {
  getFileName,
  getFileUploadFingerprint,
  getMimeType,
  getSha256Hash,
} from "./asset-utils";

const safeDeleteAssets = (assetIds: Asset["id"][], projectId: string) => {
  const currentProjectId = $project.get()?.id;

  if (currentProjectId !== projectId) {
    toast.error("Project has been changed, files will not be uploaded");
    // Can cause data corruption
    return;
  }

  executeRuntimeMutation({
    id: "assets.delete",
    input: { assetIdsOrPrefixes: assetIds, force: true },
  });

  onNextTransactionComplete(() => {
    invalidateAssets();
  });
};

const safeSetAsset = (asset: Asset, projectId: string) => {
  const currentProjectId = $project.get()?.id;

  if (currentProjectId !== projectId) {
    toast.error("Project has been changed, files will not be uploaded");
    // Can cause data corrupiton
    return;
  }

  const folderId =
    asset.folderId !== undefined && $assetFolders.get().has(asset.folderId)
      ? asset.folderId
      : undefined;
  executeRuntimeMutation({
    id: "assets.add",
    input: { asset: { ...asset, folderId } },
  });

  onNextTransactionComplete(() => {
    invalidateAssets();
  });
};

const getFilesData = async <T extends File | URL>(
  type: AssetType,
  filesOrUrls: T[],
  folderId?: string
): Promise<UploadingFileData[]> => {
  const filesData: UploadingFileData[] = [];
  for (const fileOrUrl of filesOrUrls) {
    if (fileOrUrl instanceof File) {
      const fingerprintId = await getFileUploadFingerprint(fileOrUrl);
      filesData.push({
        source: "file" as const,
        assetId: "",
        fingerprintId,
        uploadName: "",
        type,
        file: fileOrUrl,
        objectURL: URL.createObjectURL(fileOrUrl),
        folderId,
      });
      continue;
    }

    const fingerprintId = await getSha256Hash(fileOrUrl.href);
    filesData.push({
      source: "url" as const,
      assetId: "",
      fingerprintId,
      uploadName: "",
      type,
      url: fileOrUrl.href,
      objectURL: fileOrUrl.href,
      folderId,
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

const getUniqueFilesData = (
  filesData: UploadingFileData[],
  revokeObjectURL = URL.revokeObjectURL
) => {
  const uniqueFilesData = new Map<string, UploadingFileData>();
  for (const fileData of filesData) {
    if (uniqueFilesData.has(fileData.fingerprintId)) {
      revokeObjectURL(fileData.objectURL);
      continue;
    }
    uniqueFilesData.set(fileData.fingerprintId, fileData);
  }
  return uniqueFilesData;
};

export const waitForAssetUpload = (assetId: string): Promise<Asset> => {
  const existingAsset = $assets.get().get(assetId);
  if (existingAsset !== undefined) {
    return Promise.resolve(existingAsset);
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      unsubscribeAssets();
      unsubscribeUploads();
    };
    const check = () => {
      const asset = $assets.get().get(assetId);
      if (asset !== undefined) {
        cleanup();
        resolve(asset);
        return;
      }

      const isUploading = $uploadingFilesDataStore
        .get()
        .some((fileData) => fileData.assetId === assetId);
      if (isUploading === false) {
        cleanup();
        reject(new Error("Failed to upload asset"));
      }
    };
    const unsubscribeAssets = $assets.listen(check);
    const unsubscribeUploads = $uploadingFilesDataStore.listen(check);
    check();
  });
};

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

const deduplicateAssetName = (name: string, existingNames: Set<string>) => {
  const { basename, extension } = getFileNameParts(name);
  const extensionWithDot = extension === "" ? "" : `.${extension}`;
  // eslint-disable-next-line no-constant-condition
  for (let index = 0; true; index += 1) {
    const suffix = index === 0 ? "" : `_${index}`;
    const nameWithSuffix = basename + suffix + extensionWithDot;
    if (!existingNames.has(nameWithSuffix)) {
      return nameWithSuffix;
    }
  }
};

const createAssetUploadHeaders = (authToken: undefined | string) => {
  const headers = new Headers();
  if (authToken !== undefined) {
    headers.set("x-auth-token", authToken);
  }
  return headers;
};

const submitAssetUpload = async ({
  authToken,
  uploadName,
  fileOrUrl,
  onCompleted,
  onError,
  request = fetch,
}: {
  authToken: undefined | string;
  uploadName: string;
  fileOrUrl: File | URL;
  onCompleted: (data: AssetActionResponse) => void;
  onError: (error: string) => void;
  request?: typeof fetch;
}) => {
  try {
    const mimeType = getMimeType(fileOrUrl);
    const authHeaders = createAssetUploadHeaders(authToken);

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

    const uploadResponse = await request(
      restAssetsUploadPath({ name: uploadName, width, height }),
      {
        method: "POST",
        body,
        headers,
      }
    );

    const uploadData: AssetActionResponse = await uploadResponse.json();

    if ("errors" in uploadData) {
      throw Error(uploadData.errors);
    }

    onCompleted(uploadData);
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
  }
};

type UploadTicket = {
  assetId: Asset["id"];
  name: string;
};

const createUploadTicket = async ({
  authToken,
  projectId,
  fileOrUrl,
  assetType,
  request = fetch,
}: {
  authToken: undefined | string;
  projectId: string;
  fileOrUrl: File | URL;
  assetType: AssetType;
  request?: typeof fetch;
}): Promise<UploadTicket> => {
  const fileName = getFileName(fileOrUrl);
  const metaFormData = new FormData();
  metaFormData.append("projectId", projectId);
  metaFormData.append("type", assetType);
  const existingNames = new Set<string>();
  for (const asset of $assets.get().values()) {
    existingNames.add(formatAssetName(asset));
  }
  const deduplicatedFilename = deduplicateAssetName(fileName, existingNames);
  // sanitizeS3Key here is just because of https://github.com/remix-run/remix/issues/4443
  // should be removed after fix
  metaFormData.append("filename", sanitizeS3Key(deduplicatedFilename));
  metaFormData.append(
    "displayFilename",
    getFileNameParts(deduplicatedFilename).basename
  );

  const authHeaders = createAssetUploadHeaders(authToken);

  const metaResponse = await request(restAssetsPath(), {
    method: "POST",
    body: metaFormData,
    headers: authHeaders,
  });

  const metaData: UploadTicket | { errors: string } = await metaResponse.json();

  if ("errors" in metaData) {
    throw Error(metaData.errors);
  }

  return metaData;
};

const handleAfterSubmit = (
  assetId: string,
  data: AssetActionResponse,
  projectId: string,
  folderId?: string
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
  safeSetAsset(
    { ...uploadedAsset, id: uploadedAsset.id || assetId, folderId },
    projectId
  );
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
      for (const fileData of filesData) {
        URL.revokeObjectURL(fileData.objectURL);
        deleteUploadingFileData(fileData.assetId);
      }
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

      await submitAssetUpload({
        authToken,
        uploadName: fileData.uploadName,
        fileOrUrl:
          fileData.source === "file" ? fileData.file : new URL(fileData.url),
        onCompleted: (data) => {
          URL.revokeObjectURL(fileData.objectURL);
          handleAfterSubmit(assetId, data, projectId, fileData.folderId);
          deleteUploadingFileData(assetId);
        },
        onError: (error) => {
          URL.revokeObjectURL(fileData.objectURL);
          deleteUploadingFileData(assetId);
          toast.error(error);

          safeDeleteAssets([assetId], projectId);
        },
      });
    }
  }
};

export const uploadAssets = async <T extends File | URL>(
  type: AssetType,
  filesOrUrls: T[],
  options: { folderId?: string } = {}
): Promise<Map<T, string>> => {
  const projectId = $project.get()?.id;
  const authToken = $authToken.get();
  if (projectId === undefined) {
    return new Map();
  }

  const filesData = await getFilesData(type, filesOrUrls, options.folderId);

  // Filter out duplicates inside filesData
  const uniqueFilesDataByFingerprint = getUniqueFilesData(filesData);

  // Filter out duplicates already being uploaded
  const existingUploadsByFingerprint = new Map(
    $uploadingFilesDataStore
      .get()
      .map((fileData) => [fileData.fingerprintId, fileData])
  );

  for (const [
    fingerprintId,
    existingFileData,
  ] of existingUploadsByFingerprint) {
    const fileData = uniqueFilesDataByFingerprint.get(fingerprintId);
    if (fileData === undefined) {
      continue;
    }
    uniqueFilesDataByFingerprint.delete(fingerprintId);
    URL.revokeObjectURL(fileData.objectURL);
    toast.info("Asset already exists", {
      icon: <ToastImageInfo objectURL={existingFileData.objectURL} />,
    });
  }

  const uniqueFilesData = [...uniqueFilesDataByFingerprint.values()];

  const uploadTickets = new Map<
    UploadingFileData["fingerprintId"],
    UploadTicket
  >();
  const ticketedFilesData: UploadingFileData[] = [];
  for (const fileData of uniqueFilesData) {
    try {
      const ticket = await createUploadTicket({
        authToken,
        projectId,
        fileOrUrl:
          fileData.source === "file" ? fileData.file : new URL(fileData.url),
        assetType: fileData.type,
      });
      fileData.assetId = ticket.assetId;
      fileData.uploadName = ticket.name;
      uploadTickets.set(fileData.fingerprintId, ticket);
      ticketedFilesData.push(fileData);
    } catch (error) {
      URL.revokeObjectURL(fileData.objectURL);
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  addUploadingFilesData(ticketedFilesData);

  processUpload(ticketedFilesData, projectId, authToken);

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

    const uploadedAssetId =
      uploadTickets.get(filesData[i].fingerprintId)?.assetId ??
      existingUploadsByFingerprint.get(filesData[i].fingerprintId)?.assetId;
    if (uploadedAssetId !== undefined) {
      res.set(filesOrUrls[i], uploadedAssetId);
    }
  }

  return res;
};

export const uploadSingleAsset = async (
  type: AssetType,
  file: File,
  options: { folderId?: string } = {}
): Promise<Asset | undefined> => {
  const assetId = (await uploadAssets(type, [file], options)).get(file);
  return assetId === undefined ? undefined : waitForAssetUpload(assetId);
};

export const __testing__ = {
  createUploadTicket,
  deduplicateAssetName,
  getFilesData,
  getUniqueFilesData,
  submitAssetUpload,
};
