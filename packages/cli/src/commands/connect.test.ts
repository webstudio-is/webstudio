import { join } from "node:path";
import { cwd } from "node:process";
import { expect, test, vi } from "vitest";
import {
  connect,
  mergeServerConfig,
  type ConnectDependencies,
} from "./connect";
import { HandledCliError } from "../errors";

const createDependencies = (
  files: Record<string, string> = {}
): ConnectDependencies => ({
  createFolderIfNotExists: vi.fn(async () => undefined),
  isFileExists: vi.fn(async (path: string) => {
    const relativePath = path.startsWith(cwd())
      ? path.slice(cwd().length + 1)
      : path;
    return relativePath in files;
  }),
  readFile: vi.fn(async (path: string) => {
    const relativePath = path.startsWith(cwd())
      ? path.slice(cwd().length + 1)
      : path;
    const content = files[relativePath];
    if (content === undefined) {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }
    return content;
  }),
  writeFileAtomic: vi.fn(async () => undefined),
});

const linkedProject = { ".webstudio/config.json": "{}" };

test("creates .mcp.json for claude with the default server command", async () => {
  const dependencies = createDependencies(linkedProject);

  await connect({ client: "claude", print: false }, dependencies);

  expect(dependencies.writeFileAtomic).toHaveBeenCalledWith(
    join(cwd(), ".mcp.json"),
    `${JSON.stringify(
      {
        mcpServers: {
          webstudio: {
            command: "npx",
            args: ["-y", "webstudio@latest", "mcp"],
          },
        },
      },
      null,
      2
    )}\n`
  );
});

test("merges the webstudio entry into an existing config preserving user fields", async () => {
  const dependencies = createDependencies({
    ...linkedProject,
    ".mcp.json": JSON.stringify({
      mcpServers: { other: { command: "other-server", args: [] } },
      customField: true,
    }),
  });

  await connect({ client: "claude", print: false }, dependencies);

  const [, content] = vi.mocked(dependencies.writeFileAtomic).mock.calls[0];
  expect(JSON.parse(content)).toEqual({
    mcpServers: {
      other: { command: "other-server", args: [] },
      webstudio: {
        command: "npx",
        args: ["-y", "webstudio@latest", "mcp"],
      },
    },
    customField: true,
  });
});

test("does not rewrite an already configured client", async () => {
  const dependencies = createDependencies({
    ...linkedProject,
    ".mcp.json": JSON.stringify({
      mcpServers: {
        webstudio: {
          command: "npx",
          args: ["-y", "webstudio@latest", "mcp"],
        },
      },
    }),
  });

  await connect({ client: "claude", print: false }, dependencies);

  expect(dependencies.writeFileAtomic).not.toHaveBeenCalled();
});

test("blocks on invalid json without touching the file", async () => {
  const dependencies = createDependencies({
    ...linkedProject,
    ".mcp.json": "not json",
  });

  await expect(
    connect({ client: "claude", print: false }, dependencies)
  ).rejects.toThrow(HandledCliError);
  expect(dependencies.writeFileAtomic).not.toHaveBeenCalled();
});

test("writes the vscode schema with servers root key and stdio type", async () => {
  const dependencies = createDependencies(linkedProject);

  await connect({ client: "vscode", print: false }, dependencies);

  expect(dependencies.writeFileAtomic).toHaveBeenCalledWith(
    join(cwd(), ".vscode", "mcp.json"),
    `${JSON.stringify(
      {
        servers: {
          webstudio: {
            type: "stdio",
            command: "npx",
            args: ["-y", "webstudio@latest", "mcp"],
          },
        },
      },
      null,
      2
    )}\n`
  );
});

test("writes the cursor config into .cursor/mcp.json", async () => {
  const dependencies = createDependencies(linkedProject);

  await connect({ client: "cursor", print: false }, dependencies);

  expect(dependencies.writeFileAtomic).toHaveBeenCalledWith(
    join(cwd(), ".cursor", "mcp.json"),
    expect.stringContaining('"mcpServers"')
  );
});

test.each(["claude", "cursor", "vscode"] as const)(
  "prints the same generated %s configuration that it writes",
  async (client) => {
    const writeDependencies = createDependencies(linkedProject);
    const printDependencies = createDependencies(linkedProject);

    await connect({ client, print: false }, writeDependencies);
    await connect({ client, print: true }, printDependencies);

    const [, written] = vi.mocked(writeDependencies.writeFileAtomic).mock
      .calls[0];
    expect(written).toContain("webstudio@latest");
    expect(printDependencies.writeFileAtomic).not.toHaveBeenCalled();
  }
);

test("prints codex snippet without writing files", async () => {
  const dependencies = createDependencies(linkedProject);

  await connect({ client: "codex", print: false }, dependencies);

  expect(dependencies.writeFileAtomic).not.toHaveBeenCalled();
});

test("prints configuration without writing when print is requested", async () => {
  const dependencies = createDependencies(linkedProject);

  await connect({ client: "claude", print: true }, dependencies);

  expect(dependencies.writeFileAtomic).not.toHaveBeenCalled();
});

test("lists supported clients when no client is provided", async () => {
  const dependencies = createDependencies(linkedProject);

  await connect({ client: undefined, print: false }, dependencies);

  expect(dependencies.writeFileAtomic).not.toHaveBeenCalled();
  expect(dependencies.isFileExists).not.toHaveBeenCalled();
});

test("uses a custom server command", async () => {
  const dependencies = createDependencies(linkedProject);

  await connect(
    {
      client: "claude",
      print: false,
      command: "node packages/cli/local.js mcp",
    },
    dependencies
  );

  const [, content] = vi.mocked(dependencies.writeFileAtomic).mock.calls[0];
  expect(JSON.parse(content).mcpServers.webstudio).toEqual({
    command: "node",
    args: ["packages/cli/local.js", "mcp"],
  });
});

test("rejects an empty server command", async () => {
  const dependencies = createDependencies(linkedProject);

  await expect(
    connect({ client: "claude", print: false, command: "  " }, dependencies)
  ).rejects.toThrow("--command must not be empty.");
});

test("merge keeps result unchanged only for a deep-equal server entry", () => {
  const serverEntry = {
    command: "npx",
    args: ["-y", "webstudio@latest", "mcp"],
  };
  expect(
    mergeServerConfig({
      current: JSON.stringify({
        mcpServers: {
          webstudio: { command: "npx", args: ["-y", "webstudio"] },
        },
      }),
      rootKey: "mcpServers",
      serverEntry,
    }).result
  ).toBe("updated");
  expect(
    mergeServerConfig({
      current: JSON.stringify({ mcpServers: { webstudio: serverEntry } }),
      rootKey: "mcpServers",
      serverEntry,
    }).result
  ).toBe("unchanged");
  expect(
    mergeServerConfig({
      current: JSON.stringify([1, 2]),
      rootKey: "mcpServers",
      serverEntry,
    }).result
  ).toBe("blocked-by-invalid-json");
  expect(
    mergeServerConfig({
      current: undefined,
      rootKey: "mcpServers",
      serverEntry,
    }).result
  ).toBe("created");
});
