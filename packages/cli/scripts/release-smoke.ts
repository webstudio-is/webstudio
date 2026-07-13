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
import { bundleVersion } from "@webstudio-is/protocol";
import type { Instance } from "@webstudio-is/sdk";

const execFileAsync = promisify(execFile);
const projectId = "release-smoke-project";
const buildId = "release-smoke-build";
const projectVersion = 1;
const sessionVersion = "cli-project-session-v1";
const releaseVersionPlaceholder = "0.0.0-webstudio-version";

const reportPhase = (phase: string, startedAt = Date.now()) => {
  process.stderr.write(
    `[release-smoke] ${phase} (${Date.now() - startedAt}ms)\n`
  );
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
      children: [{ type: "text", value: `Release smoke ${page.name}` }],
    },
  ]);
  const build = {
    id: buildId,
    projectId,
    version: projectVersion,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    pages: persistedPages,
    props: [],
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
      assets: [],
      build,
    },
    build,
    persistedPages,
    instances,
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

const startFixtureApi = async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify([
        {
          result: {
            data: {
              canView: true,
              canEdit: true,
              canBuild: true,
              canAdmin: true,
              canUseApi: true,
            },
          },
        },
      ])
    );
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
}: {
  payload: Record<string, unknown>;
  label: string;
  path: string;
  status: number;
  viewport: { width: number; height: number };
  projectDirectory: string;
  generatedSite?: boolean;
}) => {
  const data = getRecord(payload.data, `${label} data`);
  const navigation = getRecord(data.navigation, `${label} navigation`);
  const finalUrl = new URL(String(navigation.finalUrl));
  if (
    finalUrl.origin !== "http://127.0.0.1:5190" ||
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
    React: {
      Fragment: Symbol.for("react.fragment"),
      createElement: () => ({}),
    },
  });
  const [pagesModule, adapters, namespaces, projectSession] = await Promise.all(
    [
      import("@webstudio-is/project-migrations/pages"),
      import("@webstudio-is/project-build/state/adapters"),
      import("@webstudio-is/project-build/contracts/namespaces"),
      import("@webstudio-is/project-build/project-session"),
    ]
  );
  const temp = await mkdtemp(join(tmpdir(), "webstudio-release-smoke-"));
  let preview: ChildProcess | undefined;
  let apiServer: Server | undefined;
  try {
    const startedAt = Date.now();
    const fixtureApi = await startFixtureApi();
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

    const fixture = createFixture();
    await writeFile(
      join(projectDirectory, ".webstudio", "data.json"),
      JSON.stringify(fixture.data),
      "utf8"
    );
    await writeFile(
      join(projectDirectory, ".webstudio", "config.json"),
      JSON.stringify({ projectId }),
      "utf8"
    );
    const state = adapters.createBuilderStateFromBuildData({
      ...fixture.build,
      pages: pagesModule.migratePages(fixture.persistedPages),
      assets: [],
      instances: fixture.instances.map(([, instance]) => instance),
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
    const globalConfigPath = join(configDirectory, "webstudio-config.json");
    await mkdir(dirname(globalConfigPath), { recursive: true });
    await writeFile(
      globalConfigPath,
      JSON.stringify({
        [projectId]: { origin: fixtureApi.origin, token: "fixture" },
      }),
      "utf8"
    );

    const bin = join(projectDirectory, "node_modules", ".bin", "webstudio");
    const env = {
      ...process.env,
      WEBSTUDIO_CONFIG_DIR: configDirectory,
    };
    const invoke = async (label: string, args: string[]) => {
      const result = await execFileAsync(bin, args, {
        cwd: projectDirectory,
        env,
        maxBuffer: 20 * 1024 * 1024,
      });
      await assertJsonStdout(result.stdout, label);
      return JSON.parse(result.stdout) as Record<string, unknown>;
    };

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
