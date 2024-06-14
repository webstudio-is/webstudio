import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { createReadableStreamFromReadable } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import env from "~/env/env.server";
import { getImageNameAndType } from "~/builder/shared/assets/asset-utils";
import { z } from "zod";

const ImageParams = z.object({
  width: z.string().transform((value) => Math.round(parseFloat(value))),
  height: z.optional(
    z.string().transform((value) => Math.round(parseFloat(value)))
  ),
  fit: z.optional(
    z.union([
      z.literal("scale-down"),
      z.literal("contain"),
      z.literal("cover"),
      z.literal("crop"),
      z.literal("pad"),
    ])
  ),

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

  // For testing purposes
  sleep: z
    .optional(z.string())
    .transform((value) => (value ? Math.round(parseFloat(value)) : undefined)),
});

// this route used as proxy for images to cloudflare endpoint
// https://developers.cloudflare.com/fundamentals/get-started/reference/cdn-cgi-endpoint/

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { name } = params;
  if (name === undefined) {
    throw Error("Name is undefined");
  }

  const url = new URL(request.url);

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

  const sleep = url.searchParams.get("sleep");

  if (sleep != null) {
    rawParameters.sleep = sleep;
  }

  const imageParameters = ImageParams.parse(rawParameters);

  // For testing purposes
  if (imageParameters.sleep !== undefined) {
    await new Promise((resolve) => setTimeout(resolve, imageParameters.sleep));
  }

  // Allow direct image access, and from the same origin
  const refererRawUrl = request.headers.get("referer");
  const refererUrl = refererRawUrl === null ? url : new URL(refererRawUrl);
  if (refererUrl.origin !== url.origin) {
    throw new Response("Forbidden", {
      status: 403,
    });
  }

  if (env.RESIZE_ORIGIN !== undefined) {
    const assetUrl = `${name}`;
    // @todo add secret ti avoid exploiting our server
    const imageUrl = `${env.RESIZE_ORIGIN}/cgi/image/${assetUrl}?${url.searchParams}`;

    const response = await fetch(imageUrl, {
      headers: {
        accept: request.headers.get("accept") ?? "",
        "accept-encoding": request.headers.get("accept-encoding") ?? "",
      },
    });
    response.headers.set("Access-Control-Allow-Origin", url.origin);

    return response;
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
