import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { createReadableStreamFromReadable } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import {
  getMimeTypeByFilename,
  isAllowedExtension,
} from "@webstudio-is/asset-uploader";
import env from "~/env/env.server";
import { fileUploadPath } from "~/shared/asset-client";

const decodePathFragment = (fragment: string) => {
  const decoded = decodeURIComponent(fragment);

  // Prevent path traversal attacks
  if (decoded.includes("..") || decoded.startsWith("/")) {
    throw new Error("Invalid file path");
  }

  return decoded;
};

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

  // If RESIZE_ORIGIN is set, proxy the request
  if (env.RESIZE_ORIGIN !== undefined) {
    const assetUrl = new URL(`${env.RESIZE_ORIGIN}/cgi/asset/${name}`);

    const response = await fetch(assetUrl.href, {
      headers: {
        accept: request.headers.get("accept") ?? "",
        "accept-encoding": request.headers.get("accept-encoding") ?? "",
      },
    });

    const responseWHeaders = new Response(response.body, response);

    if (false === responseWHeaders.ok) {
      console.error(
        `Request to Asset url ${assetUrl.href} responded with status = ${responseWHeaders.status}`
      );
    }

    responseWHeaders.headers.set("Access-Control-Allow-Origin", url.origin);

    return responseWHeaders;
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
