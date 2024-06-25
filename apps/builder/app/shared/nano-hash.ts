import { customRandom } from "nanoid";

// https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
const alphabet =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const NANOID_DEFAULT_SIZE = 21;

// Generates hash strings using the same alphabet as nanoid
export const nanoHash = async (data: string) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return customRandom(
    alphabet,
    NANOID_DEFAULT_SIZE,
    () => new Uint8Array(hashBuffer)
  )();
};
