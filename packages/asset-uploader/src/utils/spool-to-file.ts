import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";

export const spoolToFile = async (
  data: AsyncIterable<Uint8Array>,
  filepath: string
): Promise<number> => {
  await mkdir(dirname(filepath), { recursive: true });
  const fileHandle = await open(filepath, "w");
  try {
    let size = 0;
    for await (const chunk of data) {
      size += chunk.byteLength;
      // One write syscall per chunk; coalescing many tiny chunks would speed
      // this up, but incoming upload chunks are already reasonably sized.
      await fileHandle.write(chunk);
    }
    return size;
  } finally {
    await fileHandle.close();
  }
};
