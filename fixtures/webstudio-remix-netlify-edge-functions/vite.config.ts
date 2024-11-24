import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { netlifyPlugin } from "@netlify/remix-edge-adapter/plugin";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_singleFetch: true,
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    netlifyPlugin(),
  ],
});
