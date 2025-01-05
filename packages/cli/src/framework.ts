import type { WsComponentMeta } from "@webstudio-is/sdk";

type FrameworkComponentEntry = {
  source: string;
  metas: Record<string, WsComponentMeta>;
};

type FrameworkTemplateEntry = {
  file: string;
  template: string;
};

export type Framework = {
  components: FrameworkComponentEntry[];
  html: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  xml: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  redirect: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  defaultSitemap: () => FrameworkTemplateEntry[];
};
