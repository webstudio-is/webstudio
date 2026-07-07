import { describe, expect, test } from "vitest";
import type { BuilderNamespace } from "./contracts/namespaces";
import type { BuilderPatchTransaction } from "./contracts/patch";
import {
  createProjectSession,
  hasProjectSessionPermit,
  redactProjectSessionValue,
} from "./project-session";
import type {
  ProjectSessionCompatibility,
  ProjectSessionPersistedSnapshot,
  ProjectSessionRemoteSnapshot,
  ProjectSessionStorage,
  ProjectSessionTransport,
} from "./project-session";
import { createBuilderStateFromSnapshot } from "./state/adapters";
import { createBuilderStateFreshness } from "./state/freshness";
import { build } from "./state/fixtures.test-utils";

const compatibilityVersion = "test-session";
const compatibility: ProjectSessionCompatibility = {
  sessionVersion: compatibilityVersion,
  runtimeContractVersion: "test-runtime-contracts",
  projectSchemaVersion: "test-project-schema",
  apiCompatibilityVersion: "test-api",
};

const createSnapshot = (
  overrides: Partial<ProjectSessionRemoteSnapshot> = {}
) => {
  const state = createBuilderStateFromSnapshot(build);
  return {
    projectId: "project-1",
    buildId: "build-1",
    version: 1,
    state,
    ...overrides,
  };
};

const createPersistedSnapshot = (
  overrides: Partial<ProjectSessionPersistedSnapshot> = {}
): ProjectSessionPersistedSnapshot => {
  const snapshot = createSnapshot(overrides);
  return {
    ...snapshot,
    freshness: createBuilderStateFreshness({
      state: snapshot.state,
      version: snapshot.version,
    }),
    compatibilityVersion,
    compatibility,
    revision: "rev-1",
    ...overrides,
  };
};

const createStorage = (
  initial?: ProjectSessionPersistedSnapshot
): ProjectSessionStorage & {
  saved: ProjectSessionPersistedSnapshot[];
  cleared: boolean;
} => {
  let current = initial;
  let revision = initial?.revision;
  return {
    saved: [],
    cleared: false,
    async load() {
      return current;
    },
    async save(snapshot, options) {
      expect(options.expectedRevision).toBe(revision);
      revision = `rev-${Number(revision?.replace("rev-", "") ?? 0) + 1}`;
      current = { ...snapshot, revision };
      this.saved.push(current);
      return { revision };
    },
    async clear() {
      current = undefined;
      revision = undefined;
      this.cleared = true;
    },
  };
};

const createTransport = (
  remote = createSnapshot()
): ProjectSessionTransport & {
  loadedNamespaces: BuilderNamespace[][];
  commits: BuilderPatchTransaction[][];
  permissionReads: number;
} => ({
  loadedNamespaces: [],
  commits: [],
  permissionReads: 0,
  async fetchNamespaces(input) {
    this.loadedNamespaces.push([...input.namespaces]);
    return remote;
  },
  async commitPatch(input) {
    this.commits.push([...input.transactions]);
    return { version: input.baseVersion + 1 };
  },
  async getPermissions() {
    this.permissionReads += 1;
    return {
      canView: true,
      canEdit: true,
      canBuild: true,
      canAdmin: false,
      canUseApi: true,
    };
  },
  async getCompatibility() {
    return compatibility;
  },
  async executeServerOperation<Result>(input: {
    operationId: string;
    input: unknown;
  }) {
    return { operationId: input.operationId } as unknown as Result;
  },
});

const createSession = ({
  storage = createStorage(),
  transport = createTransport(),
}: {
  storage?: ProjectSessionStorage;
  transport?: ProjectSessionTransport;
} = {}) =>
  createProjectSession({
    projectId: "project-1",
    storage,
    transport,
    compatibilityVersion,
    runtimeContext: {
      createId: () => "generated-id",
      now: () => new Date("2024-01-01T00:00:00.000Z"),
    },
  });

