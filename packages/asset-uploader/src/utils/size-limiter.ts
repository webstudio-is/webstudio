export class AssetUploadSizeLimitError extends Error {
  constructor(name: string, maximumBytes: number) {
    super(`File "${name}" exceeded upload size of ${maximumBytes} bytes`);
    this.name = "AssetUploadSizeLimitError";
  }
}

export const createSizeLimiter = (maxSize: number, name: string) => {
  return async function* <T extends ArrayBufferView | ArrayBuffer>(
    data: AsyncIterable<T>
  ): AsyncGenerator<T> {
    let size = 0;
    for await (const chunk of data) {
      size += chunk.byteLength;
      if (size > maxSize) {
        throw new AssetUploadSizeLimitError(name, maxSize);
      }
      yield chunk;
    }
  };
};
