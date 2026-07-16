import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "../fs-utils";
import { isPlainRecord } from "../type-utils";

export type McpBatchCall = {
  tool: string;
  input: unknown;
  dryRun: boolean;
};

export type McpBatchProject = {
  id: string;
  root: string;
  calls: McpBatchCall[];
};

export type McpProjectsManifest = {
  projects: McpBatchProject[];
  concurrency: number;
  progressFile: string;
  fingerprint: string;
};

type PersistedProjectProgress = {
  nextCall: number;
  completed: boolean;
  ambiguousMutationCall?: number;
};

type PersistedBatchProgress = {
  version: 1;
  fingerprint: string;
  projects: Record<string, PersistedProjectProgress>;
};

const createProgressProjects = () =>
  Object.create(null) as Record<string, PersistedProjectProgress>;

const maximumConcurrency = 16;

export type McpBatchProjectReport = {
  id: string;
  root: string;
  status: "succeeded" | "failed" | "skipped";
  completedCalls: number;
  totalCalls: number;
  error?: { code: string; message: string };
};

const parsePositiveInteger = (value: unknown, fallback: number) => {
  if (value === undefined) {
    return fallback;
  }
  if (
    typeof value !== "number" ||
    Number.isInteger(value) === false ||
    value < 1 ||
    value > maximumConcurrency
  ) {
    throw new Error(
      `MCP batch concurrency must be an integer from 1 to ${maximumConcurrency}.`
    );
  }
  return value;
};

export const isMcpProjectsManifest = (
  value: unknown
): value is Record<string, unknown> & { projects: unknown[] } =>
  isPlainRecord(value) && Array.isArray(value.projects);

export const assertMcpBatchMutationApproved = ({
  projectId,
  call,
  method,
  approved,
}: {
  projectId: string;
  call: McpBatchCall;
  method: string | undefined;
  approved: boolean;
}) => {
  if (call.dryRun || method !== "mutation" || approved) {
    return;
  }
  throw Object.assign(
    new Error(
      `Project "${projectId}" includes committed mutation "${call.tool}". Re-run with --approve-mutations after reviewing the manifest, or use --dry-run.`
    ),
    { code: "MUTATION_APPROVAL_REQUIRED" }
  );
};

export const parseMcpProjectsManifest = ({
  value,
  baseDirectory,
  defaultProgressDirectory,
  parseCalls,
  concurrency,
}: {
  value: unknown;
  baseDirectory: string;
  defaultProgressDirectory: string;
  parseCalls: (value: unknown) => McpBatchCall[];
  concurrency?: number;
}): McpProjectsManifest => {
  if (isMcpProjectsManifest(value) === false) {
    throw new Error('MCP batch input must include a "projects" array.');
  }
  if (value.projects.length === 0) {
    throw new Error("MCP batch input must include at least one project.");
  }
  const sharedCalls =
    value.calls === undefined ? undefined : parseCalls(value.calls);
  const seenRoots = new Set<string>();
  const seenIds = new Set<string>();
  const projects = value.projects.map((entry, index): McpBatchProject => {
    const project = typeof entry === "string" ? { root: entry } : entry;
    if (
      isPlainRecord(project) === false ||
      typeof project.root !== "string" ||
      project.root.trim() === ""
    ) {
      throw new Error(
        `MCP batch projects[${index}].root must be a non-empty string.`
      );
    }
    const root = path.resolve(baseDirectory, project.root);
    const id =
      typeof project.id === "string" && project.id.trim() !== ""
        ? project.id
        : path.basename(root);
    if (seenRoots.has(root)) {
      throw new Error(`MCP batch project root is duplicated: ${root}`);
    }
    if (seenIds.has(id)) {
      throw new Error(`MCP batch project id is duplicated: ${id}`);
    }
    seenRoots.add(root);
    seenIds.add(id);
    const calls =
      project.calls === undefined ? sharedCalls : parseCalls(project.calls);
    if (calls === undefined) {
      throw new Error(
        `MCP batch project "${id}" needs calls or a top-level calls array.`
      );
    }
    return { id, root, calls };
  });
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(projects))
    .digest("hex")
    .slice(0, 16);
  const progressFile =
    typeof value.progressFile === "string" && value.progressFile.trim() !== ""
      ? path.resolve(baseDirectory, value.progressFile)
      : path.join(
          defaultProgressDirectory,
          ".webstudio",
          `mcp-batch-${fingerprint}.json`
        );
  return {
    projects,
    concurrency: parsePositiveInteger(concurrency ?? value.concurrency, 2),
    progressFile,
    fingerprint,
  };
};

