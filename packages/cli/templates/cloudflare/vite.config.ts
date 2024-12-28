import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
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
