import { describe, expect, test } from "vitest";
import { encodeDataVariableId } from "@webstudio-is/sdk";
import type { BuilderNamespace } from "./contracts/namespaces";
import type { BuilderPatchTransaction } from "./contracts/patch";
import {
  createDefaultProjectSessionCompatibility,
  createProjectSession,
  hasProjectSessionPermit,
  projectSessionBusyMessage,
  redactProjectSessionValue,
  serializeProjectSessionMeta,
} from "./project-session";
import { runtimeOperationContracts } from "./contracts/builder-runtime";
import type {
  ProjectSessionCompatibility,
  ProjectSessionPersistedSnapshot,
  ProjectSessionRemoteSnapshot,
  ProjectSessionStorage,
  ProjectSessionTransport,
} from "./project-session";
import { createBuilderStateFromSnapshot } from "./state/adapters";
import { createBuilderStateFreshness } from "./state/freshness";
import { applyBuilderPatchTransactions } from "./state/patch";
import { build } from "./state/fixtures.test-utils";
import { parseWebstudioJsxFragment } from "./runtime/jsx";
import { executeBuilderRuntimeOperation } from "./runtime/registry";
import type { BuilderRuntimeMutation } from "./runtime/mutation";

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

const createOneTimeConflictingStorage = (
  initial = createPersistedSnapshot()
) => {
  let current = initial;
  let revision = initial.revision;
  let saveAttempts = 0;
  const storage: ProjectSessionStorage = {
    async load() {
      return current;
    },
    async save(snapshot, options) {
      saveAttempts += 1;
      if (saveAttempts === 1) {
        revision = "rev-concurrent";
        current = { ...current, revision };
        throw new Error("Project session snapshot changed on disk.");
      }
      expect(options.expectedRevision).toBe(revision);
      revision = "rev-reconciled";
      current = { ...snapshot, revision };
      return { revision };
    },
    async clear() {},
  };
  return {
    storage,
    getCurrent: () => current,
    getSaveAttempts: () => saveAttempts,
  };
};

const createTransport = (
  remote = createSnapshot()
): ProjectSessionTransport & {
  loadedNamespaces: BuilderNamespace[][];
  commits: BuilderPatchTransaction[][];
  serverOperations: Array<{ operationId: string; input: unknown }>;
  permissionReads: number;
} => ({
  loadedNamespaces: [],
  commits: [],
  serverOperations: [],
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
    this.serverOperations.push(input);
    return { operationId: input.operationId } as unknown as Result;
  },
});

const createMutableTransport = (
  initialRemote: ProjectSessionRemoteSnapshot = createSnapshot()
) => {
  let remote = initialRemote;
  const transport = createTransport(remote);
  transport.commitPatch = async (input) => {
    transport.commits.push([...input.transactions]);
    const applied = applyBuilderPatchTransactions(
      remote.state,
      input.transactions
    );
    remote = {
      ...remote,
      version: input.baseVersion + 1,
      state: applied.state,
    };
    return { version: remote.version };
  };
  transport.fetchNamespaces = async (input) => {
    transport.loadedNamespaces.push([...input.namespaces]);
    return remote;
  };
  return transport;
};

const createSession = ({
  storage = createStorage(),
  transport = createTransport(),
}: {
  storage?: ProjectSessionStorage;
  transport?: ProjectSessionTransport;
} = {}) => {
  let generatedId = 0;
  return createProjectSession({
    projectId: "project-1",
    storage,
    transport,
    compatibilityVersion,
    runtimeContext: {
      createId: () => `generated-id-${generatedId++}`,
    },
  });
};

