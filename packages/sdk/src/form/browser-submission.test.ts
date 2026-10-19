import { afterEach, expect, test, vi } from "vitest";
import {
  createFormBotValue,
  createManagedSubmissionFormData,
} from "./browser-submission";
import { formBotFieldName } from "./fields";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("generates a fresh timestamp and exactly one bot field per managed submission", () => {
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("screen", { width: 1920, height: 1080 });
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches:
        query.includes("device-aspect-ratio: 16/9") ||
        query.includes("device-width: 1920px") ||
        query === "(prefers-color-scheme: light)",
    }))
  );
  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  const first = createManagedSubmissionFormData({
    values: {},
    managedFormId: "form-id",
  });
  clock.mockReturnValue(now + 5 * 60 * 1000 + 1);
  const second = createManagedSubmissionFormData({
    values: {},
    managedFormId: "form-id",
  });
  expect(first.getAll(formBotFieldName)).toEqual([now.toString(16)]);
  expect(second.getAll(formBotFieldName)).toEqual([
    (now + 5 * 60 * 1000 + 1).toString(16),
  ]);
});

test("Brave bypasses media queries", () => {
  vi.stubGlobal("navigator", { brave: {} });
  const matchMedia = vi.fn();
  vi.stubGlobal("matchMedia", matchMedia);
  expect(createFormBotValue()).toBe("brave");
  expect(matchMedia).not.toHaveBeenCalled();
});

test("missing or nonworking media queries produce the jsdom value", () => {
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("screen", { width: 1920, height: 1080 });
  vi.stubGlobal("matchMedia", undefined);
  expect(createFormBotValue()).toBe("jsdom");
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false }))
  );
  expect(createFormBotValue()).toBe("jsdom");
});
