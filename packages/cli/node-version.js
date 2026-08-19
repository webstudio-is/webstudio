import semver from "semver";

/**
 * @param {{ currentVersion: string; supportedVersionRange: string }} options
 */
export const isNodeVersionSupported = ({
  currentVersion,
  supportedVersionRange,
}) => semver.satisfies(currentVersion, supportedVersionRange);

/**
 * @param {{
 *   currentVersion: string;
 *   supportedVersionRange: string;
 *   run: () => void | Promise<void>;
 *   reportError: (message: string) => void;
 * }} options
 */
export const runWithSupportedNode = async ({
  currentVersion,
  supportedVersionRange,
  run,
  reportError,
}) => {
  if (
    isNodeVersionSupported({ currentVersion, supportedVersionRange }) === false
  ) {
    const minimumVersion = semver.minVersion(supportedVersionRange)?.version;
    reportError(
      `Webstudio CLI requires Node.js ${minimumVersion ?? supportedVersionRange} or newer. You are using Node.js ${currentVersion}. Upgrade Node.js and try again.`
    );
    return false;
  }

  await run();
  return true;
};
