import { describe, expect, test, vi } from "vitest";
import { GLOBAL_CONFIG_FILE, LOCAL_CONFIG_FILE } from "./config";
import { resolveApiConnection } from "./api-connection";

const createDependencies = ({
  exists = true,
  files = {},
}: {
  exists?: boolean;
  files?: Record<string, string>;
} = {}) => ({
  isFileExists: vi.fn(async (path: string) =>
    path === LOCAL_CONFIG_FILE ? exists : path in files
  ),
  readFile: vi.fn(async (path: string) => {
    const key = path.endsWith(LOCAL_CONFIG_FILE) ? LOCAL_CONFIG_FILE : path;
    const content = files[key];
    if (content === undefined) {
      throw new Error(`Missing test file ${path}`);
    }
    return content;
  }),
});

describe("resolveApiConnection", () => {
  test("reads the configured project connection", async () => {
    const dependencies = createDependencies({
      files: {
        [LOCAL_CONFIG_FILE]: JSON.stringify({ projectId: "project-1" }),
        [GLOBAL_CONFIG_FILE]: JSON.stringify({
          "project-1": {
            origin: "https://example.com",
            token: "token-1",
          },
        }),
      },
    });

    await expect(resolveApiConnection(dependencies)).resolves.toEqual({
      projectId: "project-1",
      origin: "https://example.com",
      authToken: "token-1",
    });
  });

  test("requires a local project config", async () => {
    await expect(
      resolveApiConnection(createDependencies({ exists: false }))
    ).rejects.toThrow("Local config file is not found");
  });

  test("requires a matching global project config", async () => {
    const dependencies = createDependencies({
      files: {
        [LOCAL_CONFIG_FILE]: JSON.stringify({ projectId: "project-1" }),
        [GLOBAL_CONFIG_FILE]: JSON.stringify({}),
      },
    });

    await expect(resolveApiConnection(dependencies)).rejects.toThrow(
      "Project config is not found"
    );
  });
});
