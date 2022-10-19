import { unlink } from "fs/promises";
import path from "path";
import { FILE_DIRECTORY } from "./file-path";

// @todo we need a better place for this to reuse it
const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

export const deleteFromFs = async (name: string) => {
  try {
    await unlink(path.join(FILE_DIRECTORY, name));
  } catch (error) {
    // When file was deleted from local file system, we don't need to throw an error.
    if (isNodeError(error) && error.code !== "ENOENT") {
      throw error;
    }
  }
};