describe("project session", () => {
  test("derives default compatibility from the full runtime contract shape", () => {
    const compatibility =
      createDefaultProjectSessionCompatibility("test-session");
    const runtimeIdsVersion = `runtime-contracts:${runtimeOperationContracts
      .map((contract) => contract.id)
      .join(",")}`;

    expect(compatibility.runtimeContractVersion).toMatch(
      /^runtime-contracts:[a-z0-9]+$/
    );
    expect(compatibility.runtimeContractVersion).not.toBe(runtimeIdsVersion);
    expect(compatibility.runtimeContractVersion).toBe(
      createDefaultProjectSessionCompatibility("test-session")
        .runtimeContractVersion
    );
  });

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

  test("identifies session control operations in their envelopes", async () => {
    const session = createSession({
      storage: createStorage(),
      transport: createTransport(),
    });

    await expect(session.initialize()).resolves.toMatchObject({
      operationId: "project-session.status",
    });
    await expect(session.refresh(["pages"])).resolves.toMatchObject({
      operationId: "project-session.refresh",
    });
    await expect(session.reset()).resolves.toMatchObject({
      operationId: "project-session.reset",
    });
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

  test("persists project settings from a cold session across refresh", async () => {
    const storage = createStorage();
    const transport = createMutableTransport();
    const session = createSession({ storage, transport });

    const update = await session.mutate("projectSettings.update", {
      meta: { siteName: "Persisted site" },
    });
    expect(update.result).toEqual({ updated: true });
    expect(update.state.committed).toBe(true);
    expect(update.namespaces).toMatchObject({
      read: ["projectSettings"],
      write: ["projectSettings"],
      invalidated: ["projectSettings"],
    });

    await session.refresh(["projectSettings"]);
    const settings = await session.read("projectSettings.get", {});

    expect(settings.result).toMatchObject({
      meta: { siteName: "Persisted site" },
    });
    expect(transport.commits).toHaveLength(1);
    expect(transport.loadedNamespaces).toEqual([
      ["projectSettings"],
      ["projectSettings"],
      ["pages"],
    ]);
  });

  test("duplicates a page from a cold session with assets hydrated", async () => {
    const remote = createSnapshot({
      state: createBuilderStateFromSnapshot({
        ...build,
        assets: [
          [
            "asset-hero",
            {
              id: "asset-hero",
              projectId: "project-1",
              name: "hero.png",
              type: "image",
              size: 128,
              format: "png",
              createdAt: "2026-01-01T00:00:00.000Z",
              description: "Product hero",
              meta: { width: 1200, height: 800 },
            },
          ],
        ],
        instances: [
          [
            "instance-root",
            {
              type: "instance",
              id: "instance-root",
              component: "Body",
              children: [{ type: "id", value: "instance-image" }],
            },
          ],
          [
            "instance-image",
            {
              type: "instance",
              id: "instance-image",
              component: "Image",
              children: [],
            },
          ],
        ],
        props: [
          ...build.props,
          [
            "prop-image-src",
            {
              id: "prop-image-src",
              instanceId: "instance-image",
              name: "src",
              type: "asset",
              value: "asset-hero",
            },
          ],
        ],
      }),
    });
    const transport = createTransport(remote);
    const session = createSession({ transport });

    const result = await session.mutate(
      "pages.duplicate",
      {
        projectId: "project-1",
        pageId: "page-home",
        name: "Home copy",
        path: "/home-copy",
      },
      { dryRun: true }
    );

    expect(result.state.committed).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "DRY_RUN" }),
    ]);
    expect(transport.loadedNamespaces[0]).toEqual(
      expect.arrayContaining(["pages", "assets", "instances", "props"])
    );
    expect(result.transaction).toBeDefined();
    const plannedState = applyBuilderPatchTransactions(remote.state, [
      result.transaction!,
    ]).state;
    const duplicatedPage = Array.from(
      plannedState.pages?.pages.values() ?? []
    ).find((page) => page.name === "Home copy");
    expect(duplicatedPage).toBeDefined();
    const duplicateRoot = plannedState.instances?.get(
      duplicatedPage!.rootInstanceId
    );
    const duplicateImageId = duplicateRoot?.children.find(
      (child) => child.type === "id"
    )?.value;
    expect(duplicateImageId).toBeDefined();
    const duplicateAssetProp = Array.from(
      plannedState.props?.values() ?? []
    ).find(
      (prop) => prop.instanceId === duplicateImageId && prop.name === "src"
    );
    expect(duplicateAssetProp).toMatchObject({
      type: "asset",
      value: "asset-hero",
    });
    expect(plannedState.assets?.has("asset-hero")).toBe(true);
  });

  test("retries namespace refresh once when local snapshot changes on disk", async () => {
    const remote = createSnapshot();
    let current: ProjectSessionPersistedSnapshot | undefined;
    let revision: string | undefined;
    let saveAttempts = 0;
    const storage: ProjectSessionStorage & {
      saved: ProjectSessionPersistedSnapshot[];
    } = {
      saved: [],
      async load() {
        return current;
      },
      async save(snapshot, options) {
        saveAttempts += 1;
        if (saveAttempts === 1) {
          current = createPersistedSnapshot({
            ...remote,
            revision: "rev-concurrent",
          });
          revision = current.revision;
          throw new Error("Project session snapshot changed on disk.");
        }
        expect(options.expectedRevision).toBe(revision);
        revision = "rev-retry";
        current = { ...snapshot, revision };
        this.saved.push(current);
        return { revision };
      },
      async clear() {
        current = undefined;
        revision = undefined;
      },
    };
    const transport = createTransport(remote);
    const session = createSession({ storage, transport });

    const result = await session.read("breakpoints.list", {});

    expect(result.source).toBe("local");
    expect(result.diagnostics).toEqual([]);
    expect(saveAttempts).toBe(2);
    expect(transport.loadedNamespaces).toEqual([
      ["breakpoints"],
      ["breakpoints"],
    ]);
    expect(storage.saved).toHaveLength(1);
  });

  test("reports persistent session write conflicts as transient busy errors", async () => {
    const storage: ProjectSessionStorage = {
      async load() {
        return createPersistedSnapshot({ revision: "rev-concurrent" });
      },
      async save() {
        throw new Error("Project session snapshot changed on disk.");
      },
      async clear() {},
    };
    const session = createSession({ storage });

    await session.initialize();
    await expect(session.markStale(["breakpoints"])).rejects.toMatchObject({
      name: "PROJECT_SESSION_BUSY",
      code: "PROJECT_SESSION_BUSY",
      message: projectSessionBusyMessage,
    });
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
    expect(serializeProjectSessionMeta(result)).toMatchObject({
      diagnosticCount: 1,
      transaction: result.transaction,
      diagnostics: [
        {
          level: "info",
          code: "DRY_RUN",
          message: "Mutation was planned locally and was not committed.",
        },
      ],
    });
    const compact = serializeProjectSessionMeta(result);
    const verbose = serializeProjectSessionMeta(result, { verbose: true });
    expect(compact).not.toHaveProperty("namespaces");
    expect(verbose).toMatchObject({
      ...compact,
      namespaces: result.namespaces,
      freshness: result.state.freshness,
    });
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(verbose).length * 0.75
    );

    const withSecretDiagnostic = {
      ...result,
      diagnostics: [
        ...result.diagnostics,
        {
          level: "warning" as const,
          code: "TEST_DIAGNOSTIC",
          message:
            "A credential was rejected at https://example.com/?authToken=also-never-print-this.",
          details: { authToken: "never-print-this" },
        },
      ],
    };
    expect(
      JSON.stringify(serializeProjectSessionMeta(withSecretDiagnostic))
    ).not.toContain("never-print-this");
    const redactedVerbose = JSON.stringify(
      serializeProjectSessionMeta(withSecretDiagnostic, { verbose: true })
    );
    expect(redactedVerbose).not.toContain("never-print-this");
    expect(redactedVerbose).not.toContain("also-never-print-this");
    expect(redactedVerbose).toContain("[redacted]");
    expect(transport.commits).toEqual([]);
    expect(storage.saved).toHaveLength(0);
  });

  test("plans and commits one semantic Collection transaction that survives refresh", async () => {
    let remote = createSnapshot();
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport(remote);
    transport.fetchNamespaces = async (input) => {
      transport.loadedNamespaces.push([...input.namespaces]);
      return remote;
    };
    let serverGeneratedId = 0;
    transport.executeServerOperation = async <Result>(input: {
      operationId: string;
      input: unknown;
    }) => {
      transport.serverOperations.push(input);
      const mutation =
        await executeBuilderRuntimeOperation<BuilderRuntimeMutation>({
          id: input.operationId,
          state: remote.state,
          input: input.input,
          context: {
            projectVersion: remote.version,
            createId: () => `server-generated-id-${serverGeneratedId++}`,
          },
        });
      const transaction: BuilderPatchTransaction = {
        id: `server-transaction-${serverGeneratedId++}`,
        payload: mutation.payload,
      };
      remote = {
        ...remote,
        version: remote.version + 1,
        state: applyBuilderPatchTransactions(remote.state, [transaction]).state,
      };
      return mutation.result as Result;
    };
    const session = createSession({ storage, transport });
    const input = {
      parentInstanceId: "instance-root",
      data: {
        type: "json" as const,
        value: [{ title: "First" }, { title: "Second" }],
      },
      itemFragment: await parseWebstudioJsxFragment(
        '<ws.element ws:tag="article">{expression`collectionItem.title`}</ws.element>'
      ),
    };

    await session.initialize();
    const planned = await session.mutate("instances.insertCollection", input, {
      dryRun: true,
    });
    expect(planned.diagnostics).toEqual([
      expect.objectContaining({ code: "DRY_RUN" }),
    ]);
    expect(planned.source).toBe("dry-run");
    expect(planned.state.committed).toBe(false);
    expect(
      planned.transaction?.payload.map((change) => change.namespace)
    ).toEqual(expect.arrayContaining(["instances", "props", "dataSources"]));
    expect(transport.commits).toHaveLength(0);

    const committed = await session.mutate("instances.insertCollection", input);
    expect(committed.state.committed).toBe(true);
    expect(transport.serverOperations).toHaveLength(1);
    const result = committed.result as { collectionInstanceId: string };
    expect(
      remote.state.instances?.get(result.collectionInstanceId)
    ).toMatchObject({
      component: "ws:collection",
    });

    await session.refresh(["instances", "props", "dataSources"]);
    expect(
      storage.saved.at(-1)?.state.instances?.get(result.collectionInstanceId)
    ).toMatchObject({ component: "ws:collection" });
  });

  test("commits remotely before applying mutation locally", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("pages.update", {
      pageId: "page-home",
      values: { name: "New Home" },
    });

    expect(result.source).toBe("local");
    expect(result.state.committed).toBe(true);
    expect(result.version).toBe(2);
    expect(transport.commits).toHaveLength(1);
    expect(transport.serverOperations).toEqual([]);
    expect(storage.saved.at(-1)?.version).toBe(2);
    expect(
      storage.saved.at(-1)?.state.pages?.pages.get("page-home")?.name
    ).toBe("New Home");
    expect(storage.saved.at(-1)?.freshness.pages).toMatchObject({
      status: "invalidated",
      version: 2,
      source: "local",
      loadedAt: expect.any(String),
      invalidatedBy: "pages.update",
    });
    expect(serializeProjectSessionMeta(result)).toMatchObject({
      source: "local",
      committed: true,
    });
    expect(storage.saved.at(-1)?.freshness.instances).toEqual({
      status: "fresh",
      version: 1,
    });
  });

  test("reports a mutation as committed after reconciling a local snapshot race", async () => {
    const { storage, getCurrent } = createOneTimeConflictingStorage();
    const transport = createMutableTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("pages.update", {
      pageId: "page-home",
      values: { name: "New Home" },
    });

    expect(transport.commits).toHaveLength(1);
    expect(result.state.committed).toBe(true);
    expect(result.result).toMatchObject({ pageId: "page-home" });
    expect(result.version).toBe(2);
    expect(result.diagnostics).toEqual([
      {
        level: "info",
        code: "COMMITTED_SESSION_RECONCILED",
        message:
          "The mutation committed and the local project session was refreshed after its snapshot could not be saved.",
      },
    ]);
    expect(getCurrent().version).toBe(2);
    expect(getCurrent().state.pages?.pages.get("page-home")?.name).toBe(
      "New Home"
    );
  });

  test("does not report an applied mutation as uncommitted when reconciliation fails", async () => {
    const current = createPersistedSnapshot();
    let saveAttempts = 0;
    const storage: ProjectSessionStorage = {
      async load() {
        return current;
      },
      async save() {
        saveAttempts += 1;
        throw new Error("Project session snapshot changed on disk.");
      },
      async clear() {},
    };
    const transport = createTransport();
    transport.fetchNamespaces = async () => {
      throw new Error("Remote refresh failed.");
    };
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("pages.update", {
      pageId: "page-home",
      values: { name: "New Home" },
    });

    expect(transport.commits).toHaveLength(1);
    expect(saveAttempts).toBe(1);
    expect(result.state.committed).toBe(true);
    expect(result.result).toMatchObject({ pageId: "page-home" });
    expect(result.state.freshness.pages?.status).toBe("stale");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        level: "warning",
        code: "COMMITTED_SESSION_RECONCILE_FAILED",
        message:
          "The mutation committed remotely, but the local project session could not be refreshed. Do not retry the mutation; refresh the session before the next change.",
      }),
    ]);
  });

  test("runs generated-record create mutations on the server", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("folders.create", {
      name: "New",
      slug: "new",
    });

    expect(result.source).toBe("server");
    expect(result.state.committed).toBe(true);
    expect(transport.commits).toEqual([]);
    expect(transport.serverOperations).toEqual([
      {
        operationId: "folders.create",
        input: { name: "New", slug: "new" },
      },
    ]);
    expect(transport.loadedNamespaces.at(-1)).toEqual(["pages"]);
  });

  test("does not report a committed server mutation as busy after a local snapshot race", async () => {
    const { storage, getSaveAttempts } = createOneTimeConflictingStorage();
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("folders.create", {
      name: "New",
      slug: "new",
    });

    expect(result.source).toBe("server");
    expect(result.state.committed).toBe(true);
    expect(getSaveAttempts()).toBe(2);
    expect(transport.serverOperations).toEqual([
      {
        operationId: "folders.create",
        input: { name: "New", slug: "new" },
      },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  test("commits generated-record field mutations locally", async () => {
    const variableId = "variable-title";
    const state = createBuilderStateFromSnapshot(build);
    const homePage = state.pages?.pages.get("page-home");
    if (homePage === undefined || state.dataSources === undefined) {
      throw new Error("Expected project session test fixture state.");
    }
    homePage.title = encodeDataVariableId(variableId);
    state.dataSources.set(variableId, {
      id: variableId,
      scopeInstanceId: "instance-root",
      name: "pageTitle",
      type: "variable",
      value: { type: "string", value: "Home" },
    });
    const storage = createStorage(createPersistedSnapshot({ state }));
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("variables.delete", {
      dataSourceId: variableId,
    });

    expect(result.source).toBe("local");
    expect(result.state.committed).toBe(true);
    expect(transport.commits).toHaveLength(1);
    expect(transport.serverOperations).toEqual([]);
    expect(result.transaction?.payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: "pages",
          patches: expect.arrayContaining([
            {
              op: "replace",
              path: ["pages", "page-home", "title"],
              value: "pageTitle",
            },
          ]),
        }),
        expect.objectContaining({
          namespace: "dataSources",
          patches: [{ op: "remove", path: [variableId] }],
        }),
      ])
    );
  });

  test("distinguishes locally written namespaces from additional invalidations", async () => {
    const state = createBuilderStateFromSnapshot(build);
    state.resources?.set("resource", {
      id: "resource",
      name: "Users",
      method: "get",
      url: '"https://example.com/users"',
      headers: [],
    });
    const storage = createStorage(createPersistedSnapshot({ state }));
    const transport = createTransport();
    const session = createSession({ storage, transport });

    await session.initialize();
    const result = await session.mutate("resources.update", {
      resourceId: "resource",
      values: { name: "Customers" },
    });

    expect(result.source).toBe("local");
    expect(result.state.committed).toBe(true);
    expect(storage.saved.at(-1)?.freshness.resources).toMatchObject({
      status: "invalidated",
      version: 2,
      source: "local",
      invalidatedBy: "resources.update",
    });
    expect(storage.saved.at(-1)?.freshness.pages).toMatchObject({
      status: "invalidated",
      version: 1,
      invalidatedBy: "resources.update",
    });
  });

  test("returns actionable validation issues from local runtime operations", async () => {
    const storage = createStorage(createPersistedSnapshot());
    const session = createSession({ storage, transport: createTransport() });

    await session.initialize();
    const result = await session.mutate("pages.update", {
      pageId: "page-home",
      values: { name: 42 },
    });

    expect(result.state.committed).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "INVALID_INPUT",
        issues: [
          expect.objectContaining({
            code: "invalid_type",
            path: ["values", "name"],
            constraint: "type:string",
            example: "string",
          }),
        ],
      }),
    ]);
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
    const result = await session.mutate("instances.updateProps", {
      updates: [
        {
          instanceId: "instance-root",
          name: "Title",
          type: "string",
          value: "Conflict",
        },
      ],
    });

    expect(result.state.committed).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "CONFLICT" }),
      expect.objectContaining({ code: "CONFLICT_REFRESHED" }),
    ]);
    expect(transport.loadedNamespaces).toEqual([
      ["instances", "props", "dataSources"],
    ]);
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
      "instances.updateProps",
      {
        updates: [
          {
            instanceId: "instance-root",
            name: "Title",
            type: "string",
            value: "First",
          },
        ],
      },
      { permit: "build" }
    );
    await session.mutate(
      "instances.updateProps",
      {
        updates: [
          {
            instanceId: "instance-root",
            name: "Title",
            type: "string",
            value: "Second",
          },
        ],
      },
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
      "instances.updateProps",
      {
        updates: [
          {
            instanceId: "instance-root",
            name: "Title",
            type: "string",
            value: "First",
          },
        ],
      },
      { permit: "build" }
    );
    await session.mutate(
      "instances.updateProps",
      {
        updates: [
          {
            instanceId: "instance-root",
            name: "Title",
            type: "string",
            value: "Second",
          },
        ],
      },
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
