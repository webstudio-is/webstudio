export const createSizeLimiter = (maxSize: number, name: string) => {
  return async function* <T extends ArrayBufferView | ArrayBuffer>(
    data: AsyncIterable<T>
  ): AsyncGenerator<T> {
    let size = 0;
    for await (const chunk of data) {
      size += chunk.byteLength;
      if (size > maxSize) {
        throw Error(`File "${name}" exceeded upload size of ${maxSize} bytes`);
      }
      yield chunk;
    }
  };
};
