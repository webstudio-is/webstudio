import type { Asset, FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";
import type { UploadingFileData } from "~/shared/nano-states";

const videoExtensionToMime = [
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mpg", "video/mpeg"],
  [".mpeg", "video/mpeg"],
  [".mov", "video/quicktime"],
] as const;

const extensionToMime = new Map([
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  // Support video formats as images
  ...videoExtensionToMime,
] as const);

export const isVideoFormat = (format: string) => {
  return videoExtensionToMime.some(([extension]) => extension.includes(format));
};

const extensions = [...extensionToMime.keys()];

export const imageMimeTypes = [...extensionToMime.values()];

export const getImageNameAndType = (fileName: string) => {
  const extension = extensions.find((ext) => fileName.endsWith(ext));

  if (extension == null) {
    return;
  }

  return [extensionToMime.get(extension)!, fileName] as const;
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
  const mimeType = getMimeType(
    fileData.source === "file" ? fileData.file : new URL(fileData.url)
  );
  const format = mimeType.split("/")[1];

  if (mimeType.startsWith("video/")) {
    // Use image type for now
    const asset: ImageAsset = {
      id: fileData.assetId,
      name: fileData.objectURL,
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

  if (mimeType.startsWith("image/")) {
    const asset: ImageAsset = {
      id: fileData.assetId,
      name: fileData.objectURL,
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

  const asset: FontAsset = {
    id: fileData.assetId,
    name: fileData.objectURL,
    format: "woff2",
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
