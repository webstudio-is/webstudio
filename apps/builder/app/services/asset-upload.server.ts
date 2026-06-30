import { z } from "zod";
import {
  ALLOWED_FILE_TYPES,
  assetType,
  isAllowedMimeCategory,
  RESIZABLE_IMAGE_MIME_TYPES,
} from "@webstudio-is/sdk";

const urlBody = z.object({
  url: z.string(),
});

export const parseAssetType = (value: string | null) => {
  const result = assetType.safeParse(value);
  return result.success ? result.data : undefined;
};

export type AssetInfoFallback =
  | { width: number; height: number; format: string }
  | undefined;

export const getAssetInfoFallback = ({
  format,
  searchParams,
}: {
  format: string | undefined;
  searchParams: URLSearchParams;
}): AssetInfoFallback => {
  const width = Number.parseInt(searchParams.get("width") ?? "", 10);
  const height = Number.parseInt(searchParams.get("height") ?? "", 10);
  if (
    Number.isFinite(width) === false ||
    Number.isFinite(height) === false ||
    format === undefined
  ) {
    return;
  }
  return { width, height, format };
};

export const getBrowserUploadBody = async (
  request: Request,
  contentType: string | null
) => {
  let body = request.body;
  if (body === null) {
    throw new Error("Asset body is empty");
  }

  if (contentType?.includes("application/json")) {
    const jsonBody = await request.json();
    const urlParse = urlBody.safeParse(jsonBody);

    if (urlParse.success) {
      const { url } = urlParse.data;
      const imageRequest = await fetch(url, {
        method: "GET",
        headers: {
          Accept: RESIZABLE_IMAGE_MIME_TYPES.join(","),
        },
      });

      if (imageRequest.ok === false) {
        const error = await imageRequest.text();
        throw new Error(
          `An error occurred while fetching the image at ${url}: ${error.slice(0, 500)}`
        );
      }

      if (imageRequest.body === null) {
        throw new Error(
          `An error occurred while fetching the image at ${url}: Image body is null`
        );
      }

      body = imageRequest.body;
    } else {
      body = new Blob([JSON.stringify(jsonBody)], {
        type: "application/json",
      }).stream();
    }
  }

  return body;
};

export const getBrowserAssetFormat = ({
  contentType,
  name,
}: {
  contentType: string | null;
  name: string;
}) => {
  const fileExtension = name.split(".").pop()?.toLowerCase();
  const correctMimeType =
    ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES] ??
    contentType?.split(";")[0];

  const contentTypeArr = correctMimeType?.split("/") ?? [];
  const mimeCategory = contentTypeArr[0];
  if (mimeCategory && correctMimeType && !isAllowedMimeCategory(mimeCategory)) {
    throw new Error(`MIME type "${mimeCategory}/*" is not allowed`);
  }

  return contentTypeArr[0] === "video" ? contentTypeArr[1] : undefined;
};
