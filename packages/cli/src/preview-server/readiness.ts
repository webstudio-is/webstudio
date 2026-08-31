import { join } from "node:path";
import { parse as parseHtml, type DefaultTreeAdapterMap } from "parse5";
import { defaultPreviewServerDependencies } from "./dependencies";

export const getPreviewProjectIdentity = async (
  cwd: string | undefined,
  dependencies = defaultPreviewServerDependencies
) => {
  if (cwd === undefined) {
    return undefined;
  }
  try {
    const data = JSON.parse(
      await dependencies.readFile(join(cwd, ".webstudio", "data.json"), "utf8")
    ) as { build?: { projectId?: unknown; version?: unknown } };
    if (typeof data.build?.projectId !== "string") {
      throw new Error("projectId is missing");
    }
    return {
      projectId: data.build.projectId,
      ...(typeof data.build.version === "number"
        ? { version: data.build.version }
        : {}),
    };
  } catch (error) {
    throw new Error(
      `Could not identify the generated preview project in ${join(cwd, ".webstudio", "data.json")}.`,
      { cause: error }
    );
  }
};

const getGeneratedSiteIdentity = (html: string) => {
  const document = parseHtml(html);
  const visit = (
    node: DefaultTreeAdapterMap["node"]
  ): { projectId: string; version?: number } | undefined => {
    if ("attrs" in node && Array.isArray(node.attrs)) {
      const attributes = new Map(
        node.attrs.map(({ name, value }) => [name, value])
      );
      const projectId = attributes.get("data-ws-project");
      const versionValue = attributes.get("data-ws-version");
      if (projectId !== undefined) {
        const version = Number(versionValue);
        return {
          projectId,
          ...(Number.isFinite(version) ? { version } : {}),
        };
      }
    }
    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        const identity = visit(child);
        if (identity !== undefined) {
          return identity;
        }
      }
    }
  };
  return visit(document);
};

export const waitForPreviewReady = async (
  url: string,
  {
    timeoutMs = 30_000,
    intervalMs = 250,
    isRunning,
    requiredAssetNames = [],
    requiredProject,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
    isRunning?: () => boolean;
    requiredAssetNames?: string[];
    requiredProject?: { projectId: string; version?: number };
  } = {},
  dependencies = defaultPreviewServerDependencies
) => {
  const deadline = Date.now() + timeoutMs;
  let sawStaleServer = false;
  let sawUnexpectedProject = false;
  while (Date.now() <= deadline) {
    if (isRunning?.() === false) {
      throw new Error(
        `Preview server exited before it became ready at ${url}.`
      );
    }
    try {
      const attemptTimeoutMs = Math.max(
        1,
        Math.min(5000, deadline - Date.now())
      );
      const response = await dependencies.fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(attemptTimeoutMs),
      });
      if (response.status === 401 && requiredProject !== undefined) {
        const identityResponse = await dependencies.fetch(
          new URL("/__webstudio/preview.json", url),
          {
            method: "GET",
            signal: AbortSignal.timeout(attemptTimeoutMs),
          }
        );
        if (identityResponse.ok) {
          const identity = (await identityResponse.json()) as {
            projectId?: unknown;
            version?: unknown;
          };
          if (
            identity.projectId === requiredProject.projectId &&
            (requiredProject.version === undefined ||
              identity.version === requiredProject.version)
          ) {
            return;
          }
          sawUnexpectedProject = true;
        }
      }
      if (response.status < 500) {
        if (requiredAssetNames.length === 0 && requiredProject === undefined) {
          return;
        }
        const html = await response.text();
        const identity = getGeneratedSiteIdentity(html);
        const servesExpectedProject =
          requiredProject === undefined ||
          (identity?.projectId === requiredProject.projectId &&
            (requiredProject.version === undefined ||
              identity.version === requiredProject.version));
        const servesLatestAssets =
          requiredAssetNames.length === 0 ||
          requiredAssetNames.some((name) => html.includes(name));
        if (servesExpectedProject && servesLatestAssets) {
          return;
        }
        sawUnexpectedProject ||= servesExpectedProject === false;
        sawStaleServer ||= servesLatestAssets === false;
      }
    } catch {
      // Server is still starting.
    }
    await dependencies.sleep(intervalMs);
  }
  if (sawUnexpectedProject) {
    throw new Error(
      `Preview server at ${url} did not serve the expected generated project. Stop the existing preview server on this port, then retry.`
    );
  }
  if (sawStaleServer) {
    throw new Error(
      `Preview server at ${url} did not serve the latest build assets. Stop the existing preview server on this port, then retry.`
    );
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
};

export const getPreviewCssAssetNames = async (
  cwd: string | undefined,
  dependencies = defaultPreviewServerDependencies
) => {
  if (cwd === undefined) {
    return [];
  }
  try {
    return (await dependencies.readdir(join(cwd, "build", "client", "assets")))
      .filter((name) => name.endsWith(".css"))
      .sort();
  } catch {
    return [];
  }
};
