import { afterEach, expect, test, vi } from "vitest";
import { schema } from "./schema";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints api command schema as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "api", json: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.projectScope).toContain("single project");
  expect(output.commands).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "apply-patch",
        method: "mutation",
      }),
      expect.objectContaining({
        name: "list-assets",
        method: "query",
      }),
      expect.objectContaining({
        name: "permissions",
        method: "query",
      }),
      expect.objectContaining({
        name: "list-breakpoints",
        method: "query",
      }),
      expect.objectContaining({
        name: "create-page-from-template",
        method: "mutation",
      }),
    ])
  );
  for (const command of output.commands) {
    expect(command).not.toHaveProperty("trpcPath");
  }
  expect(output.useCases).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        useCase: "List breakpoints",
      }),
      expect.objectContaining({
        useCase: "Create page from template",
      }),
      expect.objectContaining({
        useCase: "Manage marketplace metadata",
        patchNamespaces: ["marketplaceProduct"],
      }),
    ])
  );
  expect(output.patch.namespaces).toContain("dataSources");
  expect(output.session.refreshFlag).toContain("--refresh");
  expect(output.session.resultMetadata).toContain("meta.session");
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
