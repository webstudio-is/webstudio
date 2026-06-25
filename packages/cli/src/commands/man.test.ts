import { afterEach, expect, test, vi } from "vitest";
import { man } from "./man";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints api manual with patch workflow and examples", () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);

  man({ topic: "api", json: false });

  const output = vi.mocked(console.log).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio inspect --json");
  expect(output).toContain("webstudio apply-patch --base-version");
  expect(output).toContain("Supported namespaces");
  expect(output).toContain("Create a design token");
});

test("prints api manual as json", () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);

  man({ topic: "api", json: true });

  const output = JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("api");
  expect(output.workflows).toContain(
    "webstudio validate-patch --base-version <version> --input patch.json --json"
  );
  expect(output.mutationNamespaces).toContain("instances");
});

test("prints llm manual with discovery rules", () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);

  man({ topic: "llm", json: false });

  const output = vi.mocked(console.log).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio schema api --json");
  expect(output).toContain("Never guess ids");
});

test("prints available topics for unknown manual topic", () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);

  man({ topic: "missing", json: false });

  expect(vi.mocked(console.log).mock.calls.at(-1)?.[0]).toContain(
    "Available topics"
  );
});
