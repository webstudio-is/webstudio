import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  bundleVersion,
  publicApiContractVersion,
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
} from "@webstudio-is/protocol";
import type { Instance } from "@webstudio-is/sdk";
import type { BuilderState } from "@webstudio-is/project-build/state";
import type { BuilderPatchTransaction } from "@webstudio-is/project-build/contracts";
import type { BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import React from "react";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const execFileAsync = promisify(execFile);
const projectId = "release-smoke-project";
const buildId = "release-smoke-build";
const projectVersion = 1;
const sessionVersion = "cli-project-session-v1";
const releaseVersionPlaceholder = "0.0.0-webstudio-version";
const agentSmokeClients = [
  { connect: "claude", name: "claude-code" },
  { connect: "codex", name: "codex" },
  { connect: "cursor", name: "cursor" },
] as const;

const reportPhase = (phase: string, startedAt = Date.now()) => {
  process.stderr.write(
    `[release-smoke] ${phase} (${Date.now() - startedAt}ms)\n`
  );
};

const runAgentWorkflowStep = async <Result>({
  step,
  recovery,
  run,
}: {
  step: string;
  recovery: string;
  run: () => Promise<Result>;
}) => {
  try {
    return await run();
  } catch (error) {
    throw new Error(
      `Agent connection workflow stopped at "${step}": ${error instanceof Error ? error.message : String(error)} Recovery: ${recovery}`,
      { cause: error }
    );
  }
};

const replaceReleaseVersion = async (
  directory: string,
  releaseVersion: string,
  workspaceVersions: ReadonlyMap<string, string>
) => {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await replaceReleaseVersion(
          entryPath,
          releaseVersion,
          workspaceVersions
        );
        return;
      }
      if (/\.(?:js|mjs|json)$/.test(entry.name) === false) {
        return;
      }
      const source = await readFile(entryPath, "utf8");
      let releaseSource = source.replaceAll(
        releaseVersionPlaceholder,
        releaseVersion
      );
      if (entry.name === "package.json") {
        const manifest = JSON.parse(releaseSource) as Record<string, unknown>;
        for (const field of [
          "dependencies",
          "devDependencies",
          "optionalDependencies",
          "peerDependencies",
        ]) {
          const dependencies = manifest[field];
          if (
            typeof dependencies !== "object" ||
            dependencies === null ||
            Array.isArray(dependencies)
          ) {
            continue;
          }
          const dependencyVersions = dependencies as Record<string, unknown>;
          for (const [name, version] of Object.entries(dependencyVersions)) {
            if (
              typeof version === "string" &&
              version.startsWith("workspace:")
            ) {
              const workspaceVersion = workspaceVersions.get(name);
              if (workspaceVersion === undefined) {
                throw new Error(
                  `Cannot resolve workspace dependency ${name} in ${entryPath}.`
                );
              }
              dependencyVersions[name] = workspaceVersion;
            }
          }
        }
        releaseSource = JSON.stringify(manifest, undefined, 2);
      }
      if (releaseSource !== source) {
        await writeFile(entryPath, releaseSource, "utf8");
      }
    })
  );
};

