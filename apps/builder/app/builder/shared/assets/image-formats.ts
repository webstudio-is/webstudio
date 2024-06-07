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

export const extractImageNameAndMimeTypeFromUrl = (url: URL) => {
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
