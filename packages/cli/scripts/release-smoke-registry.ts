export type ReleaseTarget = {
  source: "local" | "registry";
  version: string;
  installSpec: string;
  integrity?: string;
};

type ResolveRegistryTargetOptions = {
  readNpmJson: (args: string[]) => Promise<unknown>;
  attempts?: number;
  delay?: () => Promise<void>;
};

const defaultDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 10_000));

export const resolveRegistryTarget = async (
  spec: string,
  {
    readNpmJson,
    attempts = 30,
    delay = defaultDelay,
  }: ResolveRegistryTargetOptions
): Promise<ReleaseTarget> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const version = await readNpmJson(["view", spec, "version", "--json"]);
      const integrity = await readNpmJson([
        "view",
        spec,
        "dist.integrity",
        "--json",
      ]);
      if (typeof version !== "string" || version.length === 0) {
        throw new Error(`Could not resolve registry package ${spec}.`);
      }
      if (typeof integrity !== "string" || integrity.length === 0) {
        throw new Error(
          `Registry package webstudio@${version} has no integrity.`
        );
      }
      return {
        source: "registry",
        version,
        installSpec: `webstudio@${version}`,
        integrity,
      };
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
    `Could not resolve registry package ${spec} after ${attempts} attempts: ${message}`,
    { cause: lastError }
  );
};
