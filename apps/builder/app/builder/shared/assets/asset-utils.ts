import { nanoid } from "nanoid";

const extensionToMime = new Map([
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
] as const);

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
