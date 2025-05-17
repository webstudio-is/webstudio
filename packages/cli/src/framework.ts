import type { WsComponentMeta } from "@webstudio-is/sdk";

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
  html: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  xml: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  redirect: (params: { pagePath: string }) => FrameworkTemplateEntry[];
  defaultSitemap: () => FrameworkTemplateEntry[];
};