const packReleaseShapedCli = async ({
  stagingDirectory,
  packDirectory,
}: {
  stagingDirectory: string;
  packDirectory: string;
}) => {
  const cliDirectory = join(import.meta.dirname, "..");
  await Promise.all(
    ["bin.js", "package.json", "lib", "templates"].map((entry) =>
      cp(join(cliDirectory, entry), join(stagingDirectory, entry), {
        recursive: true,
      })
    )
  );
  const releaseVersion =
    process.env.WEBSTUDIO_RELEASE_SMOKE_VERSION ??
    JSON.parse(
      (await execFileAsync("npm", ["view", "webstudio", "version", "--json"]))
        .stdout
    );
  if (typeof releaseVersion !== "string" || releaseVersion.length === 0) {
    throw new Error("Could not resolve a published Webstudio release version.");
  }
  const packagesDirectory = join(import.meta.dirname, "../..");
  const workspaceVersions = new Map<string, string>();
  for (const entry of await readdir(packagesDirectory, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory() === false) {
      continue;
    }
    try {
      const manifest = JSON.parse(
        await readFile(
          join(packagesDirectory, entry.name, "package.json"),
          "utf8"
        )
      ) as { name?: string; version?: string };
      if (manifest.name !== undefined && manifest.version !== undefined) {
        workspaceVersions.set(
          manifest.name,
          manifest.version.replace(releaseVersionPlaceholder, releaseVersion)
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }
  await replaceReleaseVersion(
    stagingDirectory,
    releaseVersion,
    workspaceVersions
  );
  await execFileAsync("npm", ["pack", "--pack-destination", packDirectory], {
    cwd: stagingDirectory,
  });
  return releaseVersion;
};

const createFixture = () => {
  const assets = [
    {
      id: "asset-hero",
      projectId,
      name: "release-hero.png",
      filename: "release-hero.png",
      type: "image" as const,
      size: 128,
      format: "png",
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "Release smoke hero",
      meta: { width: 1200, height: 800 },
    },
  ];
  const basePages = [
    {
      id: "home",
      name: "Home",
      title: "Home",
      path: "",
      rootInstanceId: "home-root",
      meta: {},
    },
    {
      id: "pricing",
      name: "Pricing",
      title: "Pricing",
      path: "/pricing",
      rootInstanceId: "pricing-root",
      meta: {},
    },
  ];
  const extraPageCount =
    process.env.WEBSTUDIO_RELEASE_SMOKE_LARGE_AUDIT === "1" ? 120 : 0;
  const pages = [
    ...basePages,
    ...Array.from({ length: extraPageCount }, (_, index) => {
      const number = index + 3;
      return {
        id: `audit-${number}`,
        name: `Audit ${number}`,
        title: `Audit ${number}`,
        path: `/audit-${number}`,
        rootInstanceId: `audit-${number}-root`,
        meta: {},
      };
    }),
  ];
  const persistedPages = {
    meta: { siteName: "Release Smoke", contactEmail: "" },
    compiler: { atomicStyles: true },
    redirects: [],
    homePageId: "home",
    rootFolderId: "root-folder",
    pages,
    folders: [
      {
        id: "root-folder",
        name: "Root",
        slug: "",
        children: pages.map((page) => page.id),
      },
    ],
  };
  const instances: Array<[string, Instance]> = pages.map((page) => [
    page.rootInstanceId,
    {
      type: "instance",
      id: page.rootInstanceId,
      component: "Box",
      children:
        page.id === "home"
          ? [
              { type: "text", value: `Release smoke ${page.name}` },
              { type: "id", value: "home-image" },
            ]
          : [{ type: "text", value: `Release smoke ${page.name}` }],
    },
  ]);
  instances.push([
    "home-image",
    {
      type: "instance",
      id: "home-image",
      component: "Image",
      children: [],
    },
  ]);
  const props = [
    {
      id: "home-image-src",
      instanceId: "home-image",
      name: "src",
      type: "asset" as const,
      value: "asset-hero",
    },
  ];
  const build = {
    id: buildId,
    projectId,
    version: projectVersion,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    pages: persistedPages,
    props: props.map((prop) => [prop.id, prop]) as never,
    instances: instances as never,
    dataSources: [],
    resources: [],
    styleSources: [],
    styleSourceSelections: [],
    styles: [],
    breakpoints: [],
    projectSettings: { meta: {}, compiler: {} },
  };
  return {
    data: {
      bundleVersion,
      origin: "https://assets.example",
      projectDomain: "example.com",
      projectTitle: "Release Smoke",
      page: pages[0],
      pages,
      assets,
      build,
    },
    build,
    persistedPages,
    instances,
    assets,
    props,
  };
};

const waitForUrl = async (url: string, child: ChildProcess) => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Preview exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become ready at ${url}.`);
};

const stopProcessTree = async (child: ChildProcess | undefined) => {
  if (child?.pid === undefined) {
    return;
  }
  const pid = child.pid;
  const usesProcessGroup = process.platform !== "win32";
  const signal = (value: NodeJS.Signals) => {
    try {
      if (usesProcessGroup) {
        process.kill(-pid, value);
      } else {
        child.kill(value);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
        throw error;
      }
    }
  };
  const isRunning = () => {
    try {
      process.kill(usesProcessGroup ? -pid : pid, 0);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") {
        return false;
      }
      throw error;
    }
  };
  const waitUntilStopped = async (timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (isRunning() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return isRunning() === false;
  };

  signal("SIGTERM");
  if (await waitUntilStopped(5_000)) {
    return;
  }
  signal("SIGKILL");
  if ((await waitUntilStopped(5_000)) === false) {
    throw new Error(`Preview process group ${pid} did not stop.`);
  }
};

const readTrpcInput = async (request: import("node:http").IncomingMessage) => {
  const url = new URL(request.url ?? "", "http://127.0.0.1");
  const source =
    request.method === "GET"
      ? (url.searchParams.get("input") ?? "{}")
      : await new Promise<string>((resolve, reject) => {
          let body = "";
          request.setEncoding("utf8");
          request.on("data", (chunk) => {
            body += chunk;
          });
          request.on("end", () => resolve(body || "{}"));
          request.on("error", reject);
        });
  const batch = JSON.parse(source) as Record<string, unknown>;
  const first = batch["0"];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return {};
  }
  return "json" in first ? ((first as { json?: unknown }).json ?? {}) : first;
};

const startFixtureApi = async (
  fixture: ReturnType<typeof createFixture>,
  {
    initialState,
    executeRuntime,
    applyTransactions,
    serializeFixturePages,
  }: {
    initialState: BuilderState;
    executeRuntime: (input: {
      id: string;
      state: BuilderState;
      input: unknown;
      context: {
        createId: () => string;
        projectId: string;
        projectVersion: number;
      };
    }) => unknown | Promise<unknown>;
    applyTransactions: (
      state: BuilderState,
      transactions: readonly BuilderPatchTransaction[]
    ) => { state: BuilderState };
    serializeFixturePages: (
      pages: NonNullable<BuilderState["pages"]>
    ) => ReturnType<
      typeof import("@webstudio-is/project-migrations/pages").serializePages
    >;
  }
) => {
  let version = projectVersion;
  let state = initialState;
  let generatedId = 0;
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = request.url ?? "";
      if (
        new URL(requestUrl, "http://127.0.0.1").pathname.endsWith(
          "/release-hero.png"
        )
      ) {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "base64"
          )
        );
        return;
      }
      const operationPath = new URL(
        requestUrl,
        "http://127.0.0.1"
      ).pathname.replace(/^\/trpc\/(?:api\.)?/, "");
      let data: unknown;
      if (operationPath === "build.loadProjectBundleByProjectId") {
        data = fixture.data;
      } else if (operationPath === "projects.get") {
        data = {
          id: projectId,
          name: "Release smoke project",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          buildId,
          version,
          homePageId: "home",
          features: {},
        };
      } else if (operationPath === "publish.create") {
        data = { jobId: "release-smoke-staging-job" };
      } else if (operationPath === "build.patch") {
        const input = (await readTrpcInput(request)) as {
          transactions?: BuilderPatchTransaction[];
        };
        state = applyTransactions(state, input.transactions ?? []).state;
        version += 1;
        data = { version };
      } else if (operationPath === "build.get") {
        const pages = serializeFixturePages(state.pages!);
        data = {
          ...fixture.build,
          buildId,
          version,
          pages: pages.pages,
          pageTemplates: pages.pageTemplates,
          folders: pages.folders,
          homePageId: pages.homePageId,
          rootFolderId: pages.rootFolderId,
          meta: pages.meta,
          compiler: pages.compiler,
          redirects: pages.redirects,
          assets: Array.from(state.assets?.values() ?? []),
          instances: Array.from(state.instances?.values() ?? []),
          props: Array.from(state.props?.values() ?? []),
          dataSources: Array.from(state.dataSources?.values() ?? []),
          resources: Array.from(state.resources?.values() ?? []),
          breakpoints: Array.from(state.breakpoints?.values() ?? []),
          styles: Array.from(state.styles?.values() ?? []),
          styleSources: Array.from(state.styleSources?.values() ?? []),
          styleSourceSelections: Array.from(
            state.styleSourceSelections?.values() ?? []
          ),
          marketplaceProduct: state.marketplaceProduct,
          projectSettings: state.projectSettings,
        };
      } else if (
        operationPath !== "projects.permissions" &&
        operationPath !== ""
      ) {
        const input = await readTrpcInput(request);
        const result = await executeRuntime({
          id: operationPath,
          state,
          input,
          context: {
            createId: () => `fixture-${generatedId++}`,
            projectId,
            projectVersion: version,
          },
        });
        if (
          typeof result === "object" &&
          result !== null &&
          "kind" in result &&
          (result as BuilderRuntimeMutation).kind === "mutation"
        ) {
          const mutation = result as BuilderRuntimeMutation;
          state = applyTransactions(state, [
            {
              id: `fixture-transaction-${generatedId++}`,
              payload: mutation.payload,
            },
          ]).state;
          version += 1;
          data = mutation.result;
        } else {
          data = result;
        }
      } else {
        data = {
          canView: true,
          canEdit: true,
          canBuild: true,
          canAdmin: true,
          canUseApi: true,
          apiContract: {
            version: publicApiContractVersion,
            operationIds: publicApiOperations.flatMap((operation) =>
              publicApiOperationRequiresServerSupport(operation)
                ? [operation.id]
                : []
            ),
          },
        };
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([{ result: { data } }]));
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(
        JSON.stringify([
          {
            error: {
              message: error instanceof Error ? error.message : String(error),
              code: -32603,
              data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
            },
          },
        ])
      );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Fixture API address is unavailable.");
  }
  return { server, origin: `http://127.0.0.1:${address.port}` };
};

const closeServer = async (server: Server | undefined) => {
  if (server === undefined) {
    return;
  }
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
};

const assertJsonStdout = async (stdout: string, label: string) => {
  try {
    JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} did not print valid JSON.`, { cause: error });
  }
};

const getRecord = (value: unknown, label: string) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is not an object.`);
  }
  return value as Record<string, unknown>;
};

