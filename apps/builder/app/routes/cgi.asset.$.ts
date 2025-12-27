import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { createReadableStreamFromReadable } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import {
  getMimeTypeByFilename,
  isAllowedExtension,
  decodePathFragment,
} from "@webstudio-is/sdk";
import { fileUploadPath } from "~/shared/asset-client";
import env from "~/env/env.server";

// This route serves generic assets without processing
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const basePath = `/cgi/asset/`;

  const url = new URL(request.url);
  const name = decodePathFragment(url.pathname.slice(basePath.length));

  // Allow direct asset access, and from the same origin
  const refererRawUrl = request.headers.get("referer");
  const refererUrl = refererRawUrl === null ? url : new URL(refererRawUrl);
  if (refererUrl.host !== url.host) {
    throw new Response("Forbidden", {
      status: 403,
    });
  }

  // In production, proxy to the storage origin (R2/S3)
  if (env.RESIZE_ORIGIN !== undefined) {
    const assetUrl = new URL(env.RESIZE_ORIGIN + url.pathname);

    const response = await fetch(assetUrl.href, {
      headers: {
        accept: request.headers.get("accept") ?? "",
        "accept-encoding": request.headers.get("accept-encoding") ?? "",
      },
    });

    if (!response.ok) {
      console.error(
        `Request to asset url ${assetUrl.href} responded with status = ${response.status}`
      );
      throw new Response("Not found", {
        status: response.status,
      });
    }

    // Override content-type from storage with correct MIME type based on filename
    const contentType = getMimeTypeByFilename(name);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("content-type", contentType);
    responseHeaders.set("Access-Control-Allow-Origin", url.origin);

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  // Support absolute urls locally
  if (URL.canParse(name)) {
    return fetch(name);
  }

  const filePath = join(process.cwd(), fileUploadPath, name);

  if (existsSync(filePath) === false) {
    throw new Response("Not found", {
      status: 404,
    });
  }

  // Validate file extension against allowed types
  const extension = name.split(".").pop()?.toLowerCase();
  const contentType = getMimeTypeByFilename(name);

  // Reject files with disallowed extensions or MIME types
  if (
    contentType === "application/octet-stream" ||
    !extension ||
    !isAllowedExtension(extension)
  ) {
    throw new Response("File type not allowed", {
      status: 403,
    });
  }

  return new Response(
    createReadableStreamFromReadable(createReadStream(filePath)),
    {
      headers: {
        "content-type": contentType,
        "Access-Control-Allow-Origin": url.origin,
      },
    }
  );
};
