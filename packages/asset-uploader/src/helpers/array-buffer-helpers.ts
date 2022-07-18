import path from "path";

export const mergeUint8Arrays = (a: Uint8Array, b: Uint8Array) => {
  const c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);

  return c;
};

export const getFilenameAndExtension = (filename: string) => {
  return [
    filename.substring(0, filename.lastIndexOf(".")),
    path.extname(filename),
  ];
};

export const getArrayBufferFromIterable = async (
  data: AsyncIterable<Uint8Array>
) => {
  let uint8FromIterable = new Uint8Array();
  for await (const chunk of data) {
    uint8FromIterable = mergeUint8Arrays(uint8FromIterable, chunk);
  }

  return uint8FromIterable;
};
