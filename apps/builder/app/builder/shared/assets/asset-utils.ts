import type {
  Asset,
  FontAsset,
  ImageAsset,
  AllowedFileExtension,
} from "@webstudio-is/sdk";
import { nanoid } from "nanoid";
import {
  getMimeTypeByExtension,
  IMAGE_EXTENSIONS,
  detectAssetType,
  getAssetUrl,
} from "@webstudio-is/sdk";
import type { UploadingFileData } from "~/shared/nano-states";

export { detectAssetType, getAssetUrl };

export const getImageNameAndType = (fileName: string) => {
  // Extract extension from filename
  const extractedExt = fileName.split(".").pop()?.toLowerCase();

  if (!extractedExt) {
    return;
  }

  // Check if it's a valid image extension
  if (!IMAGE_EXTENSIONS.includes(extractedExt as AllowedFileExtension)) {
    return;
  }

  return [getMimeTypeByExtension(extractedExt)!, fileName] as const;
};

const extractImageNameAndMimeTypeFromUrl = (url: URL) => {
  const nameFromPath = url.pathname
    .split("/")
    .map(getImageNameAndType)
    .filter(Boolean)[0];

  if (nameFromPath != null) {
    return nameFromPath;
  }

  const nameFromSearchParams = [...url.searchParams.values()]
    .map(getImageNameAndType)
    .filter(Boolean)[0];

  if (nameFromSearchParams != null) {
    return nameFromSearchParams;
  }

  // Any image format is suitable
  const FALLBACK_URL_TYPE = "image/png";

  return [FALLBACK_URL_TYPE, `${nanoid()}.png`] as const;
};

const bufferToHex = (buffer: ArrayBuffer) => {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const getSha256Hash = async (data: string) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return bufferToHex(hashBuffer);
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

export const getSha256HashOfFile = async (file: File) => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return bufferToHex(hashBuffer);
};

export const getMimeType = (file: File | URL) => {
  if (file instanceof File) {
    return file.type;
  }

  return extractImageNameAndMimeTypeFromUrl(file)[0];
};

export const getFileName = (file: File | URL) => {
  if (file instanceof File) {
    return file.name;
  }

  return extractImageNameAndMimeTypeFromUrl(file)[1];
};

export const uploadingFileDataToAsset = (
  fileData: UploadingFileData
): Asset => {
  const fileOrUrl =
    fileData.source === "file" ? fileData.file : new URL(fileData.url);
  const fileName = getFileName(fileOrUrl);
  const mimeType = getMimeType(fileOrUrl);

  // Extract format from MIME type if available, otherwise from filename extension
  let format = mimeType.split("/")[1];
  if (!format) {
    // Fallback to file extension if MIME type doesn't provide format
    const match = fileName.match(/\.([^.]+)$/);
    format = match ? match[1].toLowerCase() : "";
  }

  const assetType = detectAssetType(fileName);

  if (assetType === "video") {
    // Videos should be file type, not image type
    const asset: Asset = {
      id: fileData.assetId,
      name: fileName,
      format,
      type: "file",
      description: "",
      createdAt: "",
      projectId: "",
      size: 0,
      meta: {},
    };

    return asset;
  }

  if (assetType === "image") {
    const asset: ImageAsset = {
      id: fileData.assetId,
      name: fileName,
      format,
      type: "image",
      description: "",
      createdAt: "",
      projectId: "",
      size: 0,

      meta: {
        width: Number.NaN,
        height: Number.NaN,
      },
    };

    return asset;
  }

  if (assetType === "font") {
    const asset: FontAsset = {
      id: fileData.assetId,
      name: fileName,
      format: format as FontAsset["format"],
      type: "font",
      description: "",
      createdAt: "",
      projectId: "",
      size: 0,
      meta: {
        family: "system",
        style: "normal",
        weight: 400,
      },
    };

    return asset;
  }

  // Default to file type for all other types (documents, code, audio, etc.)
  const asset: Asset = {
    id: fileData.assetId,
    name: fileName,
    format,
    type: "file",
    description: "",
    createdAt: "",
    projectId: "",
    size: 0,
    meta: {},
  };

  return asset;
};

type ParsedAssetName = {
  basename: string;
  hash: string;
  ext: string;
};

export const parseAssetName = (name: string): ParsedAssetName => {
  let hash = "";
  let ext = "";
  const lastDotAt = name.lastIndexOf(".");
  if (lastDotAt > -1) {
    ext = name.slice(lastDotAt + 1);
    name = name.slice(0, lastDotAt);
  }
  const lastUnderscoreAt = name.lastIndexOf("_");
  if (lastUnderscoreAt > -1) {
    hash = name.slice(lastUnderscoreAt + 1);
    name = name.slice(0, lastUnderscoreAt);
  }
  return { basename: name, hash, ext };
};

export const formatAssetName = (asset: Pick<Asset, "name" | "filename">) => {
  const { basename, ext } = parseAssetName(asset.name);
  const formattedName = `${asset.filename ?? basename}.${ext}`;
  return formattedName;
};
