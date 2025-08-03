declare module "__CONSTANTS__" {
  import type { ImageLoader, VideoLoader } from "@webstudio-is/image";
  export const assetBaseUrl: string;
  export const imageLoader: ImageLoader;
  export const videoLoader: undefined | VideoLoader;
}

declare module "__CLIENT__" {
  import type { ResourceRequest, System } from "@webstudio-is/sdk";

  export const projectId: string;

  export const lastPublished: string;

  export const siteName: string;

  export const favIconAsset: string | undefined;

  export const breakpoints: {
    id: string;
    minWidth?: number;
    maxWidth?: number;
  }[];

  // Font assets on current page (can be preloaded)
  export const pageFontAssets: string[];

  export const pageBackgroundImageAssets: string[];

  export const CustomCode: () => ReactNode;

  export const Page: (props: { system: System }) => ReactNode;
}

declare module "__SERVER__" {
  import type { PageMeta, System, ResourceRequest } from "@webstudio-is/sdk";

  export const getResources: (props: { system: System }) => {
    data: Map<string, ResourceRequest>;
    action: Map<string, ResourceRequest>;
  };

  export const getPageMeta: (props: {
    system: System;
    resources: Record<string, any>;
  }) => PageMeta;

  type Params = Record<string, string | undefined>;
  export const getRemixParams: ({ ...params }: Params) => Params;

  export const contactEmail: undefined | string;
}

declare module "__SITEMAP__" {
  export const sitemap: Array<{
    path: string;
    lastModified: string;
  }>;
}

declare module "__REDIRECT__" {
  export const url: string;
  export const status: number;
}
