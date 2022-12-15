import { type UploadHandler as UnstableUploadHandler } from "@remix-run/node";
import { idsFormDataFieldName } from "../schema";

export const uuidHandler: UnstableUploadHandler = async (part) => {
  let id: string | undefined = undefined;
  if (part.name === idsFormDataFieldName) {
    const idBuffer = new Uint8Array(36);
    let offset = 0;

    for await (const chunk of part.data) {
      // Will throw in case of buffer overflow
      idBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    id = Buffer.from(idBuffer).toString();
  }
  return id;
};
