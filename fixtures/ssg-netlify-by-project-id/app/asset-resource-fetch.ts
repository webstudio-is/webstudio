import { open } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createPublishedAssetResourceFetch } from "@webstudio-is/asset-resource";

const resolvePublicAsset = (path: string) => {
  const publicDirectory = resolve("public");
  const pathname = new URL(path, "https://webstudio.local").pathname;
  const filePath = resolve(publicDirectory, `.${pathname}`);
  if (filePath.startsWith(`${publicDirectory}${sep}`) === false) {
    throw new Error("Static asset path is outside the public directory");
  }
  return filePath;
};

const getByteRange = (header: string | null, size: number) => {
  if (header?.startsWith("bytes=") !== true) {
    return { offset: 0, length: size, partial: false };
  }
  const values = header.slice("bytes=".length).split("-");
  const offset = Number(values[0]);
  const requestedEnd = Number(values[1]);
  if (
    values.length !== 2 ||
    Number.isSafeInteger(offset) === false ||
    Number.isSafeInteger(requestedEnd) === false ||
    offset < 0 ||
    requestedEnd < offset ||
    offset >= size
  ) {
    return;
  }
  const end = Math.min(requestedEnd, size - 1);
  return { offset, length: end - offset + 1, partial: true };
};

export const fetchSsgPublicAsset = async (path: string, init?: RequestInit) => {
  let file;
  try {
    file = await open(resolvePublicAsset(path), "r");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      Reflect.get(error, "code") === "ENOENT"
    ) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
  try {
    const { size } = await file.stat();
    const range = getByteRange(new Headers(init?.headers).get("range"), size);
    if (range === undefined) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "content-range": `bytes */${size}` },
      });
    }
    const body = range.partial
      ? await file
          .read(new Uint8Array(range.length), 0, range.length, range.offset)
          .then(({ buffer, bytesRead }) => buffer.subarray(0, bytesRead))
      : await file.readFile();
    const headers = new Headers({ "content-length": String(body.length) });
    if (range.partial) {
      headers.set(
        "content-range",
        `bytes ${range.offset}-${range.offset + body.length - 1}/${size}`
      );
    }
    return new Response(Uint8Array.from(body).buffer, {
      status: range.partial ? 206 : 200,
      headers,
    });
  } finally {
    await file.close();
  }
};

export const createSsgAssetResourceFetch = ({
  deploymentId,
  manifest,
}: {
  deploymentId: string;
  manifest: Parameters<typeof createPublishedAssetResourceFetch>[0]["manifest"];
}) =>
  createPublishedAssetResourceFetch({
    deploymentId,
    manifest,
    fetchAsset: fetchSsgPublicAsset,
  });
