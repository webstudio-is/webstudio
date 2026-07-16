import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import {
  assertMcpBatchMutationApproved,
  parseMcpProjectsManifest,
  runMcpProjectBatch,
  type McpBatchCall,
} from "./mcp-batch";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

const parseCalls = (value: unknown): McpBatchCall[] =>
  (value as Array<{ tool: string; dryRun?: boolean }>).map((call) => ({
    tool: call.tool,
    input: {},
    dryRun: call.dryRun === true,
  }));

test("requires explicit approval only for committed mutations", () => {
  const mutation = { tool: "update-page", input: {}, dryRun: false };

  expect(() =>
    assertMcpBatchMutationApproved({
      projectId: "site-a",
      call: mutation,
      method: "mutation",
      approved: false,
    })
  ).toThrow(/--approve-mutations/);
  expect(() =>
    assertMcpBatchMutationApproved({
      projectId: "site-a",
      call: { ...mutation, dryRun: true },
      method: "mutation",
      approved: false,
    })
  ).not.toThrow();
  expect(() =>
    assertMcpBatchMutationApproved({
      projectId: "site-a",
      call: mutation,
      method: "mutation",
      approved: true,
    })
  ).not.toThrow();
});

test("parses shared calls and project roots relative to the manifest", () => {
  const manifest = parseMcpProjectsManifest({
    value: {
      calls: [{ tool: "status" }],
      projects: [
        { id: "one", root: "../one" },
        { id: "two", root: "../two", calls: [{ tool: "audit" }] },
      ],
      concurrency: 3,
    },
    baseDirectory: "/workspace/manifests",
    defaultProgressDirectory: "/workspace",
    parseCalls,
  });

  expect(manifest.projects).toMatchObject([
    { id: "one", root: "/workspace/one", calls: [{ tool: "status" }] },
    { id: "two", root: "/workspace/two", calls: [{ tool: "audit" }] },
  ]);
  expect(manifest.concurrency).toBe(3);
  expect(manifest.progressFile).toMatch(
    /^\/workspace\/\.webstudio\/mcp-batch-[a-f0-9]{16}\.json$/
  );
});

test("rejects unbounded concurrency", () => {
  expect(() =>
    parseMcpProjectsManifest({
      value: {
        calls: [{ tool: "status" }],
        projects: ["one"],
        concurrency: 17,
      },
      baseDirectory: "/workspace",
      defaultProgressDirectory: "/workspace",
      parseCalls,
    })
  ).toThrow(/integer from 1 to 16/);
});

test("keeps the minimally prompted projects workflow fixture valid", async () => {
  const fixtureUrl = new URL(
    "./fixtures/mcp-projects-workflow.json",
    import.meta.url
  );
  const manifest = parseMcpProjectsManifest({
    value: JSON.parse(await readFile(fixtureUrl, "utf8")),
    baseDirectory: path.dirname(fixtureUrl.pathname),
    defaultProgressDirectory: "/workspace",
    parseCalls,
  });

  expect(manifest.projects).toHaveLength(2);
  expect(manifest.projects[0]?.calls.map((call) => call.tool)).toEqual([
    "status",
    "audit",
    "update-project-settings",
  ]);
  expect(manifest.projects[0]?.calls[2]?.dryRun).toBe(true);
});

test("runs projects with bounded concurrency and isolates failures", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-batch-"));
  tempDirs.push(directory);
  const manifest = parseMcpProjectsManifest({
    value: {
      calls: [{ tool: "status" }],
      projects: ["one", "two", "three"],
      progressFile: "progress.json",
      concurrency: 2,
    },
    baseDirectory: directory,
    defaultProgressDirectory: directory,
    parseCalls,
  });
  let active = 0;
  let maximumActive = 0;
  const reports = await runMcpProjectBatch({
    manifest,
    resume: true,
    runProject: async ({ project, callSucceeded }) => {
      active++;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      if (project.id === "two") {
        throw Object.assign(new Error("not linked"), { code: "UNAUTHORIZED" });
      }
      await callSucceeded(1);
    },
  });

  expect(maximumActive).toBe(2);
  expect(reports.map((report) => report.status)).toEqual([
    "succeeded",
    "failed",
    "succeeded",
  ]);
  expect(reports[1]?.error).toEqual({
    code: "UNAUTHORIZED",
    message: "not linked",
  });
});

