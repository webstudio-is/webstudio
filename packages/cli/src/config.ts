import { join } from "node:path";
import envPaths from "env-paths";
import { z } from "zod";
import { expectType, type TypeEqual } from "ts-expect";
import { Templates } from "@webstudio-is/sdk";

const GLOBAL_CONFIG_FOLDER = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
export const GLOBAL_CONFIG_FILE = join(
  GLOBAL_CONFIG_FOLDER,
  GLOBAL_CONFIG_FILE_NAME
);

export const LOCAL_CONFIG_FILE = ".webstudio/config.json";
export const LOCAL_DATA_FILE = ".webstudio/data.json";

const zLocalConfig = z.object({
  projectId: z.string(),
});

export type LocalConfig = z.infer<typeof zLocalConfig>;

export const jsonToLocalConfig = (json: unknown) => {
  return zLocalConfig.parse(json);
};

const zGlobalConfig = z.record(
  z
    .union([
      z.object({
        // origin mistakenly called host in the past
        host: z.string(),
        token: z.string(),
      }),
      z.object({
        origin: z.string(),
        token: z.string(),
      }),
    ])
    .transform((value) => {
      if ("host" in value) {
        return {
          origin: value.host,
          token: value.token,
        };
      }
      return value;
    })
);

export const jsonToGlobalConfig = (json: unknown) => {
  return zGlobalConfig.parse(json);
};

export type GlobalConfig = z.infer<typeof zGlobalConfig>;

export const PROJECT_TEMPALTES = [
  { value: "vanilla" as const, label: "Vanilla" },
  { value: "vercel" as const, label: "Vercel" },
  { value: "netlify-functions" as const, label: "Netlify Functions" },
  { value: "netlify-edge-functions" as const, label: "Netlify Edge Functions" },
  { value: "ssg" as const, label: "Static Site Generation (SSG)" },
];

// We must ensure the validated template type always matches the CLI-supported templates.
// This is crucial for security, as template names can be used in CLI/bash environments.
// A TypeScript failure here means the Templates type is not consistent with the CLI templates.
expectType<TypeEqual<(typeof PROJECT_TEMPALTES)[number]["value"], Templates>>(
  true
);
