import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { expect, test } from "vitest";
import { authenticatedPageFixture } from "../../evaluations/high-impact/fixtures";
import { startHighImpactFixtureApi } from "../../evaluations/high-impact/fixture-api";

const execFileAsync = promisify(execFile);

test("MCP keeps publish handles only in its live host while reading status and log pages", async () => {
  let publishMode: "accepted" | "blocked" | "no-handle" = "accepted";
  let allowLogs = true;
  const requests: Array<{ operation: string; input: unknown }> = [];
  const api = await startHighImpactFixtureApi(authenticatedPageFixture, {
    handleServerOperation: async (operation, input) => {
      if (
        operation !== "publish.create" &&
        operation !== "publish.getJob" &&
        operation !== "publish.getLog"
      ) {
        return;
      }
      requests.push({ operation, input });
      if (operation === "publish.create") {
        if (publishMode === "blocked") {
          return { result: { status: "blocked", findings: [] } };
        }
        const buildId = publishMode === "no-handle" ? "build-2" : "build-1";
        return {
          result: {
            status: "pending",
            jobId: buildId,
            buildId,
            ...(publishMode === "accepted"
              ? { logHandle: "private-handle" }
              : {}),
            findings: [],
          },
        };
      }
      const request = input as {
        jobId?: string;
        buildId?: string;
        logHandle?: string;
        cursor?: number;
      };
      if (operation === "publish.getJob") {
        expect(request.logHandle).toBe(
          request.jobId === "build-1" ? "private-handle" : undefined
        );
        return { result: { id: request.jobId, status: "success" } };
      }
      expect(request.logHandle).toBe("private-handle");
      if (allowLogs === false) {
        return { result: { availability: "unavailable" } };
      }
      const first = request.cursor === undefined;
      return {
        result: {
          availability: "available",
          outcome: "succeeded",
          logAvailability: "available",
          log: first
            ? {
                encoding: "base64url",
                chunk: Buffer.from([0x41, 0xe2]).toString("base64url"),
                complete: false,
                nextCursor: 2,
              }
            : {
                encoding: "base64url",
                chunk: Buffer.from([0xe2, 0x82, 0xac]).toString("base64url"),
                complete: true,
              },
        },
      };
    },
  });
  const directory = await mkdtemp(join(tmpdir(), "webstudio-mcp-publish-"));
  const projectDirectory = join(directory, "project");
  const cli = resolve(import.meta.dirname, "../../local.js");
  const env = {
    ...process.env,
    WEBSTUDIO_CONFIG_DIR: join(directory, "config"),
  };
  const clients: Client[] = [];
  const connect = async () => {
    const client = new Client({ name: "publish-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cli, "mcp"],
      cwd: projectDirectory,
      env: Object.fromEntries(
        Object.entries(env).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        )
      ),
      stderr: "pipe",
    });
    transport.stderr?.on("data", () => undefined);
    await client.connect(transport);
    clients.push(client);
    return client;
  };
  try {
    await mkdir(projectDirectory);
    await execFileAsync(
      process.execPath,
      [cli, "init", "--link", api.shareLink, "--json"],
      { cwd: projectDirectory, env }
    );
    const client = await connect();
    const call = async (name: string, input: Record<string, unknown> = {}) => {
      const result = await client.callTool({ name, arguments: input });
      return result.structuredContent as {
        ok: boolean;
        data?: Record<string, unknown>;
        error?: { code: string };
      };
    };
    const tools = await client.listTools();
    expect(tools.tools.some(({ name }) => name === "get-publish-log")).toBe(
      true
    );
    const publish = await call("publish", { target: "production" });
    expect(publish).toMatchObject({
      ok: true,
      data: { status: "pending", buildId: "build-1" },
    });
    expect(publish.data).not.toHaveProperty("logHandle");
    const job = await call("get-publish-job", { jobId: "build-1" });
    expect(job).toMatchObject({ ok: true, data: { status: "success" } });
    expect(job.data).not.toHaveProperty("logHandle");
    const first = await call("get-publish-log");
    expect(first).toMatchObject({
      ok: true,
      data: { log: { text: "A", nextCursor: 1 } },
    });
    expect(first.data?.log).not.toHaveProperty("chunk");
    const second = await call("get-publish-log", { cursor: 1 });
    expect(second).toMatchObject({
      ok: true,
      data: { log: { text: "€", complete: true } },
    });
    expect(
      requests.filter(({ operation }) => operation === "publish.getLog")
    ).toHaveLength(2);
    allowLogs = false;
    expect(await call("get-publish-log")).toMatchObject({
      ok: true,
      data: { availability: "unavailable" },
    });
    expect(await call("get-publish-log", { buildId: "unknown" })).toMatchObject(
      {
        ok: false,
        error: { code: "PUBLISH_NOT_FOUND" },
      }
    );
    publishMode = "blocked";
    expect(await call("publish", { target: "production" })).toMatchObject({
      ok: true,
      data: { status: "blocked" },
    });
    expect(await call("get-publish-log")).toMatchObject({
      ok: false,
      error: { code: "PUBLISH_REQUIRED" },
    });
    publishMode = "no-handle";
    expect(await call("publish", { target: "production" })).toMatchObject({
      ok: true,
      data: { buildId: "build-2", status: "pending" },
    });
    expect(await call("get-publish-log")).toMatchObject({
      ok: true,
      data: { availability: "unavailable" },
    });
    expect(requests).toContainEqual(
      expect.objectContaining({
        operation: "publish.getJob",
        input: expect.objectContaining({ jobId: "build-2" }),
      })
    );
    await client.close();
    const restarted = await connect();
    expect(
      (
        await restarted.callTool({
          name: "get-publish-log",
          arguments: { buildId: "build-1" },
        })
      ).structuredContent
    ).toMatchObject({ ok: false, error: { code: "PUBLISH_NOT_FOUND" } });
    const stateDirectory = join(projectDirectory, ".webstudio");
    for (const entry of await readdir(stateDirectory, { recursive: true })) {
      if (entry.endsWith(".json")) {
        const contents = await readFile(join(stateDirectory, entry), "utf8");
        expect(contents).not.toContain("private-handle");
        expect(contents).not.toContain("€");
        expect(contents).not.toContain("QeI");
        expect(contents).not.toContain("4oKs");
      }
    }
  } finally {
    await Promise.all(
      clients.map((client) => client.close().catch(() => undefined))
    );
    await api.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);
