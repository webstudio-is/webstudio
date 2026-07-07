import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { createReadableStreamFromReadable } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import env from "~/env/env.server";
import { getMimeTypeByFilename, decodePathFragment } from "@webstudio-is/sdk";
import { fileUploadPath } from "~/shared/asset-client";

// this route used as proxy for videos to cloudflare endpoint or serve local files
// https://developers.cloudflare.com/fundamentals/get-started/reference/cdn-cgi-endpoint/

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const basePath = `/cgi/video/`;
  const url = new URL(request.url);
  const name = decodePathFragment(url.pathname.slice(basePath.length));

  if (env.RESIZE_ORIGIN !== undefined) {
    const videoUrl = new URL(env.RESIZE_ORIGIN + url.pathname);
    videoUrl.search = url.search;

    const response = await fetch(videoUrl.href, {
      headers: {
        accept: request.headers.get("accept") ?? "",
        "accept-encoding": request.headers.get("accept-encoding") ?? "",
        range: request.headers.get("range") ?? "",
      },
    });

    const responseWHeaders = new Response(response.body, response);

    if (false === responseWHeaders.ok) {
      console.error(
        `Request to Video url ${videoUrl.href} responded with status = ${responseWHeaders.status}`
      );
    }

    responseWHeaders.headers.set("Access-Control-Allow-Origin", url.origin);

    return responseWHeaders;
  }

  // support absolute urls locally
  if (URL.canParse(name)) {
    return fetch(name);
  }

  const filePath = join(process.cwd(), fileUploadPath, name);

  if (existsSync(filePath) === false) {
    throw new Response("Not found", {
      status: 404,
    });
  }

  const contentType = getMimeTypeByFilename(name);

  return new Response(
    createReadableStreamFromReadable(createReadStream(filePath)),
    {
      headers: {
        "content-type": contentType,
        "accept-ranges": "bytes",
      },
    }
  );
};
