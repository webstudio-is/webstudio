import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  VISUAL_DIFFERENCE_MARKER,
  getStoryComparisons,
  type StoryEntry,
} from "./shared";
import { defaultStoryDelay, storyOptions } from "./story-options";

const baselineDirectory = process.env.VISUAL_BASELINE_STORYBOOK_DIRECTORY;
const currentDirectory = process.env.VISUAL_CURRENT_STORYBOOK_DIRECTORY;

if (baselineDirectory === undefined || currentDirectory === undefined) {
  throw new Error(
    "VISUAL_BASELINE_STORYBOOK_DIRECTORY and VISUAL_CURRENT_STORYBOOK_DIRECTORY are required"
  );
}

type StoryIndex = {
  entries: Record<string, StoryEntry & { type: string }>;
};

const readStoryEntries = async (directory: string) => {
  const index = JSON.parse(
    await readFile(path.join(directory, "index.json"), "utf8")
  ) as StoryIndex;

  return Object.fromEntries(
    Object.entries(index.entries).filter(([, entry]) => entry.type === "story")
  );
};

const [baselineEntries, currentEntries] = await Promise.all([
  readStoryEntries(baselineDirectory),
  readStoryEntries(currentDirectory),
]);
const comparisons = getStoryComparisons({ baselineEntries, currentEntries });

const getStoryUrl = (origin: string, id: string) => {
  const url = new URL("/iframe.html", origin);
  url.searchParams.set("id", id);
  url.searchParams.set("viewMode", "story");
  return url.href;
};

const prepareStory = async ({
  page,
  origin,
  id,
}: {
  page: Page;
  origin: string;
  id: string;
}) => {
  await page.goto(getStoryUrl(origin, id), { waitUntil: "load" });
  await page.locator("#storybook-root").waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(storyOptions[id]?.delay ?? defaultStoryDelay);
};

const captureStableScreenshot = async (page: Page) => {
  let previous = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    scale: "css",
  });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.waitForTimeout(100);
    const current = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: true,
      scale: "css",
    });
    if (current.equals(previous)) {
      return current;
    }
    previous = current;
  }

  throw new Error("Baseline story did not reach a stable visual state");
};

const markVisualDifference = (message: string, cause?: unknown) =>
  new Error(`${VISUAL_DIFFERENCE_MARKER}: ${message}`, { cause });

const attachScreenshot = async ({
  testInfo,
  name,
  body,
}: {
  testInfo: TestInfo;
  name: string;
  body: Buffer;
}) => {
  await testInfo.attach(name, { body, contentType: "image/png" });
};

for (const comparison of comparisons) {
  const entry = comparison.current ?? comparison.baseline;
  if (entry === undefined) {
    continue;
  }

  test(`${entry.title} › ${entry.name}`, async ({ page }, testInfo) => {
    if (storyOptions[comparison.id]?.disableIntervals) {
      await page.addInitScript(() => {
        Object.defineProperty(window, "setInterval", {
          configurable: true,
          value: () => 0,
          writable: true,
        });
      });
    }

    if (comparison.status === "added") {
      await prepareStory({
        page,
        origin: "http://127.0.0.1:6102",
        id: comparison.id,
      });
      await attachScreenshot({
        testInfo,
        name: "actual",
        body: await captureStableScreenshot(page),
      });
      throw markVisualDifference(`Story added: ${comparison.id}`);
    }

    await prepareStory({
      page,
      origin: "http://127.0.0.1:6101",
      id: comparison.id,
    });
    const baseline = await captureStableScreenshot(page);

    if (comparison.status === "removed") {
      await attachScreenshot({ testInfo, name: "expected", body: baseline });
      throw markVisualDifference(`Story removed: ${comparison.id}`);
    }

    const snapshotName = `${comparison.id}.png`;
    const snapshotPath = testInfo.snapshotPath(snapshotName);
    await mkdir(path.dirname(snapshotPath), { recursive: true });
    await writeFile(snapshotPath, baseline);

    await prepareStory({
      page,
      origin: "http://127.0.0.1:6102",
      id: comparison.id,
    });
    try {
      await expect(page).toHaveScreenshot(snapshotName, { fullPage: true });
    } catch (error) {
      throw markVisualDifference(`Story changed: ${comparison.id}`, error);
    }
  });
}