const assertScreenshotEvidence = async ({
  payload,
  label,
  path,
  status,
  viewport,
  projectDirectory,
  generatedSite = true,
  origin = "http://127.0.0.1:5190",
}: {
  payload: Record<string, unknown>;
  label: string;
  path: string;
  status: number;
  viewport: { width: number; height: number };
  projectDirectory: string;
  generatedSite?: boolean;
  origin?: string;
}) => {
  const data = getRecord(payload.data, `${label} data`);
  const navigation = getRecord(data.navigation, `${label} navigation`);
  const finalUrl = new URL(String(navigation.finalUrl));
  if (
    finalUrl.origin !== origin ||
    finalUrl.pathname !== path ||
    navigation.status !== status ||
    (generatedSite && navigation.generatedSiteRootPresent !== true)
  ) {
    throw new Error(
      `${label} returned unexpected navigation evidence: ${JSON.stringify(navigation)}`
    );
  }
  const actualViewport = getRecord(data.viewport, `${label} viewport`);
  if (
    actualViewport.width !== viewport.width ||
    actualViewport.height !== viewport.height
  ) {
    throw new Error(
      `${label} returned unexpected viewport: ${JSON.stringify(actualViewport)}`
    );
  }
  const output = String(data.output);
  const screenshot = await readFile(
    output.startsWith("/") ? output : join(projectDirectory, output)
  );
  const isPng = screenshot
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    screenshot.subarray(0, 4).toString("ascii") === "RIFF" &&
    screenshot.subarray(8, 12).toString("ascii") === "WEBP";
  if (screenshot.length === 0 || (isPng === false && isWebp === false)) {
    throw new Error(`${label} did not create a valid PNG or WebP artifact.`);
  }
};