test("resume never retries successful calls or completed projects", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-batch-resume-"));
  tempDirs.push(directory);
  const manifest = parseMcpProjectsManifest({
    value: {
      calls: [{ tool: "status" }, { tool: "audit" }],
      projects: ["one", "two"],
      progressFile: "progress.json",
    },
    baseDirectory: directory,
    defaultProgressDirectory: directory,
    parseCalls,
  });
  const firstStarts: Record<string, number> = {};
  await runMcpProjectBatch({
    manifest,
    resume: true,
    runProject: async ({ project, startCall, callSucceeded }) => {
      firstStarts[project.id] = startCall;
      await callSucceeded(1);
      if (project.id === "one") {
        throw new Error("temporary failure");
      }
      await callSucceeded(2);
    },
  });
  const secondRun = vi.fn(
    async ({
      project,
      startCall,
      callSucceeded,
    }: Parameters<
      Parameters<typeof runMcpProjectBatch>[0]["runProject"]
    >[0]) => {
      expect(project.id).toBe("one");
      expect(startCall).toBe(1);
      await callSucceeded(2);
    }
  );
  const reports = await runMcpProjectBatch({
    manifest,
    resume: true,
    runProject: secondRun,
  });

  expect(firstStarts).toEqual({ one: 0, two: 0 });
  expect(secondRun).toHaveBeenCalledTimes(1);
  expect(reports.map((report) => report.status)).toEqual([
    "succeeded",
    "skipped",
  ]);
  expect(
    JSON.parse(await readFile(manifest.progressFile, "utf8"))
  ).toMatchObject({
    projects: {
      one: { nextCall: 2, completed: true },
      two: { nextCall: 2, completed: true },
    },
  });
});

test("never replays a mutation with an ambiguous interrupted result", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-batch-ambiguous-"));
  tempDirs.push(directory);
  const manifest = parseMcpProjectsManifest({
    value: {
      calls: [{ tool: "update-page" }],
      projects: ["one"],
      progressFile: "progress.json",
    },
    baseDirectory: directory,
    defaultProgressDirectory: directory,
    parseCalls,
  });

  await runMcpProjectBatch({
    manifest,
    resume: true,
    runProject: async ({ callStarted }) => {
      await callStarted(0, false);
      throw new Error("connection closed after dispatch");
    },
  });
  const resumedRun = vi.fn();
  const reports = await runMcpProjectBatch({
    manifest,
    resume: true,
    runProject: resumedRun,
  });

  expect(resumedRun).not.toHaveBeenCalled();
  expect(reports).toEqual([
    expect.objectContaining({
      status: "failed",
      completedCalls: 0,
      error: expect.objectContaining({ code: "AMBIGUOUS_MUTATION_RESULT" }),
    }),
  ]);
});

test("resumes projects whose ids are object prototype names", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-batch-prototype-"));
  tempDirs.push(directory);
  const manifest = parseMcpProjectsManifest({
    value: {
      calls: [{ tool: "status" }],
      projects: [{ id: "__proto__", root: "site" }],
      progressFile: "progress.json",
    },
    baseDirectory: directory,
    defaultProgressDirectory: directory,
    parseCalls,
  });
  const firstRun = vi.fn(
    async ({
      callSucceeded,
    }: Parameters<
      Parameters<typeof runMcpProjectBatch>[0]["runProject"]
    >[0]) => {
      await callSucceeded(1);
    }
  );

  await runMcpProjectBatch({ manifest, resume: true, runProject: firstRun });

  const secondRun = vi.fn();
  const reports = await runMcpProjectBatch({
    manifest,
    resume: true,
    runProject: secondRun,
  });

  expect(firstRun).toHaveBeenCalledOnce();
  expect(secondRun).not.toHaveBeenCalled();
  expect(reports).toEqual([
    {
      id: "__proto__",
      root: path.join(directory, "site"),
      status: "skipped",
      completedCalls: 1,
      totalCalls: 1,
    },
  ]);
  expect(
    JSON.parse(await readFile(manifest.progressFile, "utf8")).projects[
      "__proto__"
    ]
  ).toEqual({ nextCall: 1, completed: true });
});