const readProgress = async (
  manifest: McpProjectsManifest,
  resume: boolean
): Promise<PersistedBatchProgress> => {
  if (resume) {
    try {
      const progress = JSON.parse(
        await readFile(manifest.progressFile, "utf8")
      ) as PersistedBatchProgress;
      if (
        progress.version === 1 &&
        progress.fingerprint === manifest.fingerprint &&
        isPlainRecord(progress.projects)
      ) {
        return {
          ...progress,
          // Project ids come from user-controlled manifests. A null-prototype
          // map keeps ids such as "__proto__" ordinary progress keys.
          projects: Object.assign(createProgressProjects(), progress.projects),
        };
      }
    } catch (error) {
      if (isPlainRecord(error) === false || error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  return {
    version: 1,
    fingerprint: manifest.fingerprint,
    projects: createProgressProjects(),
  };
};

const toError = (error: unknown) => {
  if (isPlainRecord(error) && typeof error.message === "string") {
    return {
      code: typeof error.code === "string" ? error.code : "MCP_PROJECT_FAILED",
      message: error.message,
    };
  }
  return {
    code: "MCP_PROJECT_FAILED",
    message: error instanceof Error ? error.message : String(error),
  };
};

export const runMcpProjectBatch = async ({
  manifest,
  resume,
  runProject,
}: {
  manifest: McpProjectsManifest;
  resume: boolean;
  runProject: (options: {
    project: McpBatchProject;
    startCall: number;
    callStarted: (call: number, replaySafe: boolean) => Promise<void>;
    callSucceeded: (nextCall: number) => Promise<void>;
  }) => Promise<void>;
}) => {
  const progress = await readProgress(manifest, resume);
  let pendingWrite = Promise.resolve();
  const persist = () => {
    pendingWrite = pendingWrite.then(async () => {
      await mkdir(path.dirname(manifest.progressFile), { recursive: true });
      await writeFileAtomic(
        manifest.progressFile,
        `${JSON.stringify(progress, undefined, 2)}\n`
      );
    });
    return pendingWrite;
  };
  const reports: McpBatchProjectReport[] = new Array(manifest.projects.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < manifest.projects.length) {
      const index = cursor++;
      const project = manifest.projects[index]!;
      const saved = progress.projects[project.id];
      if (saved?.completed === true) {
        reports[index] = {
          id: project.id,
          root: project.root,
          status: "skipped",
          completedCalls: project.calls.length,
          totalCalls: project.calls.length,
        };
        continue;
      }
      if (resume && saved?.ambiguousMutationCall !== undefined) {
        reports[index] = {
          id: project.id,
          root: project.root,
          status: "failed",
          completedCalls: saved.nextCall,
          totalCalls: project.calls.length,
          error: {
            code: "AMBIGUOUS_MUTATION_RESULT",
            message: `Mutation call ${saved.ambiguousMutationCall + 1} may have committed before the previous run stopped. Inspect the project before deciding whether to continue; it will not be replayed automatically.`,
          },
        };
        continue;
      }
      const startCall = resume
        ? Math.min(saved?.nextCall ?? 0, project.calls.length)
        : 0;
      try {
        await runProject({
          project,
          startCall,
          callStarted: async (call, replaySafe) => {
            if (replaySafe) {
              return;
            }
            progress.projects[project.id] = {
              nextCall: call,
              completed: false,
              ambiguousMutationCall: call,
            };
            await persist();
          },
          callSucceeded: async (nextCall) => {
            progress.projects[project.id] = { nextCall, completed: false };
            await persist();
          },
        });
        progress.projects[project.id] = {
          nextCall: project.calls.length,
          completed: true,
        };
        await persist();
        reports[index] = {
          id: project.id,
          root: project.root,
          status: "succeeded",
          completedCalls: project.calls.length,
          totalCalls: project.calls.length,
        };
      } catch (error) {
        reports[index] = {
          id: project.id,
          root: project.root,
          status: "failed",
          completedCalls: progress.projects[project.id]?.nextCall ?? startCall,
          totalCalls: project.calls.length,
          error: toError(error),
        };
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(manifest.concurrency, manifest.projects.length) },
      worker
    )
  );
  await pendingWrite;
  return reports;
};
