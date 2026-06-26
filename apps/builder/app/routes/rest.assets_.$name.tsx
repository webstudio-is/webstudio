import { z } from "zod";
import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import {
  createUploadName,
  uploadFile,
  type UploadErrorCleanup,
} from "@webstudio-is/asset-uploader/index.server";
import {
  isAllowedMimeCategory,
  RESIZABLE_IMAGE_MIME_TYPES,
  ALLOWED_FILE_TYPES,
  assetType,
} from "@webstudio-is/sdk";
import { isAssetFileName } from "@webstudio-is/protocol";
import type { AssetActionResponse } from "~/builder/shared/assets";
import { createAssetClient } from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { parseError } from "~/shared/error/error-parse";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { assertApiProjectPermit } from "~/services/api-permits.server";

const urlBody = z.object({
  url: z.string(),
});

const parseAssetType = (value: string | null) => {
  const result = assetType.safeParse(value);
  return result.success ? result.data : undefined;
};

type AssetInfoFallback =
  | { width: number; height: number; format: string }
  | undefined;

const getAssetInfoFallback = ({
  format,
  searchParams,
}: {
  format: string | undefined;
  searchParams: URLSearchParams;
}) => {
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

const createAssetUploadResponse = async ({
  body,
  context,
  name,
  assetInfoFallback,
  onUploadError,
}: {
  body: ReadableStream<Uint8Array>;
  context: Awaited<ReturnType<typeof createContext>>;
  name: string;
  assetInfoFallback: AssetInfoFallback;
  onUploadError?: UploadErrorCleanup;
}) => {
  const asset = await uploadFile(
    name,
    body,
    createAssetClient(),
    context,
    assetInfoFallback,
    onUploadError
  );
  return json({ uploadedAssets: [asset] } satisfies AssetActionResponse, {
    headers: privateNoStoreResponseHeaders,
  });
};

const createApiUploadErrorCleanup =
  (assetId: string, projectId: string): UploadErrorCleanup =>
  async (name, context) => {
    const deleteAsset = await context.postgrest.client
      .from("Asset")
      .delete()
      .eq("id", assetId)
      .eq("projectId", projectId);
    if (deleteAsset.error) {
      throw deleteAsset.error;
    }
    const deleteFile = await context.postgrest.client
      .from("File")
      .delete()
      .eq("name", name);
    if (deleteFile.error) {
      throw deleteFile.error;
    }
  };

const getBrowserUploadBody = async (
  request: Request,
  contentType: string | null
) => {
  let body = request.body;
  if (body === null) {
    throw new Error("Asset body is empty");
  }

  // Check if this is a request to download from URL (has url field in JSON body)
  // vs uploading a JSON file directly (JSON file content in body)
  if (contentType?.includes("application/json")) {
    const jsonBody = await request.json();
    const urlParse = urlBody.safeParse(jsonBody);

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

  return body;
};

const getBrowserAssetFormat = ({
  contentType,
  name,
}: {
  contentType: string | null;
  name: string;
}) => {
  // Get file extension from filename
  const fileExtension = name.split(".").pop()?.toLowerCase();

  // Use the file extension to determine the correct MIME type
  // This handles cases where browsers send legacy MIME types (e.g., application/font-woff instead of font/woff)
  const correctMimeType =
    ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES] ??
    contentType?.split(";")[0];

  const contentTypeArr = correctMimeType?.split("/") ?? [];

  // Validate MIME type against allowed categories
  const mimeCategory = contentTypeArr[0];
  if (mimeCategory && correctMimeType && !isAllowedMimeCategory(mimeCategory)) {
    throw new Error(`MIME type "${mimeCategory}/*" is not allowed`);
  }

  return contentTypeArr[0] === "video" ? contentTypeArr[1] : undefined;
};

export const action = async (props: ActionFunctionArgs) => {
  preventCrossOriginCookie(props.request);

  const { request, params } = props;

  if (params.name === undefined) {
    throw new Error("Name is undefined");
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const rawAssetType = url.searchParams.get("type");
  const isApiUpload = projectId !== null || rawAssetType !== null;

  if (isApiUpload === false) {
    await checkCsrf(request);
  }

  try {
    if (request.method !== "POST" || request.body === null) {
      return json(
        { errors: "Method not allowed" } satisfies AssetActionResponse,
        { status: 405, headers: privateNoStoreResponseHeaders }
      );
    }

    const assetType = parseAssetType(rawAssetType);

    if (isApiUpload) {
      if (isAssetFileName(params.name) === false) {
        throw new Error("Asset name is invalid");
      }
      if (projectId === null) {
        throw new Error("Project id is required");
      }
      const assetId = url.searchParams.get("assetId");
      if (assetId === null) {
        throw new Error("Asset id is required");
      }
      if (assetType === undefined) {
        throw new Error("Asset type is invalid");
      }
      const assetInfoFallback = getAssetInfoFallback({
        format:
          assetType === "image"
            ? (url.searchParams.get("format") ?? undefined)
            : undefined,
        searchParams: url.searchParams,
      });

      const context = await createContext(request);
      await assertApiProjectPermit(context, projectId, "build");
      const uploadName = await createUploadName(
        {
          assetId,
          projectId,
          type: assetType,
          filename: params.name,
        },
        context
      );
      return await createAssetUploadResponse({
        body: request.body,
        context,
        name: uploadName,
        assetInfoFallback,
        onUploadError: createApiUploadErrorCleanup(assetId, projectId),
      });
    }

    const contentType = request.headers.get("Content-Type");
    const body = await getBrowserUploadBody(request, contentType);
    const format = getBrowserAssetFormat({ contentType, name: params.name });
    const assetInfoFallback = getAssetInfoFallback({
      format,
      searchParams: url.searchParams,
    });

    const context = await createContext(request);
    return await createAssetUploadResponse({
      body,
      context,
      name: params.name,
      assetInfoFallback,
    });
  } catch (error) {
    console.error(error);
    return json(
      { errors: parseError(error).message } satisfies AssetActionResponse,
      { headers: privateNoStoreResponseHeaders }
    );
  }
};

export const __testing__ = {
  getAssetInfoFallback,
  getBrowserAssetFormat,
  getBrowserUploadBody,
  parseAssetType,
};
