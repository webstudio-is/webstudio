import { z } from "zod";
import { arrayBuffer } from "node:stream/consumers";
import { createSizeLimiter } from "@webstudio-is/asset-uploader/server";
import {
  getAssetContentHash,
  RESIZABLE_IMAGE_MIME_TYPES,
} from "@webstudio-is/sdk";
import { getMaxAssetUploadSize } from "~/shared/asset-client";

const urlBody = z.object({
  url: z.string(),
});

export const getUrlAssetBody = async (url: string) => {
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
  return imageRequest.body;
};

export const getUrlAssetContentHash = async (url: string, filename: string) => {
  const body = await getUrlAssetBody(url);
  const bytes = new Uint8Array(
    await arrayBuffer(
      createSizeLimiter(
        getMaxAssetUploadSize(),
        filename
      )(body as unknown as AsyncIterable<Uint8Array>)
    )
  );
  return getAssetContentHash(bytes);
};

export const getBrowserUploadBody = async (
  request: Request,
  contentType: string | null
) => {
  const body = request.body;
  if (body === null) {
    throw new Error("Asset body is empty");
  }

  if (request.headers.get("x-webstudio-asset-source") !== "url") {
    return body;
  }
  if (contentType?.includes("application/json") !== true) {
    throw new Error("Invalid URL asset upload content type");
  }

  const urlParse = urlBody.safeParse(await request.json());
  if (urlParse.success === false) {
    throw new Error("Invalid URL asset upload body");
  }

  return getUrlAssetBody(urlParse.data.url);
};
