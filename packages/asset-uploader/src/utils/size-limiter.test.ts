import { expect, test } from "vitest";
import { AssetUploadSizeLimitError, createSizeLimiter } from "./size-limiter";

const collect = async (iterable: AsyncIterable<Uint8Array>) => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of iterable) {
    chunks.push(chunk);
  }
  return chunks;
};

test("throws a typed error when streamed upload content exceeds the limit", async () => {
  const source = {
    async *[Symbol.asyncIterator]() {
      yield new Uint8Array(6);
      yield new Uint8Array(5);
    },
  };

  await expect(
    collect(createSizeLimiter(10, "post.md")(source))
  ).rejects.toBeInstanceOf(AssetUploadSizeLimitError);
});
