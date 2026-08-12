import { parentPort } from "node:worker_threads";
import { diffPngFiles, type ScreenshotDiffResult } from "./screenshot-diff";

export type ScreenshotDiffWorkerRequest = {
  id: number;
  options: Parameters<typeof diffPngFiles>[0];
};

export type ScreenshotDiffWorkerResponse =
  | { id: number; result: ScreenshotDiffResult }
  | { id: number; error: string };

parentPort?.on(
  "message",
  async ({ id, options }: ScreenshotDiffWorkerRequest) => {
    try {
      parentPort?.postMessage({
        id,
        result: await diffPngFiles(options),
      } satisfies ScreenshotDiffWorkerResponse);
    } catch (error) {
      parentPort?.postMessage({
        id,
        error:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
      } satisfies ScreenshotDiffWorkerResponse);
    }
  }
);
