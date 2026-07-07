import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig } from "vite";

import { existsSync, readdirSync } from "node:fs";

const rootDir = ["..", "../..", "../../.."].find((dir) =>
  existsSync(`${dir}/.git`)
);

const hasPrivateFolders =
  rootDir !== undefined &&
  existsSync(`${rootDir}/packages`) &&
  readdirSync(`${rootDir}/packages`, { withFileTypes: true }).some((entry) => {
    return (
      entry.isDirectory() &&
      existsSync(`${rootDir}/packages/${entry.name}/private-src`)
    );
  });

const conditions = hasPrivateFolders
  ? ["webstudio-private", "webstudio"]
  : ["webstudio"];

export default defineConfig(({ mode }) => ({
  resolve: {
    conditions: [...conditions, "browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: [...conditions, "node", "development|production"],
    },
  },
  plugins: [
    // without this, remixCloudflareDevProxy trying to load workerd even for production (it's not needed for production)
    mode === "production" ? undefined : remixCloudflareDevProxy(),
    remix({
      future: {
        v3_lazyRouteDiscovery: false,
        v3_relativeSplatPath: false,
        v3_singleFetch: false,
        v3_fetcherPersist: false,
        v3_throwAbortReason: false,
      },
    }),
  ].filter(Boolean),
}));
