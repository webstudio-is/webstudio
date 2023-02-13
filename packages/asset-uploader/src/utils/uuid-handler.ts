import type { UploadHandler as UnstableUploadHandler } from "@remix-run/node";
import { idsFormDataFieldName } from "../schema";
import { toUint8Array } from "./to-uint8-array";

export const uuidHandler: UnstableUploadHandler = async (part) => {
  if (part.name === idsFormDataFieldName) {
    return Buffer.from(await toUint8Array(part.data)).toString();
  }
};