const run = async () => {
  Object.assign(globalThis, {
    React,
  });
  const [
    pagesModule,
    adapters,
    namespaces,
    projectSession,
    runtimeRegistry,
    statePatch,
  ] = await Promise.all([
    import("@webstudio-is/project-migrations/pages"),
    import("@webstudio-is/project-build/state"),
    import("@webstudio-is/project-build/contracts"),
    import("@webstudio-is/project-build/project-session"),
    import("@webstudio-is/project-build/runtime"),
    import("@webstudio-is/project-build/state"),
  ]);
  const temp = await mkdtemp(join(tmpdir(), "webstudio-release-smoke-"));
  let preview: ChildProcess | undefined;
  let apiServer: Server | undefined;
  try {
    const startedAt = Date.now();
    const fixture = createFixture();
    const initialState = adapters.createBuilderStateFromBuildData({
      ...fixture.build,
      pages: pagesModule.migratePages(fixture.persistedPages),
      assets: fixture.assets,
      instances: fixture.instances.map(([, instance]) => instance),
      props: fixture.props,
    });
    const fixtureApi = await startFixtureApi(fixture, {
      initialState,
      executeRuntime: runtimeRegistry.executeBuilderRuntimeOperation,
      applyTransactions: statePatch.applyBuilderPatchTransactions,
      serializeFixturePages: pagesModule.serializePages,
    });
    fixture.data.origin = fixtureApi.origin;
    reportPhase("fixture API ready", startedAt);
    apiServer = fixtureApi.server;
    const packDirectory = join(temp, "pack");
    const stagingDirectory = join(temp, "staging");
    const projectDirectory = join(temp, "project");
    const configDirectory = join(temp, "config");
    await Promise.all([
      mkdir(packDirectory, { recursive: true }),
      mkdir(stagingDirectory, { recursive: true }),
      mkdir(join(projectDirectory, ".webstudio"), { recursive: true }),
      mkdir(join(configDirectory, "webstudio-nodejs"), { recursive: true }),
    ]);
    const packStartedAt = Date.now();
    const releaseVersion = await packReleaseShapedCli({
      stagingDirectory,
      packDirectory,
    });
    reportPhase("packed release-shaped CLI", packStartedAt);
    const tarballName = (await readdir(packDirectory)).find((name) =>
      name.endsWith(".tgz")
    );
    if (tarballName === undefined) {
      throw new Error("pnpm pack did not produce a tarball.");
    }
    await writeFile(
      join(projectDirectory, "package.json"),
      JSON.stringify({ private: true }),
      "utf8"
    );
    const installStartedAt = Date.now();
    const install = await execFileAsync(
      "npm",
      [
        "install",
        join(packDirectory, tarballName),
        "--no-audit",
        "--no-fund",
        "--loglevel=warn",
      ],
      { cwd: projectDirectory, maxBuffer: 10 * 1024 * 1024 }
    );
    if (/ERESOLVE|overriding peer dependency/i.test(install.stderr)) {
      throw new Error(
        `npm install emitted peer dependency warnings:\n${install.stderr}`
      );
    }
    reportPhase("installed packed CLI", installStartedAt);

    const bin = join(projectDirectory, "node_modules", ".bin", "webstudio");
    const env = {
      ...process.env,
      WEBSTUDIO_CONFIG_DIR: configDirectory,
    };
    const globalConfigPath = join(configDirectory, "webstudio-config.json");
    await mkdir(dirname(globalConfigPath), { recursive: true });
    await writeFile(globalConfigPath, "{}", "utf8");
    const workflowStartedAt = Date.now();
    const runCliStep = (step: string, recovery: string, args: string[]) =>
      runAgentWorkflowStep({
        step,
        recovery,
        run: () =>
          execFileAsync(bin, args, {
            cwd: projectDirectory,
            env,
            maxBuffer: 20 * 1024 * 1024,
          }),
      });

    const shareLink = `${fixtureApi.origin}/builder/${projectId}?authToken=fixture`;
    const initialized = await runCliStep(
      "link",
      "Create a fresh editable API share link and rerun webstudio init --link <share-link> --json.",
      ["init", "--link", shareLink, "--json"]
    );
    await assertJsonStdout(initialized.stdout, "agent workflow link");
    await runCliStep(
      "sync",
      "Verify the share link has API access, then run webstudio sync again.",
      ["sync"]
    );
    for (const { connect: client } of agentSmokeClients) {
      await runCliStep(
        `connect ${client}`,
        `Run webstudio connect ${client} again and reload ${client}.`,
        ["connect", client]
      );
    }

    const state = adapters.createBuilderStateFromBuildData({
      ...fixture.build,
      pages: pagesModule.migratePages(fixture.persistedPages),
      assets: fixture.assets,
      instances: fixture.instances.map(([, instance]) => instance),
      props: fixture.props,
    });
    const loadedAt = "2026-01-01T00:00:00.000Z";
    const freshness = Object.fromEntries(
      namespaces.builderNamespaces.map((namespace) => [
        namespace,
        {
          status: "fresh",
          version: projectVersion,
          source: "remote",
          loadedAt,
        },
      ])
    );
    await writeFile(
      join(projectDirectory, ".webstudio", "project-session.json"),
      JSON.stringify({
        projectId,
        buildId,
        version: projectVersion,
        state: adapters.createSerializedBuilderStateSnapshotFromState(state),
        freshness,
        compatibilityVersion: sessionVersion,
        compatibility: {
          ...projectSession.createDefaultProjectSessionCompatibility(
            sessionVersion
          ),
          apiCompatibilityVersion: releaseVersion,
        },
        revision: randomUUID(),
      }),
      "utf8"
    );
    const invoke = async (label: string, args: string[]) => {
      const result = await execFileAsync(bin, args, {
        cwd: projectDirectory,
        env,
        maxBuffer: 20 * 1024 * 1024,
      });
      await assertJsonStdout(result.stdout, label);
      return JSON.parse(result.stdout) as Record<string, unknown>;
    };

    const stagingPublish = await invoke("agent workflow staging publish", [
      "publish",
      "deploy",
      "--target",
      "staging",
      "--json",
    ]);
    if (
      stagingPublish.ok !== true ||
      getRecord(stagingPublish.data, "staging publish data").jobId !==
        "release-smoke-staging-job"
    ) {
      throw new Error(
        `Agent connection workflow stopped at "staging publish": ${JSON.stringify(stagingPublish)} Recovery: Verify edit permission and retry webstudio publish deploy --target staging --json.`
      );
    }

    const docs = await readFile(
      join(import.meta.dirname, "../src/docs/api-use-cases.md"),
      "utf8"
    );
    const documentedAuditCommands = docs
      .split("\n")
      .filter((line) => line.startsWith("- webstudio audit "))
      .map((line) =>
        line
          .slice("- webstudio ".length)
          .trim()
          .split(/\s+/)
          .filter((arg) => arg !== "--json")
      );
    if (documentedAuditCommands.length === 0) {
      throw new Error("No documented audit CLI examples were found.");
    }
    const helpStartedAt = Date.now();
    for (const args of documentedAuditCommands) {
      const result = await execFileAsync(bin, [...args, "--help"], {
        cwd: projectDirectory,
        env,
      });
      if (!result.stdout.includes("webstudio audit")) {
        throw new Error(
          `Packed audit help is not audit-specific: ${result.stdout}`
        );
      }
    }
    reportPhase("validated packed audit help examples", helpStartedAt);

    const previewStartedAt = Date.now();
    preview = spawn(bin, ["preview", "--port", "5190"], {
      cwd: projectDirectory,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForUrl("http://127.0.0.1:5190/", preview);
    const previewManifest = JSON.parse(
      await readFile(
        join(projectDirectory, ".webstudio/preview/package.json"),
        "utf8"
      )
    ) as { dependencies?: Record<string, string> };
    if (
      previewManifest.dependencies?.ipx !== undefined ||
      previewManifest.dependencies?.h3 !== undefined
    ) {
      throw new Error(
        "Generic React Router preview unexpectedly includes Docker-only image proxy dependencies."
      );
    }
    reportPhase("started packed preview", previewStartedAt);
    const commandsStartedAt = Date.now();
    const assertLocalDryRun = async (
      label: string,
      command: string,
      input: Record<string, unknown>
    ) => {
      const payload = await invoke(label, [
        command,
        JSON.stringify(input),
        "--dry-run",
      ]);
      const meta = getRecord(payload.meta, `${label} meta`);
      const session = getRecord(meta.session, `${label} session`);
      if (
        payload.ok !== true ||
        session.source !== "dry-run" ||
        session.committed !== false ||
        typeof session.transaction !== "object"
      ) {
        throw new Error(
          `${label} did not produce a local dry-run transaction: ${JSON.stringify(payload)}`
        );
      }
    };
    await invoke("packed list pages", ["list-pages"]);
    await assertLocalDryRun("plain page metadata update", "update-page", {
      pageId: "home",
      values: {
        title: "My title: seven pages & more",
        meta: { description: "Ordinary prose, punctuation included." },
      },
    });
    await assertLocalDryRun("cold page duplicate", "duplicate-page", {
      pageId: "home",
      name: "Home copy",
      path: "/home-copy",
    });
    await assertLocalDryRun("local fragment insertion", "insert-fragment", {
      parentInstanceId: "home-root",
      fragment: '<ws.element ws:tag="p">Release smoke</ws.element>',
    });
    await assertLocalDryRun("local component insertion", "insert-component", {
      parentInstanceId: "home-root",
      component: "ws:element",
      tag: "p",
    });

    await stopProcessTree(preview);
    preview = undefined;
    await rm(join(projectDirectory, ".webstudio", "project-session.json"), {
      force: true,
    });
    const stdioStartedAt = Date.now();
    for (const { name: clientName } of agentSmokeClients) {
      await runAgentWorkflowStep({
        step: `${clientName} connection smoke`,
        recovery: `Reload ${clientName}, then verify its Webstudio MCP command starts in the linked project folder.`,
        run: async () => {
          const transport = new StdioClientTransport({
            command: bin,
            args: ["mcp"],
            cwd: projectDirectory,
            env: Object.fromEntries(
              Object.entries(env).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string"
              )
            ),
            stderr: "pipe",
          });
          transport.stderr?.on("data", () => {});
          const client = new Client({ name: clientName, version: "1.0.0" });
          await client.connect(transport);
          try {
            const tools = await client.listTools();
            if (
              tools.tools.some(({ name }) => name === "meta.index") === false
            ) {
              throw new Error("Webstudio connected but meta.index is missing.");
            }
          } finally {
            await client.close();
          }
        },
      });
    }
    const stdioTransport = new StdioClientTransport({
      command: bin,
      args: ["mcp"],
      cwd: projectDirectory,
      env: Object.fromEntries(
        Object.entries(env).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        )
      ),
      stderr: "pipe",
    });
    let stdioLogs = "";
    stdioTransport.stderr?.on("data", (chunk) => {
      stdioLogs += String(chunk);
    });
    const stdioClient = new Client({
      name: "webstudio-release-smoke",
      version: "1.0.0",
    });
    const callTool = async (
      name: string,
      args: Record<string, unknown> = {}
    ) => {
      const result = await stdioClient.callTool({ name, arguments: args });
      const structured = getRecord(
        result.structuredContent,
        `${name} structured content`
      );
      if (result.isError === true || structured.ok !== true) {
        throw new Error(
          `${name} failed over packed stdio MCP: ${JSON.stringify(structured)}`
        );
      }
      return getRecord(structured.data, `${name} data`);
    };
    await stdioClient.connect(stdioTransport);
    try {
      const inspection = await callTool("inspect");
      if (inspection.id !== projectId) {
        throw new Error(
          `Inspect returned the wrong project: ${JSON.stringify(inspection)}`
        );
      }
      const initialPages = await callTool("list-pages", {
        includeFolders: true,
      });
      if (
        Array.isArray(initialPages.pages) === false ||
        initialPages.pages.length !== 2
      ) {
        throw new Error(
          `Cold stdio discovery returned unexpected pages: ${JSON.stringify(initialPages)}`
        );
      }
      await callTool("refresh", {
        namespaces: ["pages", "instances", "props", "assets"],
      });
      const assets = await callTool("list-assets");
      if (Array.isArray(assets.items) === false || assets.items.length !== 1) {
        throw new Error(
          `Cold stdio asset discovery failed: ${JSON.stringify(assets)}`
        );
      }

      const createdPages: Array<{
        pageId: string;
        name: string;
        path: string;
      }> = [];
      const duplicate = await callTool("duplicate-page", {
        pageId: "home",
        name: "About",
        path: "/about",
      });
      createdPages.push({
        pageId: String(duplicate.pageId),
        name: "About",
        path: "/about",
      });
      for (const page of [
        { name: "Services", path: "/services" },
        { name: "Work", path: "/work" },
        { name: "Blog", path: "/blog" },
        { name: "Contact", path: "/contact" },
      ]) {
        const created = await callTool("create-page", page);
        createdPages.push({ pageId: String(created.pageId), ...page });
      }

      for (const page of createdPages) {
        await callTool("update-page", {
          pageId: page.pageId,
          values: {
            title: `${page.name}: release smoke & verification`,
            meta: { description: `A plain-text description for ${page.name}.` },
          },
        });
        const details = await callTool("get-page", { pageId: page.pageId });
        const inserted = await callTool("insert-component", {
          parentInstanceId: String(details.rootInstanceId),
          component: "ws:element",
          tag: "section",
        });
        const sectionId = String(
          (inserted.rootInstanceIds as unknown[] | undefined)?.[0]
        );
        await callTool("update-props", {
          updates: [
            {
              instanceId: sectionId,
              name: "data-imported-page",
              type: "string",
              value: page.name,
            },
          ],
        });
      }

      await callTool("update-text", {
        instanceId: "pricing-root",
        childIndex: 0,
        text: "Pricing imported content",
        mode: "text",
      });

      for (let index = 0; index < 10; index += 1) {
        await callTool("list-pages");
        await callTool("update-page", {
          pageId: "pricing",
          values: { title: `Pricing session check ${index}` },
        });
      }

      const usage = await callTool("find-asset-usage", {
        assetId: "asset-hero",
      });
      if (Array.isArray(usage.usages) === false || usage.usages.length < 2) {
        throw new Error(
          `Duplicated page lost its image asset reference: ${JSON.stringify(usage)}`
        );
      }

      await callTool("preview.start", {
        host: "127.0.0.1",
        port: 5191,
        source: "session",
      });
      const workflowScreenshot = await callTool("screenshot", {
        path: "/work",
        output: ".webstudio/workflow-work.png",
        viewport: { width: 1280, height: 800 },
        waitUntil: "load",
      });
      await assertScreenshotEvidence({
        payload: { data: workflowScreenshot },
        label: "seven-page stdio workflow screenshot",
        path: "/work",
        status: 200,
        viewport: { width: 1280, height: 800 },
        projectDirectory,
        origin: "http://127.0.0.1:5191",
      });
      await callTool("preview.stop");

      const workflowDuration = Date.now() - workflowStartedAt;
      if (workflowDuration >= 10 * 60_000) {
        throw new Error(
          `Agent connection workflow exceeded ten minutes (${workflowDuration}ms). Recovery: Inspect the reported release-smoke phase timings and optimize the slowest blocked step.`
        );
      }
      reportPhase(
        "completed ten-minute agent connection workflow",
        workflowStartedAt
      );

      const finalPages = await callTool("list-pages");
      const finalPageNames = Array.isArray(finalPages.pages)
        ? finalPages.pages.map((page) => getRecord(page, "final page").name)
        : [];
      if (
        finalPageNames.length !== 7 ||
        createdPages.some(
          (page) => finalPageNames.includes(page.name) === false
        )
      ) {
        throw new Error(
          `Seven-page workflow verification failed: ${JSON.stringify(finalPages)}`
        );
      }
    } finally {
      await stdioClient.close();
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
    if (
      stdioLogs.includes("API contract negotiated") === false ||
      stdioLogs.includes('"event":"stdio_connection_closed"') === false ||
      stdioLogs.includes('"event":"stdio_transport_error"')
    ) {
      throw new Error(`Unexpected packed stdio lifecycle logs:\n${stdioLogs}`);
    }
    reportPhase(
      "completed packed seven-page stdio MCP workflow",
      stdioStartedAt
    );

    preview = spawn(bin, ["preview", "--port", "5190"], {
      cwd: projectDirectory,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForUrl("http://127.0.0.1:5190/", preview);

    const pricingScreenshot = await invoke("standalone screenshot", [
      "screenshot",
      "http://127.0.0.1:5190/pricing",
      "--output",
      ".webstudio/pricing.png",
      "--width",
      "1440",
      "--height",
      "900",
      "--json",
    ]);
    await assertScreenshotEvidence({
      payload: pricingScreenshot,
      label: "standalone pricing screenshot",
      path: "/pricing",
      status: 200,
      viewport: { width: 1440, height: 900 },
      projectDirectory,
    });
    const homeScreenshot = await invoke("MCP screenshot", [
      "mcp",
      "single-op-call",
      "screenshot",
      JSON.stringify({
        baseUrl: "http://127.0.0.1:5190",
        path: "/",
        viewport: { width: 375, height: 812 },
      }),
    ]);
    await assertScreenshotEvidence({
      payload: homeScreenshot,
      label: "MCP home screenshot",
      path: "/",
      status: 200,
      viewport: { width: 375, height: 812 },
      projectDirectory,
    });
    await invoke("MCP run", [
      "mcp",
      "run",
      JSON.stringify([
        {
          tool: "screenshot",
          input: {
            baseUrl: "http://127.0.0.1:5190",
            path: "/pricing",
            viewport: { width: 1440, height: 900 },
          },
        },
      ]),
    ]);
    const missingScreenshot = await invoke("missing route screenshot", [
      "screenshot",
      "http://127.0.0.1:5190/missing",
      "--output",
      ".webstudio/missing.png",
      "--width",
      "375",
      "--height",
      "812",
      "--json",
    ]);
    await assertScreenshotEvidence({
      payload: missingScreenshot,
      label: "missing route screenshot",
      path: "/missing",
      status: 404,
      viewport: { width: 375, height: 812 },
      projectDirectory,
      generatedSite: false,
    });
    const renderedAudit = await invoke("rendered audit", [
      "audit",
      "--rendered",
      "--page-path",
      "/",
      "--json",
    ]);
    const renderedAuditData = getRecord(
      renderedAudit.data,
      "rendered audit data"
    );
    const renderedAuditSummary = getRecord(
      renderedAuditData.renderedCaptureSummary,
      "rendered audit capture summary"
    );
    if (
      renderedAudit.ok !== true ||
      renderedAuditData.renderedCheckCount !== 1 ||
      renderedAuditSummary.planned !== 1 ||
      renderedAuditSummary.failed !== 0 ||
      renderedAuditSummary.skipped !== 0
    ) {
      throw new Error(
        `Rendered audit was incomplete: ${JSON.stringify(renderedAuditData)}`
      );
    }
    if (process.env.WEBSTUDIO_RELEASE_SMOKE_LARGE_AUDIT === "1") {
      const planPayload = await invoke("large rendered audit plan", [
        "audit",
        "--rendered",
        "--scopes",
        "performance",
        "--json",
      ]);
      const planData = getRecord(planPayload.data, "large audit plan data");
      const plan = getRecord(planData.renderedPlan, "large rendered plan");
      if (
        plan.captureCount !== 122 ||
        typeof plan.confirmationToken !== "string"
      ) {
        throw new Error(
          `Large rendered audit did not return the expected 122-capture confirmation plan: ${JSON.stringify(plan)}`
        );
      }
      const confirmedAuditStartedAt = Date.now();
      const confirmedPayload = await invoke("confirmed large rendered audit", [
        "audit",
        "--rendered",
        "--scopes",
        "performance",
        "--confirm-large-run",
        "--confirmation-token",
        plan.confirmationToken,
        "--json",
      ]);
      const confirmedData = getRecord(
        confirmedPayload.data,
        "confirmed large audit data"
      );
      const summary = getRecord(
        confirmedData.renderedCaptureSummary,
        "confirmed large audit capture summary"
      );
      const manifestSummary = getRecord(
        confirmedData.renderedArtifactManifest,
        "confirmed large audit artifact manifest"
      );
      const manifestPath = String(manifestSummary.path);
      const manifest = JSON.parse(
        await readFile(
          manifestPath.startsWith("/")
            ? manifestPath
            : join(projectDirectory, manifestPath),
          "utf8"
        )
      ) as { failures?: unknown[]; performance?: unknown };
      if (
        confirmedPayload.ok !== true ||
        confirmedData.renderedCheckCount !== 122 ||
        summary.planned !== 122 ||
        summary.failed !== 0 ||
        summary.skipped !== 0
      ) {
        throw new Error(
          `Confirmed large rendered audit was incomplete: ${JSON.stringify({ summary, failures: manifest.failures })}`
        );
      }
      reportPhase(
        `validated confirmed 122-capture packaged audit ${JSON.stringify({ performance: manifest.performance })}`,
        confirmedAuditStartedAt
      );
      const confirmedAuditDuration = Date.now() - confirmedAuditStartedAt;
      if (confirmedAuditDuration > 90_000) {
        throw new Error(
          `Confirmed 122-capture packaged audit took ${confirmedAuditDuration}ms; expected at most 90000ms.`
        );
      }
      const cachedAuditStartedAt = Date.now();
      await invoke("cached rendered audit", [
        "audit",
        "--rendered",
        "--page-path",
        "/",
        "--scopes",
        "performance",
        "--json",
      ]);
      reportPhase("validated cached rendered audit", cachedAuditStartedAt);
      const cachedAuditDuration = Date.now() - cachedAuditStartedAt;
      if (cachedAuditDuration > 20_000) {
        throw new Error(
          `Cached rendered audit took ${cachedAuditDuration}ms; expected at most 20000ms.`
        );
      }
    }
    reportPhase("validated structured commands", commandsStartedAt);
  } finally {
    await stopProcessTree(preview);
    await closeServer(apiServer);
    await rm(temp, { recursive: true, force: true });
    reportPhase("cleaned temporary release smoke files");
  }
};

await run();
