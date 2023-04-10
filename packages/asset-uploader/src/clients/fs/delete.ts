import { unlink } from "fs/promises";
import path from "path";

// @todo we need a better place for this to reuse it
const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

export const deleteFromFs = async ({
  name,
  fileDirectory,
}: {
  name: string;
  fileDirectory: string;
}) => {
  try {
    await unlink(path.join(fileDirectory, name));
  } catch (error) {
    // When file was deleted from local file system, we don't need to throw an error.
    if (isNodeError(error) && error.code !== "ENOENT") {
      throw error;
    }
  }
};
