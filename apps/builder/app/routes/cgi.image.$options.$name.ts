import { createReadStream } from "node:fs";
import { join } from "node:path";
import { type LoaderArgs, Response } from "@remix-run/node";
import env from "~/env/env.server";

export const loader = async ({ params }: LoaderArgs) => {
  const { options, name } = params;
  if (options === undefined) {
    throw Error("Options is undefined");
  }
  if (name === undefined) {
    throw Error("Name is undefined");
  }
  const fileUploadPath = env.FILE_UPLOAD_PATH ?? "public/s/uploads";
  const filePath = join(process.cwd(), fileUploadPath, name);
  return new Response(createReadStream(filePath));
};
