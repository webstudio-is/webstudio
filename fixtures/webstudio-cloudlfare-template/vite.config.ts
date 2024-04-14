import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  plugins: [
    // without this, remixCloudflareDevProxy trying to load workerd even for production (it's not needed for production)
    mode === "production" ? undefined : remixCloudflareDevProxy(),
    remix(),
    tsconfigPaths(),
  ].filter(Boolean),
}));
