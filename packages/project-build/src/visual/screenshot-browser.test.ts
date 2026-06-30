import { expect, test } from "vitest";
import { screenshotBrowserChoices } from "./screenshot-browser";

test("defines supported screenshot browser choices in preference order", () => {
  expect(screenshotBrowserChoices).toEqual([
    "auto",
    "chromium",
    "chrome",
    "edge",
    "brave",
  ]);
});
