import { parentPort } from "node:worker_threads";
import {
  diffPngFiles,
  type ScreenshotDiffResult,
} from "@webstudio-is/vision/diff";

export type DiffWorkerRequest = {
  id: number;
  options: Parameters<typeof diffPngFiles>[0];
};

export type DiffWorkerResponse =
  | { id: number; result: ScreenshotDiffResult }
  | { id: number; error: string };

parentPort?.on("message", async ({ id, options }: DiffWorkerRequest) => {
  try {
    parentPort?.postMessage({
      id,
      result: await diffPngFiles(options),
    } satisfies DiffWorkerResponse);
  } catch (error) {
    parentPort?.postMessage({
      id,
      error:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    } satisfies DiffWorkerResponse);
  }
});
