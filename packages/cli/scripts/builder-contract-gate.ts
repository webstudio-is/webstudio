import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { getBundleVersion } from "@webstudio-is/protocol";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import { resolveRegistryTarget } from "./release-smoke-registry";
import { startRuntimeFixtureApi } from "./runtime-fixture-api";

const execFileAsync = promisify(execFile);

export const assertPublishedCliContract = ({
  cliVersion,
  expectedVersion,
  receivedVersion,
}: {
  cliVersion: string;
  expectedVersion: string | number;
  receivedVersion: string | number | undefined;
}) => {
  if (receivedVersion === expectedVersion) {
    return;
  }
  throw new Error(
    `Published CLI contract mismatch for webstudio@${cliVersion}. Expected bundle version ${expectedVersion}, received ${receivedVersion ?? "missing"}. Publish a matching CLI before deploying Builder.`
  );
};

const readNpmJson = async (args: string[]) =>
  JSON.parse((await execFileAsync("npm", args)).stdout) as unknown;

const contractEndpointPath = "/rest/cli-compatibility";
const defaultDelay = () =>
  new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 3_000));

export const loadBuilderBundleVersion = async (
  origin: string,
  {
    attempts = 10,
    delay = defaultDelay,
    request = fetch,
  }: {
    attempts?: number;
    delay?: () => Promise<void>;
    request?: typeof fetch;
  } = {}
) => {
  const endpoint = new URL(contractEndpointPath, origin);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await request(endpoint, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok === false) {
        throw new Error(
          `Builder CLI compatibility endpoint returned HTTP ${response.status}.`
        );
      }
      const data = (await response.json()) as unknown;
      const receivedVersion = getBundleVersion(data);
      if (receivedVersion === undefined) {
        throw new Error(
          "Builder CLI compatibility response has no bundle version."
        );
      }
      return receivedVersion;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay();
      }
    }
  }
  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Could not read the CLI contract from ${endpoint.href} after ${attempts} ${attempts === 1 ? "attempt" : "attempts"}: ${message}`,
    { cause: lastError }
  );
};

const checkPublishedCliContract = async ({
  builderOrigin,
}: {
  builderOrigin: string;
}) => {
  const expectedVersion = await loadBuilderBundleVersion(builderOrigin);
  const target = await resolveRegistryTarget("webstudio@latest", {
    attempts: 3,
    readNpmJson,
  });
  const directory = await mkdtemp(join(tmpdir(), "webstudio-contract-gate-"));
  let receivedVersion: string | number | undefined;
  let fixtureOrigin = "";
  try {
    const fixtureApi = await startRuntimeFixtureApi(
      async ({ operationPath, readInput }) => {
        if (operationPath !== "build.loadProjectBundleByBuildId") {
          throw new Error(`Unexpected CLI probe operation ${operationPath}.`);
        }
        receivedVersion = getBundleVersion(await readInput());
        return createPublishedProjectBundleFixture({ origin: fixtureOrigin });
      }
    );
    fixtureOrigin = fixtureApi.origin;
    try {
      await mkdir(join(directory, ".webstudio"), { recursive: true });
      let probeError: unknown;
      try {
        await execFileAsync(
          "npm",
          [
            "exec",
            "--yes",
            "--package",
            target.installSpec,
            "--",
            "webstudio",
            "sync",
            "--buildId",
            "contract-probe",
            "--origin",
            fixtureApi.origin,
            "--authToken",
            "contract-probe",
          ],
          {
            cwd: directory,
            maxBuffer: 20 * 1024 * 1024,
            timeout: 5 * 60_000,
          }
        );
      } catch (error) {
        probeError = error;
      }

      assertPublishedCliContract({
        cliVersion: target.version,
        expectedVersion,
        receivedVersion,
      });
      if (probeError !== undefined) {
        const stderr =
          typeof probeError === "object" &&
          probeError !== null &&
          "stderr" in probeError &&
          typeof probeError.stderr === "string"
            ? probeError.stderr.trim()
            : "";
        throw new Error(
          `Published CLI webstudio@${target.version} sent the expected bundle version ${expectedVersion} but could not complete the read-only sync probe: ${stderr || (probeError instanceof Error ? probeError.message : String(probeError))}`,
          { cause: probeError }
        );
      }
      console.info(
        `Published CLI webstudio@${target.version} matches Builder bundle version ${expectedVersion}.`
      );
    } finally {
      await fixtureApi.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined &&
  import.meta.url === pathToFileURL(resolve(entrypoint)).href
) {
  const builderOrigin = process.env.WEBSTUDIO_CLI_CONTRACT_BUILDER_ORIGIN;
  if (builderOrigin === undefined || builderOrigin === "") {
    throw new Error(
      "WEBSTUDIO_CLI_CONTRACT_BUILDER_ORIGIN must identify the staged Builder deployment."
    );
  }
  await checkPublishedCliContract({
    builderOrigin,
  });
}
