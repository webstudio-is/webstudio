import { expect, test } from "vitest";
import {
  defaultScreenshotTimeout,
  defaultScreenshotWaitForTimeout,
  defaultScreenshotWaitUntil,
  isScreenshotWaitUntil,
  screenshotBrowserChoices,
  screenshotWaitUntilValues,
} from "./screenshot-browser";

test("defines supported screenshot browser choices in preference order", () => {
  expect(screenshotBrowserChoices).toEqual([
    "auto",
    "chromium",
    "chrome",
    "edge",
    "brave",
  ]);
});

test("defines supported screenshot readiness events in lifecycle order", () => {
  expect(screenshotWaitUntilValues).toEqual([
    "commit",
    "domcontentloaded",
    "load",
    "networkidle",
  ]);
  expect(isScreenshotWaitUntil("load")).toBe(true);
  expect(isScreenshotWaitUntil("interactive")).toBe(false);
});

test("defines screenshot readiness defaults", () => {
  expect(defaultScreenshotWaitUntil).toBe("load");
  expect(defaultScreenshotWaitForTimeout).toBe(250);
  expect(defaultScreenshotTimeout).toBe(30000);
});
