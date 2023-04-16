import { createReadStream } from "node:fs";
import { join } from "node:path";
import { type LoaderArgs, Response } from "@remix-run/node";
import env from "~/env/env.server";

// this route used as proxy for images and mirrors cloudflare endpoint
// https://developers.cloudflare.com/fundamentals/get-started/reference/cdn-cgi-endpoint/

export const loader = async ({ params }: LoaderArgs) => {
  const { options, name } = params;
  if (options === undefined) {
    throw Error("Options is undefined");
  }
  if (name === undefined) {
    throw Error("Name is undefined");
  }

  if (env.RESIZE_ORIGIN !== undefined) {
    return fetch(`${env.RESIZE_ORIGIN}${env.IMAGE_BASE_URL}${options}/${name}`);
  }

  const fileUploadPath = env.FILE_UPLOAD_PATH ?? "public/s/uploads";
  const filePath = join(process.cwd(), fileUploadPath, name);
  return new Response(createReadStream(filePath));
};