describe("project session", () => {
  test("initializes from compatible persisted state and serves reads locally", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.read("pages.list", { projectId: "project-1" });

    expect(result.source).toBe("local");
    expect(result.state.committed).toBe(false);
    expect(result.namespaces.read).toEqual(["pages"]);
    expect(transport.loadedNamespaces).toEqual([]);
  });

  test("clears persisted state when compatibility metadata changed", async () => {
    const storage = createStorage(
      createPersistedSnapshot({
        compatibility: {
          ...compatibility,
          runtimeContractVersion: "old-runtime-contracts",
        },
      })
    );
    const session = createSession({ storage });

    const result = await session.initialize();

    expect(result.result).toEqual({ loaded: false });
    expect(storage.cleared).toBe(true);
  });

  test("refreshes missing namespaces from remote and persists atomically", async () => {
    const storage = createStorage();
    const transport = createTransport();
    const session = createSession({ storage, transport });

    const result = await session.read("pages.list", { projectId: "project-1" });

    expect(result.source).toBe("local");
    expect(transport.loadedNamespaces).toEqual([["pages"]]);
    expect(storage.saved).toHaveLength(1);
  });

  test("does not update local state during dry-run mutations", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate(
      "folders.create",
      { name: "Draft", slug: "draft" },
      { dryRun: true }
    );

    expect(result.source).toBe("dry-run");
    expect(result.state.committed).toBe(false);
    expect(result.transaction?.payload).toHaveLength(1);
    expect(transport.commits).toEqual([]);
    expect(storage.saved).toHaveLength(0);
  });

  test("commits remotely before applying mutation locally", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("folders.create", {
      name: "New",
      slug: "new",
    });

    expect(result.source).toBe("remote");
    expect(result.state.committed).toBe(true);
    expect(result.version).toBe(2);
    expect(transport.commits).toHaveLength(1);
    expect(storage.saved.at(-1)?.version).toBe(2);
    expect(storage.saved.at(-1)?.state.pages?.folders.has("generated-id")).toBe(
      true
    );
  });

  test("refreshes required namespaces and returns conflict diagnostic", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    transport.commitPatch = async () => {
      throw Object.assign(new Error("Build version mismatch"), {
        code: "CONFLICT",
      });
    };
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("folders.create", {
      name: "New",
      slug: "new",
    });

    expect(result.state.committed).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "CONFLICT" }),
      expect.objectContaining({ code: "CONFLICT_REFRESHED" }),
    ]);
    expect(transport.loadedNamespaces).toEqual([["pages"]]);
  });

  test("retries retry-safe mutations once after conflict refresh", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport(createSnapshot({ version: 2 }));
    let attempts = 0;
    transport.commitPatch = async (input) => {
      attempts += 1;
      transport.commits.push([...input.transactions]);
      if (attempts === 1) {
        throw Object.assign(new Error("Build version mismatch"), {
          code: "CONFLICT",
        });
      }
      return { version: input.baseVersion + 1 };
    };
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("pages.update", {
      pageId: "page-home",
      values: { name: "Home updated" },
    });

    expect(result.state.committed).toBe(true);
    expect(result.version).toBe(3);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "CONFLICT" }),
      expect.objectContaining({ code: "CONFLICT_REFRESHED" }),
      expect.objectContaining({ code: "CONFLICT_RETRY" }),
    ]);
    expect(transport.loadedNamespaces).toEqual([["pages"]]);
    expect(transport.commits).toHaveLength(2);
  });

  test("checks and caches permissions for local runtime mutations", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    await session.mutate(
      "folders.create",
      { name: "First", slug: "first" },
      { permit: "build" }
    );
    await session.mutate(
      "folders.create",
      { name: "Second", slug: "second" },
      { permit: "build" }
    );

    expect(transport.permissionReads).toBe(1);
  });

  test("returns diagnostic when cached permissions deny local mutation", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    transport.getPermissions = async () => {
      transport.permissionReads += 1;
      return {
        canView: true,
        canEdit: false,
        canBuild: false,
        canAdmin: false,
        canUseApi: true,
      };
    };
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate(
      "folders.create",
      { name: "New", slug: "new" },
      { permit: "build" }
    );

    expect(result.state.committed).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        level: "error",
        message: "Authorization token does not have build permission.",
      }),
    ]);
    expect(transport.commits).toEqual([]);
  });

  test("clears cached permissions after plan errors", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    let attempts = 0;
    transport.commitPatch = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error("API permission requires an upgrade."), {
          code: "PLAN_REQUIRED",
        });
      }
      return { version: 2 };
    };
    const session = createSession({ storage, transport });

    await session.initialize();
    await session.mutate(
      "folders.create",
      { name: "First", slug: "first" },
      { permit: "build" }
    );
    await session.mutate(
      "folders.create",
      { name: "Second", slug: "second" },
      { permit: "build" }
    );

    expect(transport.permissionReads).toBe(2);
  });

  test("marks server-only invalidated namespaces stale without guessing semantics", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.executeServerOperation(
      { id: "upload-asset", invalidatesNamespaces: ["assets"] },
      { file: "image.png" }
    );

    expect(result.source).toBe("server");
    expect(result.namespaces.invalidated).toEqual(["assets"]);
    expect(storage.saved.at(-1)?.freshness.assets?.status).toBe("invalidated");
  });

  test("returns refreshed snapshot metadata after server-only invalidation refetch", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport(createSnapshot({ version: 5 }));
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.executeServerOperation(
      {
        id: "upload-asset",
        invalidatesNamespaces: ["assets"],
        refetchInvalidatedNamespaces: true,
      },
      { file: "image.png" }
    );

    expect(result.version).toBe(5);
    expect(result.state.freshness.assets?.status).toBe("fresh");
    expect(transport.loadedNamespaces).toEqual([["assets"]]);
    expect(storage.saved.at(-1)?.version).toBe(5);
  });

  test("redacts sensitive diagnostic values", () => {
    expect(
      redactProjectSessionValue({
        authToken: "secret",
        nested: { token: "secret", value: "visible" },
      })
    ).toEqual({
      authToken: "[redacted]",
      nested: { token: "[redacted]", value: "visible" },
    });
  });

  test("requires api permission before local project permits", () => {
    expect(
      hasProjectSessionPermit(
        {
          canView: true,
          canEdit: true,
          canBuild: true,
          canAdmin: true,
          canUseApi: false,
        },
        "build"
      )
    ).toBe(false);
    expect(
      hasProjectSessionPermit(
        {
          canView: true,
          canEdit: false,
          canBuild: false,
          canAdmin: false,
          canUseApi: true,
        },
        "view"
      )
    ).toBe(true);
  });
});
