declare module "__CLIENT__" {
  import type { FontAsset, ImageAsset, System } from "@webstudio-is/sdk";

  export const siteName: string;

  export const favIconAsset: ImageAsset | undefined;

  export const socialImageAsset: ImageAsset | undefined;

  // Font assets on current page (can be preloaded)
  export const pageFontAssets: FontAsset[];

  export const pageBackgroundImageAssets: ImageAsset[];

  export const CustomCode: () => ReactNode;

  export const Page: (props: { system: System }) => ReactNode;
}

declare module "__SERVER__" {
  import type { PageMeta, System } from "@webstudio-is/sdk";

  export const loadResources: (props: {
    system: System;
  }) => Promise<Record<string, unknown>>;

  export const getPageMeta: (props: {
    system: System;
    resources: Record<string, any>;
  }) => PageMeta;

  export const formsProperties: Map<
    string,
    { method?: string; action?: string }
  >;

  type Params = Record<string, string | undefined>;
  export const getRemixParams: ({ ...params }: Params) => Params;

  export const projectId: string;

  export const contactEmail: undefined | string;
}

declare module "__SITEMAP__" {
  export const sitemap: Array<{
    path: string;
    lastModified: string;
  }>;
}
