const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

export const getContentHash = async (
  data: ArrayBuffer | ArrayBufferView<ArrayBuffer>
) =>
  bufferToHex(await crypto.subtle.digest("SHA-256", data));
