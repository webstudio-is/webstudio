import { afterEach, expect, test, vi } from "vitest";
import { schema } from "./schema";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints api command schema as json", () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);

  schema({ topic: "api", json: true });

  const output = JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0]);
  expect(output.projectScope).toContain("single project");
  expect(output.commands).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "apply-patch",
        method: "mutation",
        trpcPath: "api.build.patch",
      }),
      expect.objectContaining({
        name: "list-assets",
        method: "query",
      }),
    ])
  );
  expect(output.patch.namespaces).toContain("dataSources");
});

test("requires json output", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  expect(() => schema({ topic: "api", json: false })).toThrow(
    "Handled CLI error"
  );
  expect(console.error).toHaveBeenCalledWith(
    "schema currently requires --json."
  );
});
