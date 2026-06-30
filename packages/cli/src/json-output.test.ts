import { afterEach, expect, test, vi } from "vitest";
import { printJson } from "./json-output";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints pretty JSON", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  printJson({ ok: true, data: { value: 1 } });

  expect(vi.mocked(console.info).mock.calls.at(-1)?.[0]).toBe(`{
  "ok": true,
  "data": {
    "value": 1
  }
}`);
});
