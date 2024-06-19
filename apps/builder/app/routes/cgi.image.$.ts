import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { createReadableStreamFromReadable } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import env from "~/env/env.server";
import { getImageNameAndType } from "~/builder/shared/assets/asset-utils";
import { z } from "zod";
import { createImageLoader } from "@webstudio-is/image";

const ImageParams = z.object({
  width: z.string().transform((value) => Math.round(parseFloat(value))),
  height: z.optional(
    z.string().transform((value) => Math.round(parseFloat(value)))
  ),
  fit: z.optional(z.literal("pad")),
  background: z.optional(z.string()),

  quality: z.string().transform((value) => Math.round(parseFloat(value))),

  format: z.union([
    z.literal("auto"),
    z.literal("avif"),
    z.literal("webp"),
    z.literal("json"),
    z.literal("jpeg"),
    z.literal("png"),
    z.literal("raw"),
  ]),
});

const decodePathFragment = (fragment: string) => {
  return decodeURIComponent(fragment);
};

// this route used as proxy for images to cloudflare endpoint
// https://developers.cloudflare.com/fundamentals/get-started/reference/cdn-cgi-endpoint/

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const basePath = `/cgi/image/`;

  const url = new URL(request.url);
  const name = decodePathFragment(url.pathname.slice(basePath.length));

  // The code should be +- same as here https://github.com/webstudio-is/webstudio-saas/blob/6c9a3bfb67cf5a221c20666de34bd20dc14bd558/packages/assets-proxy/src/image-transform.ts#L68
  const rawParameters: Record<string, string> = {
    format: url.searchParams.get("format") ?? "auto",
    width: url.searchParams.get("width") ?? "0",
    quality: url.searchParams.get("quality") ?? "80",
  };

  const height = url.searchParams.get("height");

  if (height != null) {
    rawParameters.height = height;
  }

  const fit = url.searchParams.get("fit");

  if (fit != null) {
    rawParameters.fit = fit;
  }

  const imageParameters = ImageParams.parse(rawParameters);

  // Allow direct image access, and from the same origin
  const refererRawUrl = request.headers.get("referer");
  const refererUrl = refererRawUrl === null ? url : new URL(refererRawUrl);
  if (refererUrl.origin !== url.origin) {
    throw new Response("Forbidden", {
      status: 403,
    });
  }

  if (env.RESIZE_ORIGIN !== undefined) {
    const imageLoader = createImageLoader({
      imageBaseUrl: `${env.RESIZE_ORIGIN}/cgi/image/`,
    });

    const imgHref = imageLoader({
      src: name,
      ...imageParameters,
      format: "auto",
    });

    const imgUrl = new URL(imgHref);
    imgUrl.search = url.search;

    const response = await fetch(imgUrl.href, {
      headers: {
        accept: request.headers.get("accept") ?? "",
        "accept-encoding": request.headers.get("accept-encoding") ?? "",
      },
    });

    const responseWHeaders = new Response(response.body, response);

    if (false === responseWHeaders.ok) {
      console.error(
        `Request to Image url ${imgUrl.href} responded with status = ${responseWHeaders.status}`
      );
    }

    responseWHeaders.headers.set("Access-Control-Allow-Origin", url.origin);

    return responseWHeaders;
  }

  if (env.FILE_UPLOAD_PATH === undefined) {
    throw Error("FILE_UPLOAD_PATH is not provided");
  }
  const fileUploadPath = env.FILE_UPLOAD_PATH;
  const filePath = join(process.cwd(), fileUploadPath, name);

  if (existsSync(filePath) === false) {
    throw new Response("Not found", {
      status: 404,
    });
  }

  const [contentType] = getImageNameAndType(name) ?? ["image/png"];

  return new Response(
    createReadableStreamFromReadable(createReadStream(filePath)),
    {
      headers: {
        "content-type": contentType,
      },
    }
  );
};
