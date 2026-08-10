import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { ComponentBuildHook, WsComponentMeta } from "@webstudio-is/sdk";

export const routeTemplatesDirectory = join("app", "route-templates");
export type FrameworkOptions = {
  preserveTemplates?: boolean;
  templatesDirectory?: string;
};

export const getFrameworkTemplatesDirectory = (
  options: FrameworkOptions = {}
) => options.templatesDirectory ?? routeTemplatesDirectory;

export const cleanupFrameworkTemplates = async ({
  preserveTemplates = false,
  templatesDirectory = routeTemplatesDirectory,
}: FrameworkOptions = {}) => {
  if (preserveTemplates === false) {
    await rm(templatesDirectory, { recursive: true, force: true });
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
  componentBuildHooks: ComponentBuildHook[];
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
