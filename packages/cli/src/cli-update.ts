import semver from "semver";
import { isPlainRecord } from "./type-utils";

const latestPackageUrl = "https://registry.npmjs.org/webstudio/latest";
const requestTimeoutMs = 1_500;

export type CliUpdate = {
  currentVersion: string;
  latestVersion: string;
};

export const checkForCliUpdate = async ({
  currentVersion,
  request = fetch,
}: {
  currentVersion: string;
  request?: typeof fetch;
}): Promise<CliUpdate | undefined> => {
  if (
    currentVersion === "0.0.0-webstudio-version" ||
    semver.valid(currentVersion) === null
  ) {
    return;
  }

  try {
    const response = await request(latestPackageUrl, {
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (response.ok === false) {
      return;
    }

    const latestPackage: unknown = await response.json();
    if (isPlainRecord(latestPackage) === false) {
      return;
    }
    const latestVersion =
      typeof latestPackage.version === "string"
        ? semver.valid(latestPackage.version)
        : null;
    if (
      latestVersion === null ||
      semver.gt(latestVersion, currentVersion) === false
    ) {
      return;
    }

    return { currentVersion, latestVersion };
  } catch {
    return;
  }
};
