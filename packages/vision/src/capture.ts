import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import type { BrowserScreenshotOptions } from "./screenshot-browser-cdp";

export type VisualCapture = {
  id: string;
  options: BrowserScreenshotOptions;
};

export type VisualCaptureSession = {
  capturePage: (
    options: readonly BrowserScreenshotOptions[],
    sessionOptions: { concurrency: number }
  ) => Promise<unknown>;
};

export const orderForGroupedConcurrency = <Value>(
  values: readonly Value[],
  concurrency: number
) => {
  // Browser sessions assign options to pages round-robin. Interleave contiguous
  // groups so captures that share resources reuse the same page and its cache.
  const groupCount = Math.min(concurrency, values.length);
  if (groupCount < 2) {
    return [...values];
  }
  const minimumGroupSize = Math.floor(values.length / groupCount);
  const maximumGroupSize = Math.ceil(values.length / groupCount);
  const largerGroupCount = values.length % groupCount;
  let start = 0;
  const groups = Array.from({ length: groupCount }, (_, index) => {
    const size = minimumGroupSize + (index < largerGroupCount ? 1 : 0);
    const group = values.slice(start, start + size);
    start += size;
    return group;
  });
  const ordered: Value[] = [];
  for (let index = 0; index < maximumGroupSize; index += 1) {
    for (const group of groups) {
      const value = group[index];
      if (value !== undefined) {
        ordered.push(value);
      }
    }
  }
  return ordered;
};

export const captureVisualEntries = async ({
  captures,
  concurrency,
  session,
  onBatchFailure,
}: {
  captures: readonly VisualCapture[];
  concurrency: number;
  session: VisualCaptureSession | undefined;
  onBatchFailure?: (error: unknown, count: number) => void;
}) => {
  const paths = new Map<string, string>();
  const errors = new Map<string, string>();
  if (captures.length === 0) {
    return { paths, errors };
  }
  if (session === undefined) {
    throw new Error("A browser session is required to capture visual entries.");
  }
  const ordered = orderForGroupedConcurrency(
    await Promise.all(
      captures.map(async (capture) => {
        await mkdir(path.dirname(capture.options.output), { recursive: true });
        return capture;
      })
    ),
    concurrency
  );
  const captureBatch = async (batch: typeof ordered): Promise<void> => {
    try {
      await session.capturePage(
        batch.map(({ options }) => options),
        { concurrency }
      );
      await Promise.all(batch.map(({ options }) => access(options.output)));
      for (const { id, options } of batch) {
        paths.set(id, options.output);
      }
      return;
    } catch (error) {
      onBatchFailure?.(error, batch.length);
      if (batch.length === 1) {
        const capture = batch[0];
        if (capture !== undefined) {
          errors.set(
            capture.id,
            error instanceof Error
              ? (error.stack ?? error.message)
              : String(error)
          );
        }
        return;
      }
    }
    const middle = Math.ceil(batch.length / 2);
    await captureBatch(batch.slice(0, middle));
    await captureBatch(batch.slice(middle));
  };
  await captureBatch(ordered);
  return { paths, errors };
};
