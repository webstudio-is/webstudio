import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { validateRegistry } from "./validate-registry";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

const spawnMock = vi.mocked(spawn);

beforeEach(() => {
  vi.clearAllMocks();
  process.exitCode = undefined;
});

const mockProcess = (exitCode: number) => {
  const process = new EventEmitter();
  spawnMock.mockReturnValue(process as ReturnType<typeof spawn>);
  queueMicrotask(() => {
    process.emit("close", exitCode);
  });
};

describe("validateRegistry", () => {
  test("delegates to shadcn registry validate with the generated registry by default", async () => {
    mockProcess(0);

    await validateRegistry();
    const registryPath = resolve("src/__generated__/registry/registry.json");

    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining("shadcn"),
        "registry",
        "validate",
        "registry.json",
      ],
      expect.objectContaining({
        cwd: dirname(registryPath),
        env: expect.not.objectContaining({ NODE_OPTIONS: expect.anything() }),
        stdio: "inherit",
      })
    );
    expect(process.exitCode).toBeUndefined();
  });

  test("preserves shadcn failure exit code", async () => {
    mockProcess(7);

    await validateRegistry("generated/registry.json");

    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining("shadcn"),
        "registry",
        "validate",
        "registry.json",
      ],
      expect.objectContaining({
        cwd: resolve("generated"),
        stdio: "inherit",
      })
    );
    expect(process.exitCode).toBe(7);
  });
});
