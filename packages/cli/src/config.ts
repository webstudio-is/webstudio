import { join } from "node:path";
import envPaths from "env-paths";
import { z } from "zod";

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

export const PROJECT_TEMPLATES = [
  {
    value: "docker" as const,
    label: "Docker",
    expand: ["react-router", "react-router-docker"],
  },
  {
    value: "vercel" as const,
    label: "Vercel",
    expand: ["react-router", "react-router-vercel"],
  },
  {
    value: "netlify" as const,
    label: "Netlify",
    expand: ["react-router", "react-router-netlify"],
  },
  {
    value: "ssg" as const,
    label: "Static Site Generation (SSG)",
  },
  {
    value: "ssg-netlify" as const,
    label: "Static Site Generation (SSG) Netlify",
    expand: ["ssg", "ssg-netlify"],
  },
  {
    value: "ssg-vercel" as const,
    label: "Static Site Generation (SSG) Vercel",
    expand: ["ssg", "ssg-vercel"],
  },
];

// This feature will be made public eventually; currently, it’s only used for internal tasks.
export const INTERNAL_TEMPLATES = [
  {
    value: "cloudflare",
    label: "Cloudflare",
    expand: ["defaults", "cloudflare"],
  },
];
