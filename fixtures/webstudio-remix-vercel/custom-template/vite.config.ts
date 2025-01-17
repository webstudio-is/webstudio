import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
// @ts-ignore
import { dedupeMeta } from "./proxy-emulator/dedupe-meta";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_lazyRouteDiscovery: false,
        v3_relativeSplatPath: false,
        v3_singleFetch: false,
        v3_fetcherPersist: false,
        v3_throwAbortReason: false,
      },
    }),
    dedupeMeta,
  ],
});
