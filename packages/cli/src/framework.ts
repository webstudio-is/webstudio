import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { WsComponentMeta } from "@webstudio-is/sdk";

export type FrameworkOptions = { preserveTemplates?: boolean };
export const routeTemplatesDirectory = join("app", "route-templates");

export const cleanupFrameworkTemplates = async ({
  preserveTemplates = false,
}: FrameworkOptions = {}) => {
  if (preserveTemplates === false) {
    await rm(routeTemplatesDirectory, { recursive: true, force: true });
  }
};

type FrameworkTemplateEntry = {
  file: string;
  template: string;
};

export type Framework = {
  // instance.component: WsComponentMeta
  metas: Record<string, WsComponentMeta>;
  // instance.component: "importSource:importSpecifier"
  components: Record<string, string>;
  // instance.tag: "importSource:importSpecifier"
  tags: Record<string, string>;
  html: (params: {
    pagePath: string;
    prerenderPaths?: readonly string[];
  }) => FrameworkTemplateEntry[];
  xml: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  text: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  defaultSitemap: () => FrameworkTemplateEntry[];
};
