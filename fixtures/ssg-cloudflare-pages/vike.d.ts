import type { ImageLoader } from "@webstudio-is/image";
import type { PageMeta, System } from "@webstudio-is/sdk";

declare global {
  namespace Vike {
    interface Config {
      lang?: (props: { data: PageData }) => string;
      Head?: (props: { data: PageData }) => React.ReactNode;
    }

    interface PageContext {
      constants: {
        assetBaseUrl: string;
        imageLoader: ImageLoader;
      };
      data: {
        url: string;
        system: System;
        resources: Record<string, unknown>;
        pageMeta: PageMeta;
      };
      Page?: (props: { data: PageData }) => React.ReactNode;
    }
  }
}
