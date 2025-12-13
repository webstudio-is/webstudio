import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { createReadableStreamFromReadable } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import env from "~/env/env.server";
import { fileUploadPath } from "~/shared/asset-client";

const decodePathFragment = (fragment: string) => {
  return decodeURIComponent(fragment);
};

// Get MIME type from file extension
const getMimeType = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // Spreadsheets
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // Presentations
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Code files
    js: "text/javascript",
    css: "text/css",

    // Text files
    txt: "text/plain",
    csv: "text/csv",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",

    // Video
    mp4: "video/mp4",
    mov: "video/quicktime",

    // Images (fallback)
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
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

  const contentType = getMimeType(name);

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
