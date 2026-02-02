import { z } from "zod";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { uploadFile } from "@webstudio-is/asset-uploader/index.server";
import {
  isAllowedMimeCategory,
  RESIZABLE_IMAGE_MIME_TYPES,
  ALLOWED_FILE_TYPES,
} from "@webstudio-is/sdk";
import type { AssetActionResponse } from "~/builder/shared/assets";
import { createAssetClient } from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { parseError } from "~/shared/error/error-parse";

const UrlBody = z.object({
  url: z.string(),
});

export const action = async (
  props: ActionFunctionArgs
): Promise<AssetActionResponse> => {
  preventCrossOriginCookie(props.request);
  await checkCsrf(props.request);

  const { request, params } = props;

  // await new Promise((resolve) => setTimeout(resolve, 20000));

  if (params.name === undefined) {
    throw new Error("Name is undefined");
  }

  try {
    if (request.method === "POST" && request.body !== null) {
      let body = request.body;

      const contentType = request.headers.get("Content-Type");

      // Check if this is a request to download from URL (has url field in JSON body)
      // vs uploading a JSON file directly (JSON file content in body)
      if (contentType?.includes("application/json")) {
        const jsonBody = await request.json();
        const urlParse = UrlBody.safeParse(jsonBody);

        // Only fetch from URL if the body has a valid url field
        if (urlParse.success) {
          const { url } = urlParse.data;

          const imageRequest = await fetch(url, {
            method: "GET",
            headers: {
              Accept: RESIZABLE_IMAGE_MIME_TYPES.join(","),
            },
          });

          if (false === imageRequest.ok) {
            const error = await imageRequest.text();
            const errors = `An error occurred while fetching the image at ${url}: ${error.slice(0, 500)}`;
            throw new Error(errors);
          }

          if (imageRequest.body === null) {
            throw new Error(
              `An error occurred while fetching the image at ${url}: Image body is null`
            );
          }

          body = imageRequest.body;
        } else {
          // This is a JSON file being uploaded, use the JSON content as body
          body = new Blob([JSON.stringify(jsonBody)], {
            type: "application/json",
          }).stream();
        }
      }

      const url = new URL(request.url);

      // Get file extension from filename
      const fileExtension = params.name.split(".").pop()?.toLowerCase();

      // Use the file extension to determine the correct MIME type
      // This handles cases where browsers send legacy MIME types (e.g., application/font-woff instead of font/woff)
      const correctMimeType = fileExtension
        ? ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES]
        : contentType?.split(";")[0];

      const contentTypeArr = correctMimeType?.split("/") ?? [];

      // Validate MIME type against allowed categories
      const mimeCategory = contentTypeArr[0];
      if (
        mimeCategory &&
        correctMimeType &&
        !isAllowedMimeCategory(mimeCategory)
      ) {
        throw new Error(`MIME type "${mimeCategory}/*" is not allowed`);
      }

      const format =
        contentTypeArr[0] === "video" ? contentTypeArr[1] : undefined;

      const width = url.searchParams.has("width")
        ? Number.parseInt(url.searchParams.get("width")!, 10)
        : undefined;
      const height = url.searchParams.has("height")
        ? Number.parseInt(url.searchParams.get("height")!, 10)
        : undefined;

      const assetInfoFallback =
        height !== undefined && width !== undefined && format !== undefined
          ? { width, height, format }
          : undefined;

      const context = await createContext(request);
      const asset = await uploadFile(
        params.name,
        body,
        createAssetClient(),
        context,
        assetInfoFallback
      );
      return {
        uploadedAssets: [asset],
      };
    }
  } catch (error) {
    console.error(error);

    return {
      errors: parseError(error).message,
    };
  }

  return {
    errors: "Method not allowed",
  };
};
